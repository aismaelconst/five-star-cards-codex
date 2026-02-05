import { WebSocketServer } from "ws";
import { createInitialState } from "../src/game/state.js";
import { applyAction } from "../src/game/rules.js";
import { initializeOnlineGame } from "../src/game/online.js";
import { normalizeOnlinePhase } from "../src/game/lifecycle.js";
import {
  getPlayerIndexById,
  isPlayersTurn,
  sanitizeStateForPlayer,
} from "../src/game/multiplayer.js";
import { countCards, generateId } from "../src/shared/utils.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const wss = new WebSocketServer({ port: PORT });

const rooms = new Map();

function createRoom(hostName) {
  const roomId = generateId().slice(-6).toUpperCase();
  const hostId = generateId();
  const state = createInitialState({
    mode: "online",
    gameId: roomId,
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
      const { roomId, hostId } = createRoom(message.playerName ?? "Host");
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
        const tradeType = message.action.payload?.type;
        const tradeUp = room.state.ruleset.cardTypes[tradeType]?.tradeUp;
        if (tradeUp) {
          lastEvent = {
            type: "trade",
            playerId,
            from: tradeType,
            to: tradeUp.to,
            cost: tradeUp.cost,
          };
        }
      }
      if (message.action?.type === "CONFIRM_ARCHIVE") {
        const pending = room.state.pendingArchive;
        if (pending?.playedCards) {
          lastEvent = {
            type: "archive",
            playerId,
            counts: countCards(pending.playedCards),
            drawCount: pending.drawCount,
          };
        }
      }
      applyAction(room.state, message.action);
      normalizeOnlinePhase(room.state);
      room.lastEvent = lastEvent;
      broadcastState(message.roomId);
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

console.log(`WebSocket server running on ws://localhost:${PORT}`);
