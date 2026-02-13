import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createInitialState } from "../src/game/state.js";
import {
  applyAction,
  canTradeWithOptions,
} from "../src/game/rules.js";
import { initializeOnlineGame } from "../src/game/online.js";
import { normalizeOnlinePhase } from "../src/game/lifecycle.js";
import {
  getPlayerIndexById,
  isPlayersTurn,
  sanitizeStateForPlayer,
} from "../src/game/multiplayer.js";
import { countCards, generateId } from "../src/shared/utils.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const server = http.createServer((req, res) => {
  const urlPath = req.url ? req.url.split("?")[0] : "/";
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.join(rootDir, safePath);
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const contentTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".json": "application/json",
    };
    res.setHeader("Content-Type", contentTypes[ext] ?? "application/octet-stream");
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

const rooms = new Map();

function createRoom(hostName, format = "core") {
  const roomId = generateId().slice(-6).toUpperCase();
  const hostId = generateId();
  const state = createInitialState({
    mode: "online",
    gameId: roomId,
    format,
    playerIds: [hostId, `pending-${roomId}`],
    playerNames: [hostName, "Guest"],
  });
  rooms.set(roomId, {
    state,
    players: new Map([[hostId, { name: hostName, socket: null, ready: false }]]),
    started: false,
  });
  return { roomId, hostId };
}

function joinRoom(roomId, playerName) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.players.size >= 2) return null;
  const playerId = generateId();
  room.players.set(playerId, { name: playerName, socket: null, ready: false });
  const openIndex = room.state.players.findIndex((p) => p.id.startsWith("pending-"));
  if (openIndex !== -1) {
    room.state.players[openIndex].id = playerId;
    room.state.players[openIndex].name = playerName;
  }
  return { roomId, playerId };
}

function broadcastState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players.forEach((value, playerId) => {
    if (!value.socket) return;
    const payload = {
      type: "state_update",
      roomId,
      state: sanitizeStateForPlayer(room.state, playerId),
      playerId,
      lastEvent: room.lastEvent ?? null,
    };
    value.socket.send(JSON.stringify(payload));
  });
  room.lastEvent = null;
}

function broadcastLobby(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const lobby = {
    type: "lobby_update",
    roomId,
    players: Array.from(room.players.entries()).map(([id, info]) => ({
      id,
      name: info.name,
      ready: info.ready,
    })),
  };
  room.players.forEach((value) => {
    if (!value.socket) return;
    value.socket.send(JSON.stringify(lobby));
  });
}

function broadcastGameOver(roomId, winnerIndex, winnerName) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players.forEach((value) => {
    if (!value.socket) return;
    value.socket.send(
      JSON.stringify({
        type: "game_over",
        roomId,
        winnerIndex,
        winnerName,
      })
    );
  });
}

function shutdownRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players.forEach((value) => {
    if (!value.socket) return;
    value.socket.close();
  });
  rooms.delete(roomId);
}

function canStart(room) {
  if (room.players.size < 2) return false;
  for (const info of room.players.values()) {
    if (!info.ready) return false;
  }
  return true;
}

function sendError(ws, message) {
  ws.send(JSON.stringify({ type: "error", message }));
}

wss.on("connection", (ws) => {
  let currentRoomId = null;
  let currentPlayerId = null;

  ws.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      sendError(ws, "Invalid JSON payload.");
      return;
    }

    if (message.type === "create_room") {
      const format =
        message.format === "expanded" ||
        message.format === "ancient" ||
        message.format === "minted" ||
        message.format === "core"
          ? message.format
          : "core";
      const { roomId, hostId } = createRoom(message.playerName ?? "Host", format);
      currentRoomId = roomId;
      currentPlayerId = hostId;
      const room = rooms.get(roomId);
      room.players.get(hostId).socket = ws;
      ws.send(
        JSON.stringify({
          type: "room_created",
          roomId,
          playerId: hostId,
          state: sanitizeStateForPlayer(room.state, hostId),
        })
      );
      broadcastLobby(roomId);
      console.log(`[room ${roomId}] created by ${hostId}`);
      return;
    }

    if (message.type === "join_room") {
      const result = joinRoom(message.roomId, message.playerName ?? "Guest");
      if (!result) {
        sendError(ws, "Unable to join room.");
        return;
      }
      currentRoomId = result.roomId;
      currentPlayerId = result.playerId;
      const room = rooms.get(result.roomId);
      room.players.get(result.playerId).socket = ws;
      ws.send(
        JSON.stringify({
          type: "room_joined",
          roomId: result.roomId,
          playerId: result.playerId,
          state: sanitizeStateForPlayer(room.state, result.playerId),
        })
      );
      broadcastLobby(result.roomId);
      broadcastState(result.roomId);
      console.log(`[room ${result.roomId}] joined by ${result.playerId}`);
      return;
    }

    if (message.type === "ready_up") {
      const room = rooms.get(message.roomId);
      if (!room) {
        sendError(ws, "Room not found.");
        return;
      }
      const info = room.players.get(message.playerId);
      if (!info) {
        sendError(ws, "Invalid player.");
        return;
      }
      info.ready = true;
      broadcastLobby(message.roomId);
      console.log(`[room ${message.roomId}] ${message.playerId} ready`);
      if (canStart(room)) {
        if (!room.started) {
          initializeOnlineGame(room.state);
          room.started = true;
        }
        room.players.forEach((value, playerId) => {
          if (!value.socket) return;
          value.socket.send(
            JSON.stringify({
              type: "game_start",
              roomId: message.roomId,
              playerId,
              state: sanitizeStateForPlayer(room.state, playerId),
            })
          );
        });
      }
      return;
    }

    if (message.type === "action") {
      const room = rooms.get(message.roomId);
      if (!room) {
        sendError(ws, "Room not found.");
        return;
      }
      const playerId = message.playerId;
      if (!room.players.has(playerId)) {
        sendError(ws, "Invalid player.");
        return;
      }
      if (!isPlayersTurn(room.state, playerId) && message.action?.type !== "CANCEL_ARCHIVE") {
        sendError(ws, "Not your turn.");
        return;
      }
      let lastEvent = null;
      if (message.action?.type === "TRADE") {
        const playerIndex = getPlayerIndexById(room.state, playerId);
        if (playerIndex === -1) {
          sendError(ws, "Invalid player.");
          return;
        }
        const player = room.state.players[playerIndex];
        const recipeId = message.action.payload?.recipeId;
        if (!canTradeWithOptions(room.state, player, recipeId, message.action.payload ?? {})) {
          sendError(ws, "Invalid trade.");
          return;
        }
      }
      if (message.action?.type === "CONFIRM_ARCHIVE") {
        const playerIndex = getPlayerIndexById(room.state, playerId);
        if (playerIndex === -1) {
          sendError(ws, "Invalid player.");
          return;
        }
        const pending = room.state.pendingArchive;
        if (!pending || pending.playerIndex !== playerIndex) {
          sendError(ws, "Invalid archive confirmation.");
          return;
        }
        if (pending?.playedCards) {
          lastEvent = {
            type: "archive",
            playerId,
            counts: countCards(pending.playedCards),
            drawCount: pending.drawCount,
          };
        }
      }
      const result = applyAction(room.state, message.action);
      normalizeOnlinePhase(room.state);
      if (message.action?.type === "TRADE" && result?.event?.success) {
        const recipeId = message.action.payload?.recipeId;
        const recipe = room.state.ruleset.tradeRecipes?.[recipeId];
        lastEvent = {
          type: "trade",
          playerId,
          recipeId,
          useWood: message.action.payload?.useWood ?? false,
          substituteType: message.action.payload?.substituteType ?? null,
          choiceType: message.action.payload?.choiceType ?? null,
          poolTypes: message.action.payload?.poolTypes ?? null,
          rewardType:
            result.event.detail?.rewardType ?? message.action.payload?.rewardType ?? null,
          rewardCards: result.event.detail?.rewardCards ?? null,
          rewardCount: result.event.detail?.rewardCount,
          drawCount: result.event.detail?.drawCount,
          digDiscardedCount: result.event.detail?.digDiscardedCount,
          handArchive: result.event.detail?.handArchive ?? message.action.payload?.handArchive ?? null,
        };
        if (recipe) {
          const costEntry = Object.entries(recipe.cost ?? {})[0];
          if (costEntry) {
            lastEvent.from = costEntry[0];
            lastEvent.cost = costEntry[1];
          }
          if (
            typeof recipe.reward === "string" &&
            recipe.reward !== "any" &&
            recipe.reward !== "dig_non_bronze_silver"
          ) {
            lastEvent.to = recipe.reward;
          }
        }
      }
      room.lastEvent = lastEvent;
      broadcastState(message.roomId);
      if (room.state.winner !== null && room.state.winner !== undefined) {
        const winner = room.state.players[room.state.winner];
        broadcastGameOver(message.roomId, room.state.winner, winner?.name ?? "Player");
        shutdownRoom(message.roomId);
        return;
      }
      console.log(
        `[room ${message.roomId}] action ${message.action?.type} by ${playerId} | phase ${room.state.phase} | winner ${room.state.winner ?? "none"}`
      );
      return;
    }
  });

  ws.on("close", () => {
    if (!currentRoomId || !currentPlayerId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    room.players.delete(currentPlayerId);
    if (room.players.size > 0) {
      broadcastLobby(currentRoomId);
    }
    if (room.players.size === 0) {
      rooms.delete(currentRoomId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
