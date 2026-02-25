/* @vitest-environment node */

import { describe, expect, it, vi } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import {
  createGameServer,
  createStaticRequestHandler,
  resolveRequestedFormat,
} from "../server/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..");

class FakeHttpServer {
  constructor(handler) {
    this.handler = handler;
    this.listening = false;
    this.port = null;
    this.onceHandlers = new Map();
  }

  once(event, callback) {
    this.onceHandlers.set(event, callback);
  }

  off(event, callback) {
    if (this.onceHandlers.get(event) === callback) {
      this.onceHandlers.delete(event);
    }
  }

  listen(port) {
    this.listening = true;
    this.port = port === 0 ? 43210 : port;
    const callback = this.onceHandlers.get("listening");
    if (callback) callback();
  }

  address() {
    return { port: this.port };
  }

  close(callback) {
    this.listening = false;
    if (callback) callback();
  }
}

class FakeHttpServerFail extends FakeHttpServer {
  listen() {
    const callback = this.onceHandlers.get("error");
    if (callback) callback(new Error("listen failed"));
  }
}

class FakeWebSocketServer {
  constructor() {
    this.handlers = new Map();
  }

  on(event, callback) {
    this.handlers.set(event, callback);
  }

  close(callback) {
    if (callback) callback();
  }

  emitConnection(socket) {
    const callback = this.handlers.get("connection");
    if (callback) callback(socket);
  }
}

class FakeSocket {
  constructor() {
    this.handlers = new Map();
    this.outbox = [];
    this.closed = false;
  }

  on(event, callback) {
    const existing = this.handlers.get(event) ?? [];
    existing.push(callback);
    this.handlers.set(event, existing);
  }

  send(payload) {
    this.outbox.push(JSON.parse(payload));
  }

  close() {
    this.closed = true;
    this.emit("close");
  }

  emit(event, payload) {
    const callbacks = this.handlers.get(event) ?? [];
    callbacks.forEach((callback) => callback(payload));
  }
}

function emitMessage(socket, payload) {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  socket.emit("message", Buffer.from(data));
}

function takeMessage(socket, predicate) {
  const index = socket.outbox.findIndex(predicate);
  if (index === -1) return null;
  return socket.outbox.splice(index, 1)[0];
}

function fakeResponse() {
  return {
    status: null,
    headers: {},
    body: null,
    writeHead(status) {
      this.status = status;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    },
  };
}

describe("server/index", () => {
  it("resolves requested format safely", () => {
    expect(resolveRequestedFormat("core")).toBe("core");
    expect(resolveRequestedFormat("expanded")).toBe("expanded");
    expect(resolveRequestedFormat("ancient")).toBe("ancient");
    expect(resolveRequestedFormat("mystic")).toBe("mystic");
    expect(resolveRequestedFormat("minted")).toBe("core");
    expect(resolveRequestedFormat("unknown")).toBe("core");
  });

  it("serves static files and handles forbidden/not-found", () => {
    const fsImpl = {
      readFile: vi.fn((_, callback) => callback(new Error("missing"))),
    };
    const handler = createStaticRequestHandler({ rootDir: workspaceRoot, fsImpl });

    const forbiddenRes = fakeResponse();
    handler({ url: "/../../etc/passwd" }, forbiddenRes);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body).toBe("Forbidden");

    const missingRes = fakeResponse();
    handler({ url: "/assets/missing.svg" }, missingRes);
    expect(missingRes.status).toBe(404);
    expect(missingRes.body).toBe("Not found");

    fsImpl.readFile.mockImplementationOnce((_, callback) =>
      callback(null, Buffer.from("<svg></svg>"))
    );
    const okRes = fakeResponse();
    handler({ url: "/assets/cards/bronze-star.svg" }, okRes);
    expect(okRes.headers["Content-Type"]).toBe("image/svg+xml");
    expect(okRes.body.toString()).toContain("<svg>");
  });

  it("supports start/stop and start failure with injected servers", async () => {
    const httpImpl = {
      createServer: vi.fn((handler) => new FakeHttpServer(handler)),
    };
    const app = createGameServer({
      httpImpl,
      WebSocketServerImpl: FakeWebSocketServer,
      logger: { log: vi.fn() },
    });

    const port = await app.start(0);
    expect(port).toBe(43210);
    await app.stop();
    await app.stop();

    const failingHttpImpl = {
      createServer: vi.fn((handler) => new FakeHttpServerFail(handler)),
    };
    const failingApp = createGameServer({
      httpImpl: failingHttpImpl,
      WebSocketServerImpl: FakeWebSocketServer,
      logger: { log: vi.fn() },
    });
    await expect(failingApp.start(0)).rejects.toThrow("listen failed");
  });

  it("processes create/join/ready/actions and emits errors/events", () => {
    const logger = { log: vi.fn() };
    const app = createGameServer({
      httpImpl: { createServer: (handler) => new FakeHttpServer(handler) },
      WebSocketServerImpl: FakeWebSocketServer,
      logger,
      rootDir: workspaceRoot,
    });

    const host = new FakeSocket();
    const guest = new FakeSocket();
    app.wss.emitConnection(host);
    app.wss.emitConnection(guest);

    emitMessage(host, "{invalid");
    const invalidJson = takeMessage(host, (msg) => msg.type === "error");
    expect(invalidJson.message).toBe("Invalid JSON payload.");

    emitMessage(guest, { type: "join_room", roomId: "MISSING", playerName: "Guest" });
    const joinError = takeMessage(guest, (msg) => msg.type === "error");
    expect(joinError.message).toBe("Unable to join room.");

    emitMessage(host, { type: "create_room", playerName: "Host", format: "invalid" });
    const roomCreated = takeMessage(host, (msg) => msg.type === "room_created");
    expect(roomCreated.state.format).toBe("core");
    const roomId = roomCreated.roomId;
    const hostId = roomCreated.playerId;
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining(`[room ${roomId}] created`));

    emitMessage(guest, { type: "join_room", roomId, playerName: "Guest" });
    const roomJoined = takeMessage(guest, (msg) => msg.type === "room_joined");
    const guestId = roomJoined.playerId;
    expect(roomJoined.roomId).toBe(roomId);

    emitMessage(host, { type: "ready_up", roomId: "MISSING", playerId: hostId });
    const missingRoomReady = takeMessage(host, (msg) => msg.type === "error");
    expect(missingRoomReady.message).toBe("Room not found.");

    emitMessage(host, { type: "ready_up", roomId, playerId: "bad-player" });
    const invalidPlayerReady = takeMessage(host, (msg) => msg.type === "error");
    expect(invalidPlayerReady.message).toBe("Invalid player.");

    emitMessage(host, { type: "ready_up", roomId, playerId: hostId });
    emitMessage(guest, { type: "ready_up", roomId, playerId: guestId });
    const hostGameStart = takeMessage(host, (msg) => msg.type === "game_start");
    const guestGameStart = takeMessage(guest, (msg) => msg.type === "game_start");
    expect(hostGameStart).toBeTruthy();
    expect(guestGameStart).toBeTruthy();

    emitMessage(guest, {
      type: "action",
      roomId,
      playerId: guestId,
      action: { type: "PLAY_CARD", payload: { index: 0 } },
    });
    const notTurn = takeMessage(guest, (msg) => msg.type === "error");
    expect(notTurn.message).toBe("Not your turn.");

    emitMessage(host, {
      type: "action",
      roomId,
      playerId: hostId,
      action: { type: "TRADE", payload: { recipeId: "trade_bronze" } },
    });
    const invalidTrade = takeMessage(host, (msg) => msg.type === "error");
    expect(invalidTrade.message).toBe("Invalid trade.");

    emitMessage(host, {
      type: "action",
      roomId,
      playerId: hostId,
      action: { type: "CONFIRM_ARCHIVE", payload: {} },
    });
    const invalidArchive = takeMessage(host, (msg) => msg.type === "error");
    expect(invalidArchive.message).toBe("Invalid archive confirmation.");

    emitMessage(host, {
      type: "action",
      roomId: "MISSING",
      playerId: hostId,
      action: { type: "PLAY_CARD", payload: { index: 0 } },
    });
    const missingRoomAction = takeMessage(host, (msg) => msg.type === "error");
    expect(missingRoomAction.message).toBe("Room not found.");

    emitMessage(host, {
      type: "action",
      roomId,
      playerId: "bad-player",
      action: { type: "PLAY_CARD", payload: { index: 0 } },
    });
    const badPlayerAction = takeMessage(host, (msg) => msg.type === "error");
    expect(badPlayerAction.message).toBe("Invalid player.");

    emitMessage(guest, {
      type: "action",
      roomId,
      playerId: guestId,
      action: { type: "CANCEL_ARCHIVE", payload: {} },
    });
    const cancelUpdate = takeMessage(guest, (msg) => msg.type === "state_update");
    expect(cancelUpdate.type).toBe("state_update");

    const room = app.rooms.get(roomId);
    room.state.winner = 0;
    emitMessage(host, {
      type: "action",
      roomId,
      playerId: hostId,
      action: { type: "CANCEL_ARCHIVE", payload: {} },
    });
    const gameOver = takeMessage(host, (msg) => msg.type === "game_over");
    expect(gameOver.winnerIndex).toBe(0);
    expect(app.rooms.has(roomId)).toBe(false);
  });

  it("cleans up room membership on disconnect", () => {
    const app = createGameServer({
      httpImpl: { createServer: (handler) => new FakeHttpServer(handler) },
      WebSocketServerImpl: FakeWebSocketServer,
      logger: { log: vi.fn() },
      rootDir: workspaceRoot,
    });

    const host = new FakeSocket();
    const guest = new FakeSocket();
    app.wss.emitConnection(host);
    app.wss.emitConnection(guest);

    emitMessage(host, { type: "create_room", playerName: "Host", format: "core" });
    const roomCreated = takeMessage(host, (msg) => msg.type === "room_created");
    const roomId = roomCreated.roomId;
    emitMessage(guest, { type: "join_room", roomId, playerName: "Guest" });
    host.outbox = [];

    guest.close();
    const hostLobby = takeMessage(host, (msg) => msg.type === "lobby_update");
    expect(hostLobby.players.length).toBe(1);
    expect(app.rooms.has(roomId)).toBe(true);

    host.close();
    expect(app.rooms.has(roomId)).toBe(false);
  });

  it("rejects invalid mystic targetType and includes effect details for valid trade", () => {
    const app = createGameServer({
      httpImpl: { createServer: (handler) => new FakeHttpServer(handler) },
      WebSocketServerImpl: FakeWebSocketServer,
      logger: { log: vi.fn() },
      rootDir: workspaceRoot,
    });

    const host = new FakeSocket();
    const guest = new FakeSocket();
    app.wss.emitConnection(host);
    app.wss.emitConnection(guest);

    emitMessage(host, { type: "create_room", playerName: "Host", format: "mystic" });
    const roomCreated = takeMessage(host, (msg) => msg.type === "room_created");
    const roomId = roomCreated.roomId;
    const hostId = roomCreated.playerId;
    emitMessage(guest, { type: "join_room", roomId, playerName: "Guest" });
    const roomJoined = takeMessage(guest, (msg) => msg.type === "room_joined");
    const guestId = roomJoined.playerId;

    emitMessage(host, { type: "ready_up", roomId, playerId: hostId });
    emitMessage(guest, { type: "ready_up", roomId, playerId: guestId });
    takeMessage(host, (msg) => msg.type === "game_start");
    takeMessage(guest, (msg) => msg.type === "game_start");
    host.outbox = [];
    guest.outbox = [];

    const room = app.rooms.get(roomId);
    room.state.players[0].archive = ["amethyst"];
    room.state.players[1].archive = ["gold"];
    room.state.players[1].deck = [];

    emitMessage(host, {
      type: "action",
      roomId,
      playerId: hostId,
      action: {
        type: "TRADE",
        payload: { recipeId: "trade_amethyst", targetType: "bronze" },
      },
    });
    const invalidTarget = takeMessage(host, (msg) => msg.type === "error");
    expect(invalidTarget.message).toBe("Invalid trade.");

    emitMessage(host, {
      type: "action",
      roomId,
      playerId: hostId,
      action: {
        type: "TRADE",
        payload: { recipeId: "trade_amethyst", targetType: "gold" },
      },
    });

    const hostUpdate = takeMessage(host, (msg) => msg.type === "state_update");
    expect(hostUpdate.lastEvent.type).toBe("trade");
    expect(hostUpdate.lastEvent.recipeId).toBe("trade_amethyst");
    expect(hostUpdate.lastEvent.targetType).toBe("gold");
    expect(hostUpdate.lastEvent.effectId).toBe("amethyst_archive_to_deck");
    expect(hostUpdate.lastEvent.movedTypes).toEqual(["gold"]);
    expect(hostUpdate.lastEvent.movedCount).toBe(1);
  });
});
