import { describe, it, expect, vi } from "vitest";
import { renderApp, showConfirmOverlay, showTurnOverlay } from "../src/ui/render.js";
import { baseRuleset } from "../src/game/ruleset.js";

function makeElements() {
  const ids = [
    "turnIndicator",
    "turnCounter",
    "opponentSummary",
    "archiveCounts",
    "handCounts",
    "archivePile",
    "activeCards",
    "handCards",
    "tradeInfo",
    "deckInfo",
    "discardInfo",
    "tradeBronze",
    "tradeSilver",
    "endTurn",
    "undoPlays",
    "confirmOverlay",
    "confirmSummary",
    "confirmCards",
    "turnOverlay",
    "overlayTitle",
  ];

  const elements = {};
  ids.forEach((id) => {
    const node = id.includes("Overlay") ? document.createElement("div") : document.createElement("div");
    node.id = id;
    elements[id] = node;
  });

  elements.tradeBronze = document.createElement("button");
  elements.tradeSilver = document.createElement("button");
  elements.endTurn = document.createElement("button");
  elements.undoPlays = document.createElement("button");

  return elements;
}

function makeState() {
  return {
    players: [
      {
        name: "Hoster",
        deck: ["bronze", "silver", "gold"],
        hand: ["bronze", "bronze", "silver"],
        active: [],
        archive: [],
        discard: [],
      },
      { deck: [], hand: [], active: [], archive: [], discard: [] },
    ],
    ruleset: baseRuleset,
    currentPlayer: 0,
    tradesThisTurn: 0,
    phase: "main",
    winner: null,
    turnCount: 2,
    pendingArchive: null,
  };
}

describe("ui/render", () => {
  it("renders core counters and text", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };

    renderApp(state, elements, handlers);

    expect(elements.turnIndicator.textContent).toContain("Hoster");
    expect(elements.turnCounter.textContent).toContain("Turn 2");
    expect(elements.deckInfo.textContent).toContain("Deck:");
    expect(elements.tradeInfo.textContent).toContain("Trades used");
    expect(elements.opponentSummary.textContent).toContain("Hand");
    const card = elements.handCards.querySelector(".card");
    expect(card.dataset.cardType).toBeTruthy();
  });

  it("disables actions when not your turn online", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };
    state.mode = "online";
    state.online = { playerId: "p2" };
    state.players[0].id = "p1";
    state.players[1].id = "p2";
    state.currentPlayer = 0;

    renderApp(state, elements, handlers);

    expect(elements.endTurn.disabled).toBe(true);
    expect(elements.tradeBronze.disabled).toBe(true);
  });

  it("renders hand as piles when large", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };

    state.players[0].hand = Array.from({ length: 11 }, () => "bronze");

    renderApp(state, elements, handlers);

    const pile = elements.handCards.querySelector(".card.pile");
    expect(pile).not.toBeNull();
    pile.click();
    expect(handlers.playCardByType).toHaveBeenCalled();
  });

  it("shows confirm overlay with summary", () => {
    const state = makeState();
    const elements = makeElements();
    state.pendingArchive = {
      playedCards: ["bronze", "silver"],
      drawCount: 3,
      playerIndex: 0,
    };

    showConfirmOverlay(state, elements);

    expect(elements.confirmSummary.textContent).toContain("Archive 2 card");
    expect(elements.confirmCards.children.length).toBeGreaterThan(0);
    expect(elements.confirmOverlay.hidden).toBe(false);
  });

  it("shows turn overlay", () => {
    const state = makeState();
    const elements = makeElements();

    showTurnOverlay(state, elements);

    expect(elements.overlayTitle.textContent).toContain("Player 1");
    expect(elements.turnOverlay.hidden).toBe(false);
  });
});
