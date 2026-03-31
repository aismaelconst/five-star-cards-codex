import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp, showConfirmOverlay, showTurnOverlay } from "../src/ui/render.js";
import {
  baseRuleset,
  expandedRuleset,
  ancientRuleset,
  mysticRuleset,
  foundryRuleset,
} from "../src/game/ruleset.js";

function makeElements() {
  const ids = [
    "turnIndicator",
    "turnCounter",
    "opponentSummary",
    "rulesList",
    "expansionRules",
    "cardLegend",
    "archivePile",
    "activeCards",
    "handCards",
    "tradeInfo",
    "deckInfo",
    "discardInfo",
    "boardDeckStack",
    "boardDiscardStack",
    "deckZone",
    "discardZone",
    "archiveZone",
    "activeZone",
    "handZone",
    "feedbackCaption",
    "goldRacePlayer",
    "goldRaceOpponent",
    "archiveInspectOverlay",
    "archiveInspectTitle",
    "archiveInspectMeta",
    "archiveInspectCards",
    "archiveInspectClose",
    "tradeBronze",
    "tradeSilver",
    "tradeGems",
    "tradePlatinum",
    "tradeProspector",
    "tradeAssayer",
    "tradeSmelter",
    "tradeRefiner",
    "tradeAncientsArchive",
    "tradePearl",
    "tradeObsidian",
    "tradeAmethyst",
    "tradeAsh",
    "tradeEmber",
    "openTradesModal",
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
  elements.tradeGems = document.createElement("button");
  elements.tradePlatinum = document.createElement("button");
  elements.tradeProspector = document.createElement("button");
  elements.tradeAssayer = document.createElement("button");
  elements.tradeSmelter = document.createElement("button");
  elements.tradeRefiner = document.createElement("button");
  elements.tradeAncientsArchive = document.createElement("button");
  elements.tradePearl = document.createElement("button");
  elements.tradeObsidian = document.createElement("button");
  elements.tradeAmethyst = document.createElement("button");
  elements.tradeAsh = document.createElement("button");
  elements.tradeEmber = document.createElement("button");
  elements.openTradesModal = document.createElement("button");
  elements.endTurn = document.createElement("button");
  elements.undoPlays = document.createElement("button");
  elements.archiveInspectClose = document.createElement("button");

  return elements;
}

beforeEach(() => {
  document.body.className = "";
});

afterEach(() => {
  document.body.className = "";
});

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
      openArchiveInspect: vi.fn(),
    };

    renderApp(state, elements, handlers);

    expect(elements.turnIndicator.textContent).toContain("Hoster");
    expect(elements.turnCounter.textContent).toContain("Turn 2");
    expect(elements.deckInfo.textContent).toContain("card(s)");
    expect(elements.boardDeckStack.className).toContain("card-back");
    expect(elements.tradeInfo.textContent).toContain("Trades used");
    expect(elements.goldRacePlayer.textContent).toContain("Gold 0/5");
    expect(elements.goldRaceOpponent.textContent).toContain("Gold 0/5");
    expect(elements.opponentSummary.querySelector(".summary-title")?.textContent).toContain(
      "Opponent Summary"
    );
    expect(elements.opponentSummary.querySelector(".archive-empty")).not.toBeNull();
    expect(elements.opponentSummary.querySelector(".summary-hand")?.textContent).toContain("Hand:");
    const card = elements.handCards.querySelector(".card");
    expect(card.dataset.cardType).toBeTruthy();
  });

  it("shows explore-trades indicator when at least one trade is available", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.players[0].archive = Array.from({ length: 5 }, () => "bronze");
    state.players[0].deck = ["silver"];

    renderApp(state, elements, handlers);

    expect(elements.openTradesModal.classList.contains("has-trades")).toBe(true);
  });

  it("hides explore-trades indicator when no trades are available", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };

    renderApp(state, elements, handlers);

    expect(elements.openTradesModal.classList.contains("has-trades")).toBe(false);
  });

  it("renders expanded archive as mini-card stacks", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.ruleset = expandedRuleset;
    state.format = "expanded";
    state.players[0].hand = ["wood", "ruby", "bronze"];
    state.players[0].archive = ["platinum", "gold"];

    renderApp(state, elements, handlers);

    expect(elements.archivePile.querySelector(".mini-stack.platinum")).not.toBeNull();
  });

  it("opens archive inspect when mini stack is clicked", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.players[0].archive = ["gold", "gold"];

    renderApp(state, elements, handlers);

    elements.archivePile.querySelector(".mini-stack.gold")?.click();
    expect(handlers.openArchiveInspect).toHaveBeenCalledWith("player", "gold", 2);
  });

  it("renders expanded hand piles by type", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
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

  it("renders compact archive counts and hides deck or discard visuals", () => {
    document.body.classList.add("compact-board");
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.ruleset = expandedRuleset;
    state.format = "expanded";
    state.players[0].archive = ["gold", "platinum"];
    state.players[0].discard = ["bronze"];
    state.players[1].archive = ["bronze", "wood"];

    renderApp(state, elements, handlers);

    expect(elements.archivePile.querySelector(".archive-count-button.gold")).not.toBeNull();
    expect(elements.archivePile.querySelector(".mini-stack")).toBeNull();
    expect(elements.opponentSummary.querySelector(".archive-count-button.bronze")).not.toBeNull();
    expect(elements.boardDeckStack.hidden).toBe(true);
    expect(elements.boardDiscardStack.hidden).toBe(true);
  });

  it("renders compact hand as piles once hand reaches six cards", () => {
    document.body.classList.add("compact-board");
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.players[0].hand = ["bronze", "bronze", "bronze", "silver", "silver", "gold"];

    renderApp(state, elements, handlers);

    expect(elements.handCards.querySelector(".card.pile")).not.toBeNull();
    expect(elements.handCards.children.length).toBeLessThan(6);
  });

  it("switches six-card compact hands to piles", () => {
    document.body.classList.add("compact-board");
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.ruleset = foundryRuleset;
    state.format = "foundry";
    state.players[0].hand = ["bronze", "bronze", "bronze", "alloy", "prospector", "smelter"];

    renderApp(state, elements, handlers);

    expect(elements.handCards.querySelector(".card.pile")).not.toBeNull();
  });

  it("keeps six-card hands expanded outside compact mode", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.players[0].hand = ["bronze", "bronze", "bronze", "silver", "silver", "gold"];

    renderApp(state, elements, handlers);

    expect(elements.handCards.querySelector(".card.pile")).toBeNull();
    expect(elements.handCards.children).toHaveLength(6);
  });

  it("renders cpu opponent archive breakdown", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.mode = "cpu";
    state.ruleset = expandedRuleset;
    state.format = "expanded";
    state.players[1].archive = ["bronze", "gold", "wood", "platinum"];

    renderApp(state, elements, handlers);

    expect(elements.opponentSummary.querySelector(".mini-stack.bronze")).not.toBeNull();
    expect(elements.opponentSummary.querySelector(".mini-stack.wood")).not.toBeNull();
  });

  it("renders ancient expansion rules and legend", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.ruleset = ancientRuleset;
    state.format = "ancient";

    renderApp(state, elements, handlers);

    expect(elements.expansionRules.textContent).toContain("Ancients");
    expect(elements.expansionRules.textContent).toContain("Ingot");
    expect(elements.expansionRules.textContent).toContain("Sterling");
    expect(elements.cardLegend.querySelector(".chip.turquoise")).not.toBeNull();
    expect(elements.cardLegend.querySelector(".chip.ingot")).not.toBeNull();
    expect(elements.cardLegend.querySelector(".chip.ruby")).toBeNull();
  });

  it("renders mystic expansion rules and mystic trade buttons", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.ruleset = mysticRuleset;
    state.format = "mystic";

    renderApp(state, elements, handlers);

    expect(elements.expansionRules.textContent).toContain("Pearl");
    expect(elements.expansionRules.textContent).toContain("Obsidian");
    expect(elements.cardLegend.querySelector(".chip.pearl")).not.toBeNull();
    expect(elements.tradePearl.hidden).toBe(false);
    expect(elements.tradeObsidian.hidden).toBe(false);
    expect(elements.tradeAmethyst.hidden).toBe(false);
    expect(elements.tradeAsh.hidden).toBe(false);
    expect(elements.tradeEmber.hidden).toBe(false);
  });

  it("renders foundry expansion rules and foundry trade buttons", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.ruleset = foundryRuleset;
    state.format = "foundry";
    state.players[0].archive = ["prospector", "bronze", "assayer", "alloy"];
    state.players[0].deck = ["gold", "refiner"];

    renderApp(state, elements, handlers);

    expect(elements.expansionRules.textContent).toContain("Prospector");
    expect(elements.cardLegend.textContent).toContain("Alloy");
    expect(elements.tradeProspector.hidden).toBe(false);
    expect(elements.tradeProspector.disabled).toBe(false);
    expect(elements.tradeAssayer.hidden).toBe(false);
    expect(elements.tradeAssayer.disabled).toBe(false);
  });

  it("shows dynamic play cap in trade info for mystic bonuses", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.ruleset = mysticRuleset;
    state.format = "mystic";
    state.turnEffects = {
      currentPlayBonusByPlayer: [1, 0],
      currentPlayPenaltyByPlayer: [0, 0],
      nextTurnPlayPenaltyByPlayer: [0, 0],
      currentTradeBlockedByPlayer: [false, false],
      nextTurnTradeBlockedByPlayer: [false, false],
      usedTradeRecipesByPlayer: [{}, {}],
    };
    state.players[0].active = ["bronze", "silver"];

    renderApp(state, elements, handlers);

    expect(elements.tradeInfo.textContent).toContain("Plays used: 2/6");
  });

  it("marks gold urgency at four or more gold in archive", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
    };
    state.players[0].archive = ["gold", "gold", "gold", "gold"];
    state.players[1].archive = ["gold", "gold", "gold", "gold"];

    renderApp(state, elements, handlers);

    expect(elements.goldRacePlayer.classList.contains("urgent")).toBe(true);
    expect(elements.goldRaceOpponent.classList.contains("urgent")).toBe(true);
    expect(elements.archivePile.querySelector(".mini-stack.gold")?.classList.contains("gold-urgent")).toBe(
      true
    );
  });

  it("renders archive inspect overlay when inspect state is active", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
    };
    state.ui = {
      archiveInspect: {
        owner: "player",
        type: "silver",
        count: 3,
        visible: true,
      },
    };

    renderApp(state, elements, handlers);

    expect(elements.archiveInspectOverlay.hidden).toBe(false);
    expect(elements.archiveInspectTitle.textContent).toContain("Silver");
    expect(elements.archiveInspectCards.querySelectorAll(".card.silver")).toHaveLength(3);
  });

  it("disables actions when not your turn online", () => {
    const state = makeState();
    const elements = makeElements();
    const handlers = {
      playCard: vi.fn(),
      playCardByType: vi.fn(),
      returnCard: vi.fn(),
      openArchiveInspect: vi.fn(),
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
      openArchiveInspect: vi.fn(),
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
      openArchiveInspect: vi.fn(),
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
      openArchiveInspect: vi.fn(),
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
