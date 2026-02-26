import { afterEach, describe, expect, it, vi } from "vitest";
import { createOnlineFlow } from "../src/ui/handlers/online-flow.js";
import { createInitialState } from "../src/game/state.js";

function makeElements() {
  return {
    modeOverlay: Object.assign(document.createElement("div"), { hidden: false }),
    formatOverlay: Object.assign(document.createElement("div"), { hidden: false }),
    cpuOverlay: Object.assign(document.createElement("div"), { hidden: false }),
    onlineChoiceOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    hostOverlay: Object.assign(document.createElement("div"), { hidden: false }),
    guestOverlay: Object.assign(document.createElement("div"), { hidden: false }),
    hostStatus: document.createElement("div"),
    guestStatus: document.createElement("div"),
    readyButton: Object.assign(document.createElement("button"), { disabled: false }),
    readyButtonGuest: Object.assign(document.createElement("button"), { disabled: false }),
    playerNameInput: Object.assign(document.createElement("input"), { value: "" }),
    roomCodeInput: Object.assign(document.createElement("input"), { value: "" }),
    guestNameInput: Object.assign(document.createElement("input"), { value: "" }),
    guestRoomCodeInput: Object.assign(document.createElement("input"), { value: "" }),
    confirmOverlay: Object.assign(document.createElement("div"), { hidden: false }),
    opponentAlert: document.createElement("div"),
    debugInfo: document.createElement("div"),
    winnerOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    winnerModalText: document.createElement("div"),
    winnerModalMessage: document.createElement("div"),
    restartGameModal: Object.assign(document.createElement("button"), { hidden: false }),
  };
}

function createFixture(options = {}) {
  const state = createInitialState({ mode: "online", format: "core" });
  state.online.role = options.role ?? "host";
  state.online.roomId = options.roomId ?? null;
  state.online.playerId = options.playerId ?? null;
  const elements = makeElements();

  let onMessage = null;
  let onStatus = null;
  let shouldThrowOnConnect = false;
  let sendResult = true;
  const connect = vi.fn(() => {
    if (shouldThrowOnConnect) throw new Error("connect failed");
  });
  const send = vi.fn(() => sendResult);
  const close = vi.fn();

  const deps = {
    render: vi.fn(),
    showConfirmOverlay: vi.fn(),
    isMyTurn: vi.fn(() => true),
    formatLabel: vi.fn((format) => format.toUpperCase()),
    updateFormatButtons: vi.fn(),
    formatPoolCostLine: vi.fn(() => null),
    formatPlatinumMessage: vi.fn(() => "opponent platinum"),
    formatTradeToast: vi.fn(() => "self trade toast"),
    onWinner: vi.fn(),
    showActionToast: vi.fn(),
    captureFeedbackSnapshot: vi.fn(() => ({ local: {} })),
    runFeedbackFromSnapshot: vi.fn(),
    showArchiveReplayFromEvent: vi.fn(),
    returnToModeSelect: vi.fn(),
  };

  const flow = createOnlineFlow({
    state,
    elements,
    clientFactory: vi.fn(({ onMessage: msg, onStatus: stat }) => {
      onMessage = msg;
      onStatus = stat;
      return { connect, send, close };
    }),
    socketUrl: "ws://test",
    ...deps,
  });

  return {
    state,
    elements,
    flow,
    deps,
    connect,
    send,
    close,
    getOnMessage: () => onMessage,
    getOnStatus: () => onStatus,
    setConnectThrows: (value) => {
      shouldThrowOnConnect = value;
    },
    setSendResult: (value) => {
      sendResult = value;
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("online-flow", () => {
  it("selectOnlineMode toggles overlays and resets statuses", () => {
    const { state, elements, flow, deps } = createFixture();

    flow.selectOnlineMode();

    expect(state.mode).toBe("online");
    expect(elements.modeOverlay.hidden).toBe(true);
    expect(elements.onlineChoiceOverlay.hidden).toBe(false);
    expect(elements.hostOverlay.hidden).toBe(true);
    expect(elements.guestOverlay.hidden).toBe(true);
    expect(elements.readyButton.disabled).toBe(true);
    expect(elements.readyButtonGuest.disabled).toBe(true);
    expect(elements.hostStatus.textContent).toBe("");
    expect(elements.guestStatus.textContent).toBe("");
    expect(deps.updateFormatButtons).toHaveBeenCalled();
  });

  it("createRoom sends create_room payload and processes room_created", () => {
    const fixture = createFixture({ role: "host" });
    const { state, elements, flow, send, connect, deps } = fixture;
    elements.playerNameInput.value = "Hosty";
    state.format = "ancient";

    flow.createRoom();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      type: "create_room",
      playerName: "Hosty",
      format: "ancient",
    });
    expect(state.online.role).toBe("host");
    expect(state.online.status).toBe("waiting");
    expect(elements.readyButton.disabled).toBe(true);

    const payloadState = createInitialState({ mode: "online", format: "ancient" });
    fixture.getOnMessage()({
      type: "room_created",
      roomId: "ROOM42",
      playerId: "p-host",
      state: payloadState,
    });

    expect(state.online.roomId).toBe("ROOM42");
    expect(state.online.playerId).toBe("p-host");
    expect(elements.roomCodeInput.value).toBe("ROOM42");
    expect(elements.guestRoomCodeInput.value).toBe("ROOM42");
    expect(elements.readyButton.disabled).toBe(false);
    expect(elements.hostStatus.textContent).toContain("Connected to room ROOM42");
    expect(deps.render).toHaveBeenCalled();
  });

  it("joinRoom validates room code and sends join payload", () => {
    const fixture = createFixture({ role: "guest" });
    const { state, elements, flow, send } = fixture;

    flow.chooseJoin();
    flow.joinRoom();
    expect(elements.guestStatus.textContent).toContain("Enter a room code to join.");
    expect(send).not.toHaveBeenCalled();

    elements.guestRoomCodeInput.value = "ab12cd";
    elements.guestNameInput.value = "Guesty";
    flow.joinRoom();

    expect(state.online.roomId).toBe("AB12CD");
    expect(state.online.role).toBe("guest");
    expect(state.online.status).toBe("joined");
    expect(elements.readyButtonGuest.disabled).toBe(false);
    expect(send).toHaveBeenCalledWith({
      type: "join_room",
      roomId: "AB12CD",
      playerName: "Guesty",
    });
  });

  it("readyUp enforces room membership and then sends ready_up", () => {
    const fixture = createFixture({ role: "host" });
    const { state, flow, send, elements } = fixture;

    flow.readyUp();
    expect(elements.hostStatus.textContent).toContain("Join a room before readying up.");
    expect(send).not.toHaveBeenCalled();

    elements.playerNameInput.value = "Host";
    flow.createRoom();
    state.online.roomId = "ROOM88";
    state.online.playerId = "host-1";
    flow.readyUp();

    expect(send).toHaveBeenCalledWith({
      type: "ready_up",
      roomId: "ROOM88",
      playerId: "host-1",
    });
  });

  it("sendAction reports connectivity and send failures", () => {
    const fixture = createFixture();
    const { flow, state, elements } = fixture;

    state.mode = "online";
    flow.sendAction({ type: "PLAY_CARD", payload: { index: 0 } });
    expect(elements.hostStatus.textContent).toContain("Not connected to server");

    flow.createRoom();
    state.online.roomId = "ROOM99";
    state.online.playerId = "host-1";
    fixture.setSendResult(false);
    flow.sendAction({ type: "PLAY_CARD", payload: { index: 0 } });
    expect(elements.hostStatus.textContent).toContain("Unable to send action");
  });

  it("handles state updates: self trade toast, opponent alerts, and confirm overlay", () => {
    const fixture = createFixture({ role: "host", playerId: "self-1" });
    const { flow, state, deps, elements } = fixture;

    flow.createRoom();
    const onMessage = fixture.getOnMessage();
    const payloadState = createInitialState({ mode: "online", format: "expanded" });
    payloadState.phase = "confirm";

    onMessage({
      type: "state_update",
      roomId: "ROOM1",
      playerId: "self-1",
      lastEvent: {
        type: "trade",
        recipeId: "trade_gem_set",
        playerId: "self-1",
        rewardType: "gold",
      },
      state: payloadState,
    });

    expect(deps.formatTradeToast).toHaveBeenCalled();
    expect(deps.showActionToast).toHaveBeenCalledWith("self trade toast");
    expect(deps.showConfirmOverlay).toHaveBeenCalled();
    expect(elements.debugInfo.textContent).toContain("state_update");
    expect(state.online.roomId).toBe("ROOM1");

    onMessage({
      type: "state_update",
      roomId: "ROOM1",
      playerId: "self-1",
      lastEvent: {
        type: "trade",
        recipeId: "trade_platinum",
        playerId: "opponent-2",
        useWood: false,
      },
      state: payloadState,
    });

    expect(deps.formatPlatinumMessage).toHaveBeenCalled();
    expect(elements.opponentAlert.textContent).toContain("opponent platinum");

    const mysticState = createInitialState({ mode: "online", format: "mystic" });
    mysticState.phase = "main";
    state.ruleset = mysticState.ruleset;
    state.format = "mystic";
    onMessage({
      type: "state_update",
      roomId: "ROOM1",
      playerId: "self-1",
      lastEvent: {
        type: "trade",
        recipeId: "trade_ash",
        playerId: "opponent-2",
        effectId: "ash_random_hand_to_deck",
        movedTypes: ["gold"],
        movedCount: 1,
      },
      state: mysticState,
    });
    expect(elements.opponentAlert.textContent).toContain("gold");
    expect(deps.showArchiveReplayFromEvent).not.toHaveBeenCalled();

    onMessage({
      type: "state_update",
      roomId: "ROOM1",
      playerId: "self-1",
      lastEvent: {
        type: "archive",
        playerId: "opponent-2",
        counts: { bronze: 1, silver: 1 },
        drawCount: 3,
      },
      state: payloadState,
    });
    expect(deps.showArchiveReplayFromEvent).toHaveBeenCalledWith(
      expect.objectContaining({ drawCount: 3 }),
      expect.any(String)
    );
    expect(deps.runFeedbackFromSnapshot).toHaveBeenCalled();
  });

  it("handles lobby, game_start, error, and game_over messages", () => {
    vi.useFakeTimers();
    const fixture = createFixture({ role: "host", playerId: "self-1" });
    const { flow, elements, deps } = fixture;
    flow.createRoom();
    const onMessage = fixture.getOnMessage();

    onMessage({
      type: "lobby_update",
      players: [
        { id: "p1", ready: true },
        { id: "p2", ready: false },
      ],
    });
    expect(elements.hostStatus.textContent).toBe("1/2 ready");

    const gameState = createInitialState({ mode: "online", format: "core" });
    gameState.phase = "main";
    onMessage({
      type: "game_start",
      roomId: "ROOM2",
      playerId: "self-1",
      state: gameState,
    });
    expect(elements.modeOverlay.hidden).toBe(true);
    expect(elements.onlineChoiceOverlay.hidden).toBe(true);
    expect(elements.hostOverlay.hidden).toBe(true);
    expect(elements.guestOverlay.hidden).toBe(true);
    expect(elements.readyButton.disabled).toBe(true);
    expect(elements.hostStatus.textContent).toBe("Game started!");

    onMessage({ type: "error", message: "server error" });
    expect(elements.hostStatus.textContent).toBe("server error");

    onMessage({ type: "game_over", winnerName: "Tester" });
    expect(elements.winnerOverlay.hidden).toBe(false);
    expect(elements.winnerModalText.textContent).toBe("Tester wins!");
    expect(elements.restartGameModal.hidden).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(deps.returnToModeSelect).toHaveBeenCalled();
  });

  it("copyRoomCode uses clipboard when available and fallback otherwise", async () => {
    const fixture = createFixture({ role: "host" });
    const { flow, elements } = fixture;
    const writeText = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal("navigator", { clipboard: { writeText } });
    elements.roomCodeInput.value = "ROOM5";
    await flow.copyRoomCode();
    expect(writeText).toHaveBeenCalledWith("ROOM5");
    expect(elements.hostStatus.textContent).toContain("Room code copied");

    vi.stubGlobal("navigator", {});
    await flow.copyRoomCode();
    expect(elements.hostStatus.textContent).toContain("Room code: ROOM5");
  });

  it("handles connect failures and winner callbacks outside online mode", () => {
    const fixture = createFixture({ role: "host", playerId: "self-1" });
    const { flow, setConnectThrows, elements, state, deps } = fixture;

    setConnectThrows(true);
    flow.createRoom();
    expect(elements.hostStatus.textContent).toContain("Unable to connect to server");

    setConnectThrows(false);
    flow.createRoom();
    const onMessage = fixture.getOnMessage();
    state.mode = "offline";
    const finishedState = createInitialState({ mode: "online" });
    finishedState.winner = 0;
    onMessage({
      type: "state_update",
      roomId: "ROOM7",
      playerId: "self-1",
      state: finishedState,
    });
    expect(deps.onWinner).toHaveBeenCalledWith(0);
  });

  it("closeClient closes socket and clears pending game over timer", () => {
    vi.useFakeTimers();
    const fixture = createFixture({ role: "host", playerId: "self-1" });
    const { flow, close, deps } = fixture;

    flow.createRoom();
    const onMessage = fixture.getOnMessage();
    onMessage({ type: "game_over", winnerName: "CPU" });
    flow.closeClient();
    vi.advanceTimersByTime(1500);

    expect(close).toHaveBeenCalled();
    expect(deps.returnToModeSelect).not.toHaveBeenCalled();
  });
});
