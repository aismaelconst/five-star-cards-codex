import { WebSocketServer } from "ws";
import { createInitialState } from "../src/game/state.js";
import { applyAction } from "../src/game/rules.js";
import {
  getPlayerIndexById,
  isPlayersTurn,
  sanitizeStateForPlayer,
} from "../src/game/multiplayer.js";
import { generateId } from "../src/shared/utils.js";

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
  });
  rooms.set(roomId, {
    state,
    players: new Map([[hostId, { name: hostName, socket: null }]]),
  });
  return { roomId, hostId };
}

function joinRoom(roomId, playerName) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.players.size >= 2) return null;
  const playerId = generateId();
  room.players.set(playerId, { name: playerName, socket: null });
  const openIndex = room.state.players.findIndex((p) => p.id.startsWith("pending-"));
  if (openIndex !== -1) {
    room.state.players[openIndex].id = playerId;
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
    };
    value.socket.send(JSON.stringify(payload));
  });
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
      broadcastState(result.roomId);
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
      applyAction(room.state, message.action);
      broadcastState(message.roomId);
      return;
    }
  });

  ws.on("close", () => {
    if (!currentRoomId || !currentPlayerId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    room.players.delete(currentPlayerId);
    if (room.players.size === 0) {
      rooms.delete(currentRoomId);
    }
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
