import { describe, it, expect, vi } from "vitest";
import { renderApp, showConfirmOverlay, showTurnOverlay } from "../src/ui/render.js";
import {
  baseRuleset,
  expandedRuleset,
  ancientRuleset,
  mintedRuleset,
} from "../src/game/ruleset.js";

function makeElements() {
  const ids = [
    "turnIndicator",
    "turnCounter",
    "opponentSummary",
    "rulesList",
    "expansionRules",
    "cardLegend",
    "handCounts",
    "archivePile",
    "activeCards",
    "handCards",
    "tradeInfo",
    "deckInfo",
    "discardInfo",
    "tradeBronze",
    "tradeSilver",
    "tradeMint",
    "tradeHallmark",
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
    let node = document.createElement("div");
    if (id === "rulesList") node = document.createElement("ul");
    node.id = id;
    elements[id] = node;
  });

  elements.tradeBronze = document.createElement("button");
  elements.tradeSilver = document.createElement("button");
  elements.tradeMint = document.createElement("button");
  elements.tradeHallmark = document.createElement("button");
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
    format: "core",
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
    expect(elements.opponentSummary.querySelector(".summary-title")?.textContent).toContain(
      "Opponent Summary"
    );
    expect(elements.opponentSummary.querySelector(".chip.gold")).not.toBeNull();
    expect(elements.opponentSummary.querySelector(".summary-hand")?.textContent).toContain("Hand:");
    expect(elements.handCounts.querySelector(".chip.bronze")).not.toBeNull();
    const card = elements.handCards.querySelector(".card");
    expect(card.dataset.cardType).toBeTruthy();
  });

  it("renders expanded counts as chips", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };
    state.ruleset = expandedRuleset;
    state.format = "expanded";
    state.players[0].hand = ["wood", "ruby", "bronze"];
    state.players[0].archive = ["platinum", "gold"];

    renderApp(state, elements, handlers);

    expect(elements.handCounts.querySelector(".chip.wood")).not.toBeNull();
    expect(elements.archivePile.textContent).toContain("platinum x 1");
  });

  it("renders expanded hand piles by type", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };
    state.ruleset = expandedRuleset;
    state.format = "expanded";
    state.players[0].hand = [
      ...Array.from({ length: 10 }, () => "bronze"),
      "ruby",
    ];

    renderApp(state, elements, handlers);

    const rubyPile = elements.handCards.querySelector(".card.ruby.pile");
    expect(rubyPile).not.toBeNull();
  });

  it("renders cpu opponent archive breakdown", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };
    state.mode = "cpu";
    state.ruleset = expandedRuleset;
    state.format = "expanded";
    state.players[1].archive = ["bronze", "gold", "wood", "platinum"];

    renderApp(state, elements, handlers);

    expect(elements.opponentSummary.querySelector(".chip.bronze")).not.toBeNull();
    expect(elements.opponentSummary.querySelector(".chip.wood")).not.toBeNull();
  });

  it("renders ancient expansion rules and legend", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };
    state.ruleset = ancientRuleset;
    state.format = "ancient";

    renderApp(state, elements, handlers);

    expect(elements.expansionRules.textContent).toContain("Ancients");
    expect(elements.expansionRules.textContent).toContain("Electrum");
    expect(elements.cardLegend.querySelector(".chip.turquoise")).not.toBeNull();
    expect(elements.cardLegend.querySelector(".chip.copper")).not.toBeNull();
    expect(elements.cardLegend.querySelector(".chip.ruby")).toBeNull();
  });

  it("renders minted expansion rules and legend", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };
    state.ruleset = mintedRuleset;
    state.format = "minted";

    renderApp(state, elements, handlers);

    expect(elements.expansionRules.textContent).toContain("Ingot");
    expect(elements.expansionRules.textContent).toContain("Hallmark");
    expect(elements.cardLegend.querySelector(".chip.ingot")).not.toBeNull();
    expect(elements.cardLegend.querySelector(".chip.ruby")).toBeNull();
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

  it("disables actions when cpu is taking its turn", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };
    state.mode = "cpu";
    state.currentPlayer = 1;

    renderApp(state, elements, handlers);

    expect(elements.endTurn.disabled).toBe(true);
    expect(elements.tradeBronze.disabled).toBe(true);
  });

  it("shows opponent active cards only during confirm phase", () => {
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
    state.players[0].active = ["gold"];

    state.phase = "main";
    renderApp(state, elements, handlers);
    expect(elements.activeCards.children.length).toBe(0);

    state.phase = "confirm";
    renderApp(state, elements, handlers);
    expect(elements.activeCards.children.length).toBe(1);
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
    expect(pile.dataset.tooltip).toContain("End of turn");
    pile.click();
    expect(handlers.playCardByType).toHaveBeenCalled();
  });

  it("adds tooltips to hand cards", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };

    renderApp(state, elements, handlers);

    const card = elements.handCards.querySelector(".card");
    expect(card.dataset.tooltip).toContain("End of turn");
  });

  it("does not add tooltips for unknown cards", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };
    state.players[0].hand = [{ type: "unknown" }];

    renderApp(state, elements, handlers);

    const card = elements.handCards.querySelector(".card");
    expect(card.dataset.tooltip).toBeUndefined();
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
