import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createInitialState } from "../src/game/state.js";
import { applyAction, canTradeWithOptions } from "../src/game/rules.js";
import { initializeOnlineGame } from "../src/game/online.js";
import { normalizeOnlinePhase } from "../src/game/lifecycle.js";
import {
  getPlayerIndexById,
  isPlayersTurn,
  sanitizeStateForPlayer,
} from "../src/game/multiplayer.js";
import { countCards, generateId } from "../src/shared/utils.js";

export const DEFAULT_PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT_DIR = path.resolve(__dirname, "..");

const CONTENT_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
};

export function resolveRequestedFormat(format) {
  if (format === "expanded" || format === "ancient" || format === "minted" || format === "core") {
    return format;
  }
  return "core";
}

function sendJson(socket, payload) {
  socket.send(JSON.stringify(payload));
}

export function createStaticRequestHandler({ rootDir, fsImpl = fs }) {
  return (req, res) => {
    const urlPath = req.url ? req.url.split("?")[0] : "/";
    const safePath = urlPath === "/" ? "/index.html" : urlPath;
    const filePath = path.join(rootDir, safePath);
    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fsImpl.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath);
      res.setHeader("Content-Type", CONTENT_TYPES[ext] ?? "application/octet-stream");
      res.end(data);
    });
  };
}

export function createGameServer(options = {}) {
  const port = options.port ?? DEFAULT_PORT;
  const rootDir = options.rootDir ?? DEFAULT_ROOT_DIR;
  const WebSocketServerImpl = options.WebSocketServerImpl ?? WebSocketServer;
  const httpImpl = options.httpImpl ?? http;
  const fsImpl = options.fsImpl ?? fs;
  const logger = options.logger ?? console;
  const createInitialStateImpl = options.createInitialStateImpl ?? createInitialState;
  const applyActionImpl = options.applyActionImpl ?? applyAction;
  const canTradeWithOptionsImpl = options.canTradeWithOptionsImpl ?? canTradeWithOptions;
  const initializeOnlineGameImpl = options.initializeOnlineGameImpl ?? initializeOnlineGame;
  const normalizeOnlinePhaseImpl = options.normalizeOnlinePhaseImpl ?? normalizeOnlinePhase;
  const getPlayerIndexByIdImpl = options.getPlayerIndexByIdImpl ?? getPlayerIndexById;
  const isPlayersTurnImpl = options.isPlayersTurnImpl ?? isPlayersTurn;
  const sanitizeStateForPlayerImpl = options.sanitizeStateForPlayerImpl ?? sanitizeStateForPlayer;
  const countCardsImpl = options.countCardsImpl ?? countCards;
  const generateIdImpl = options.generateIdImpl ?? generateId;

  const rooms = new Map();
  const requestHandler = createStaticRequestHandler({ rootDir, fsImpl });
  const server = httpImpl.createServer(requestHandler);
  const wss = new WebSocketServerImpl({ server });

  function createRoom(hostName, format = "core") {
    const roomId = generateIdImpl().slice(-6).toUpperCase();
    const hostId = generateIdImpl();
    const state = createInitialStateImpl({
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
      lastEvent: null,
    });
    return { roomId, hostId };
  }

  function joinRoom(roomId, playerName) {
    const room = rooms.get(roomId);
    if (!room) return null;
    if (room.players.size >= 2) return null;
    const playerId = generateIdImpl();
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
      sendJson(value.socket, {
        type: "state_update",
        roomId,
        state: sanitizeStateForPlayerImpl(room.state, playerId),
        playerId,
        lastEvent: room.lastEvent ?? null,
      });
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
      sendJson(value.socket, lobby);
    });
  }

  function broadcastGameOver(roomId, winnerIndex, winnerName) {
    const room = rooms.get(roomId);
    if (!room) return;
    room.players.forEach((value) => {
      if (!value.socket) return;
      sendJson(value.socket, {
        type: "game_over",
        roomId,
        winnerIndex,
        winnerName,
      });
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
    sendJson(ws, { type: "error", message });
  }

  function handleParsedMessage(ws, message, session) {
    if (message.type === "create_room") {
      const format = resolveRequestedFormat(message.format);
      const { roomId, hostId } = createRoom(message.playerName ?? "Host", format);
      session.currentRoomId = roomId;
      session.currentPlayerId = hostId;
      const room = rooms.get(roomId);
      room.players.get(hostId).socket = ws;
      sendJson(ws, {
        type: "room_created",
        roomId,
        playerId: hostId,
        state: sanitizeStateForPlayerImpl(room.state, hostId),
      });
      broadcastLobby(roomId);
      logger.log(`[room ${roomId}] created by ${hostId}`);
      return;
    }

    if (message.type === "join_room") {
      const result = joinRoom(message.roomId, message.playerName ?? "Guest");
      if (!result) {
        sendError(ws, "Unable to join room.");
        return;
      }
      session.currentRoomId = result.roomId;
      session.currentPlayerId = result.playerId;
      const room = rooms.get(result.roomId);
      room.players.get(result.playerId).socket = ws;
      sendJson(ws, {
        type: "room_joined",
        roomId: result.roomId,
        playerId: result.playerId,
        state: sanitizeStateForPlayerImpl(room.state, result.playerId),
      });
      broadcastLobby(result.roomId);
      broadcastState(result.roomId);
      logger.log(`[room ${result.roomId}] joined by ${result.playerId}`);
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
      logger.log(`[room ${message.roomId}] ${message.playerId} ready`);
      if (canStart(room)) {
        if (!room.started) {
          initializeOnlineGameImpl(room.state);
          room.started = true;
        }
        room.players.forEach((value, playerId) => {
          if (!value.socket) return;
          sendJson(value.socket, {
            type: "game_start",
            roomId: message.roomId,
            playerId,
            state: sanitizeStateForPlayerImpl(room.state, playerId),
          });
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
      if (!isPlayersTurnImpl(room.state, playerId) && message.action?.type !== "CANCEL_ARCHIVE") {
        sendError(ws, "Not your turn.");
        return;
      }
      let lastEvent = null;
      if (message.action?.type === "TRADE") {
        const playerIndex = getPlayerIndexByIdImpl(room.state, playerId);
        if (playerIndex === -1) {
          sendError(ws, "Invalid player.");
          return;
        }
        const player = room.state.players[playerIndex];
        const recipeId = message.action.payload?.recipeId;
        if (
          !canTradeWithOptionsImpl(
            room.state,
            player,
            recipeId,
            message.action.payload ?? {}
          )
        ) {
          sendError(ws, "Invalid trade.");
          return;
        }
      }
      if (message.action?.type === "CONFIRM_ARCHIVE") {
        const playerIndex = getPlayerIndexByIdImpl(room.state, playerId);
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
            counts: countCardsImpl(pending.playedCards),
            drawCount: pending.drawCount,
          };
        }
      }
      const result = applyActionImpl(room.state, message.action);
      normalizeOnlinePhaseImpl(room.state);
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
          handArchive:
            result.event.detail?.handArchive ?? message.action.payload?.handArchive ?? null,
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
      logger.log(
        `[room ${message.roomId}] action ${message.action?.type} by ${playerId} | phase ${room.state.phase} | winner ${room.state.winner ?? "none"}`
      );
      return;
    }
  }

  function handleMessageData(ws, data, session) {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      sendError(ws, "Invalid JSON payload.");
      return;
    }
    handleParsedMessage(ws, message, session);
  }

  function handleConnection(ws) {
    const session = {
      currentRoomId: null,
      currentPlayerId: null,
    };

    ws.on("message", (data) => {
      handleMessageData(ws, data, session);
    });

    ws.on("close", () => {
      if (!session.currentRoomId || !session.currentPlayerId) return;
      const room = rooms.get(session.currentRoomId);
      if (!room) return;
      room.players.delete(session.currentPlayerId);
      if (room.players.size > 0) {
        broadcastLobby(session.currentRoomId);
      }
      if (room.players.size === 0) {
        rooms.delete(session.currentRoomId);
      }
    });
  }

  wss.on("connection", handleConnection);

  function start(listenPort = port) {
    return new Promise((resolve, reject) => {
      const onError = (error) => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        const address = server.address();
        const boundPort = typeof address === "object" && address ? address.port : listenPort;
        resolve(boundPort);
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(listenPort);
    });
  }

  function stop() {
    return new Promise((resolve) => {
      wss.close(() => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close(() => resolve());
      });
    });
  }

  return {
    server,
    wss,
    rooms,
    start,
    stop,
    createRoom,
    joinRoom,
    canStart,
    handleParsedMessage,
    handleMessageData,
    requestHandler,
  };
}

function isMainModule() {
  if (!process.argv[1]) return false;
  const currentPath = fileURLToPath(import.meta.url);
  const entryPath = path.resolve(process.argv[1]);
  return currentPath === entryPath;
}

if (isMainModule()) {
  const app = createGameServer({ port: DEFAULT_PORT });
  app
    .start()
    .then((boundPort) => {
      console.log(`Server running on http://localhost:${boundPort}`);
    })
    .catch((error) => {
      console.error("Failed to start server.", error);
      process.exitCode = 1;
    });
}
