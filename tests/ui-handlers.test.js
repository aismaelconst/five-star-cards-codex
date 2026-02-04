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
    onlineNote: document.createElement("div"),
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

  it("selects online mode and keeps mode overlay visible", () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.modeOverlay.hidden = true;

    handlers.selectOnlineMode();

    expect(state.mode).toBe("online");
    expect(elements.modeOverlay.hidden).toBe(false);
    expect(elements.onlineNote.textContent).toContain("coming soon");
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
