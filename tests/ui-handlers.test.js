import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHandlers } from "../src/ui/handlers.js";
import { createInitialState } from "../src/game/state.js";

vi.mock("../src/ui/render.js", () => ({
  renderApp: vi.fn(),
  showConfirmOverlay: vi.fn(),
  showTurnOverlay: vi.fn(),
}));

function makeElements() {
  return {
    confirmOverlay: document.createElement("div"),
    turnOverlay: document.createElement("div"),
    winnerPanel: document.createElement("div"),
    winnerOverlay: document.createElement("div"),
    confirmSummary: document.createElement("div"),
    confirmCards: document.createElement("div"),
    modeOverlay: document.createElement("div"),
    onlineChoiceOverlay: document.createElement("div"),
    hostOverlay: document.createElement("div"),
    guestOverlay: document.createElement("div"),
    playerNameInput: Object.assign(document.createElement("input"), { value: "" }),
    roomCodeInput: Object.assign(document.createElement("input"), { value: "" }),
    guestNameInput: Object.assign(document.createElement("input"), { value: "" }),
    guestRoomCodeInput: Object.assign(document.createElement("input"), { value: "" }),
    readyButton: document.createElement("button"),
    readyButtonGuest: document.createElement("button"),
    chooseCreate: document.createElement("button"),
    chooseJoin: document.createElement("button"),
    backToChoiceHost: document.createElement("button"),
    backToChoiceGuest: document.createElement("button"),
    hostStatus: document.createElement("div"),
    guestStatus: document.createElement("div"),
    copyRoomCode: document.createElement("button"),
    opponentAlert: document.createElement("div"),
  };
}

describe("ui/handlers", () => {
  let state;
  let elements;
  let onWinner;

  beforeEach(() => {
    state = createInitialState();
    elements = makeElements();
    onWinner = vi.fn();
  });

  it("plays a card from hand to active", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.hand = ["bronze"];

    handlers.playCard(0);

    expect(player.active).toEqual(["bronze"]);
    expect(player.hand.length).toBe(0);
  });

  it("plays a card by type from hand to active", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.hand = ["bronze", "silver"];

    handlers.playCardByType("silver");

    expect(player.active).toContain("silver");
    expect(player.hand.length).toBe(1);
  });

  it("returns a card from active to hand", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["bronze"];

    handlers.returnCard(0);

    expect(player.hand).toContain("bronze");
    expect(player.active.length).toBe(0);
  });

  it("returns all cards from active to hand", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["bronze", "silver"];

    handlers.returnAllCards();

    expect(player.hand.length).toBe(2);
    expect(player.active.length).toBe(0);
  });

  it("handles trades and updates state", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.archive = Array.from({ length: 5 }, () => "bronze");
    player.deck = ["silver"];

    handlers.trade("bronze");

    expect(state.tradesThisTurn).toBe(1);
    expect(player.hand).toContain("silver");
    expect(player.discard.length).toBe(5);
  });

  it("prepares archive on endTurn", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["bronze", "silver"];

    handlers.endTurn();

    expect(state.phase).toBe("confirm");
    expect(state.pendingArchive).not.toBeNull();
  });

  it("finalizes archive and advances turn", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["bronze", "bronze"];

    handlers.endTurn();
    handlers.confirmArchive();

    expect(state.currentPlayer).toBe(1);
    expect(state.phase).toBe("between");
  });

  it("calls onWinner when a player wins", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["gold", "gold", "gold", "gold", "gold"];

    handlers.endTurn();
    handlers.confirmArchive();

    expect(onWinner).toHaveBeenCalledWith(0);
  });

  it("resets the game", () => {
    const handlers = createHandlers(state, elements, onWinner);
    state.currentPlayer = 1;

    handlers.resetGame();

    expect(state.currentPlayer).toBe(0);
    expect(state.turnCount).toBe(1);
  });

  it("selects offline mode and starts a game", () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.modeOverlay.hidden = false;

    handlers.selectOfflineMode();

    expect(state.mode).toBe("offline");
    expect(elements.modeOverlay.hidden).toBe(true);
    expect(state.turnCount).toBe(1);
  });

  it("selects online mode and shows the online choice overlay", () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.modeOverlay.hidden = true;

    handlers.selectOnlineMode();

    expect(state.mode).toBe("online");
    expect(elements.modeOverlay.hidden).toBe(true);
    expect(elements.onlineChoiceOverlay.hidden).toBe(false);
    expect(elements.readyButton.disabled).toBe(true);
    expect(elements.readyButtonGuest.disabled).toBe(true);
  });

  it("toggles host/guest overlays", () => {
    const handlers = createHandlers(state, elements, onWinner);
    handlers.chooseCreate();
    expect(elements.hostOverlay.hidden).toBe(false);
    expect(elements.guestOverlay.hidden).toBe(true);

    handlers.chooseJoin();
    expect(elements.guestOverlay.hidden).toBe(false);
    expect(elements.hostOverlay.hidden).toBe(true);
  });

  it("returns to choice overlay", () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.onlineChoiceOverlay.hidden = true;
    elements.hostOverlay.hidden = false;

    handlers.backToChoice();

    expect(elements.onlineChoiceOverlay.hidden).toBe(false);
    expect(elements.hostOverlay.hidden).toBe(true);
  });

  it("creates a room in online mode", () => {
    const sendSpy = vi.fn();
    let capturedOnMessage;
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: ({ onMessage }) => {
        capturedOnMessage = onMessage;
        return {
          connect: vi.fn(),
          send: sendSpy,
        };
      },
    });
    elements.playerNameInput.value = "Hoster";

    handlers.createRoom();

    expect(state.mode).toBe("online");
    expect(state.online.role).toBe("host");
    expect(state.online.status).toBe("waiting");
    expect(elements.roomCodeInput.value).toBe("");
    expect(elements.hostStatus.textContent).toContain("Creating room");
    expect(sendSpy).toHaveBeenCalledWith({ type: "create_room", playerName: "Hoster" });
    capturedOnMessage({
      type: "room_created",
      roomId: "ROOM42",
      playerId: "P1",
      state: createInitialState({ mode: "online" }),
    });
    expect(elements.roomCodeInput.value).toBe("ROOM42");
  });

  it("joins a room in online mode", () => {
    const sendSpy = vi.fn();
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: () => ({
        connect: vi.fn(),
        send: sendSpy,
      }),
    });
    elements.guestNameInput.value = "Guesty";
    elements.guestRoomCodeInput.value = "abc123";

    handlers.joinRoom();

    expect(state.mode).toBe("online");
    expect(state.online.role).toBe("guest");
    expect(state.online.status).toBe("joined");
    expect(state.online.roomId).toBe("ABC123");
    expect(elements.guestStatus.textContent).toContain("Joined room");
    expect(sendSpy).toHaveBeenCalledWith({
      type: "join_room",
      roomId: "ABC123",
      playerName: "Guesty",
    });
  });

  it("readies up only after joining", () => {
    const sendSpy = vi.fn();
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: () => ({
        connect: vi.fn(),
        send: sendSpy,
      }),
    });

    handlers.readyUp();
    expect(elements.hostStatus.textContent).toContain("Join a room");

    state.online.roomId = "ROOM01";
    state.online.playerId = "P1";
    handlers.readyUp();

    expect(sendSpy).toHaveBeenCalledWith({
      type: "ready_up",
      roomId: "ROOM01",
      playerId: "P1",
    });
  });

  it("copies room code when available", async () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.roomCodeInput.value = "ROOMX1";
    const originalNavigator = global.navigator;
    global.navigator = { clipboard: { writeText: vi.fn() } };

    await handlers.copyRoomCode();

    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith("ROOMX1");
    global.navigator = originalNavigator;
  });

  it("shows opponent trade and archive alerts", () => {
    const sendSpy = vi.fn();
    let capturedOnMessage;
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: ({ onMessage }) => {
        capturedOnMessage = onMessage;
        return { connect: vi.fn(), send: sendSpy };
      },
    });

    state.mode = "online";
    elements.playerNameInput.value = "Host";
    handlers.createRoom();
    state.online.playerId = "p2";

    capturedOnMessage({
      type: "state_update",
      roomId: "ROOM",
      playerId: "p2",
      lastEvent: {
        type: "trade",
        playerId: "p1",
        from: "bronze",
        to: "silver",
        cost: 5,
      },
      state: createInitialState({ mode: "online" }),
    });
    expect(elements.opponentAlert.textContent).toContain("Opponent traded");

    capturedOnMessage({
      type: "state_update",
      roomId: "ROOM",
      playerId: "p2",
      lastEvent: {
        type: "archive",
        playerId: "p1",
        counts: { bronze: 2, silver: 1, gold: 0 },
        drawCount: 4,
      },
      state: createInitialState({ mode: "online" }),
    });
    expect(elements.opponentAlert.textContent).toContain("Opponent archived");
  });

  it("shows confirm overlay only for the active online player", () => {
    const sendSpy = vi.fn();
    let capturedOnMessage;
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: ({ onMessage }) => {
        capturedOnMessage = onMessage;
        return { connect: vi.fn(), send: sendSpy };
      },
    });

    state.mode = "online";
    elements.playerNameInput.value = "Host";
    handlers.createRoom();
    state.online.playerId = "p2";
    state.players[0].id = "p1";
    state.players[1].id = "p2";
    elements.confirmOverlay.hidden = false;

    capturedOnMessage({
      type: "state_update",
      roomId: "ROOM",
      playerId: "p2",
      state: {
        ...createInitialState({ mode: "online" }),
        players: [
          { id: "p1", hand: [], active: [], archive: [], discard: [], deck: [] },
          { id: "p2", hand: [], active: [], archive: [], discard: [], deck: [] },
        ],
        currentPlayer: 0,
        phase: "confirm",
      },
    });

    expect(elements.confirmOverlay.hidden).toBe(true);
  });

  it("starts a turn from between phase", () => {
    const handlers = createHandlers(state, elements, onWinner);
    state.phase = "between";
    elements.turnOverlay.hidden = false;

    handlers.startTurn();

    expect(state.phase).toBe("main");
    expect(elements.turnOverlay.hidden).toBe(true);
  });

  it("cancels archive confirmation", () => {
    const handlers = createHandlers(state, elements, onWinner);
    state.phase = "confirm";
    state.pendingArchive = { playedCards: [], drawCount: 0, playerIndex: 0 };
    elements.confirmOverlay.hidden = false;

    handlers.cancelArchive();

    expect(state.phase).toBe("main");
    expect(state.pendingArchive).toBe(null);
    expect(elements.confirmOverlay.hidden).toBe(true);
  });
});
