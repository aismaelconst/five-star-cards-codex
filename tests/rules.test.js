import { describe, it, expect } from "vitest";
import {
  baseRuleset,
  expandedRuleset,
  ancientRuleset,
  ancientExpandedRuleset,
} from "../src/game/ruleset.js";
import { createCard } from "../src/game/cards.js";
import {
  ActionTypes,
  applyAction,
  canTrade,
  canTradeWithOptions,
  finalizeArchive,
  performTrade,
  playCard,
  playCardByType,
  prepareArchive,
  returnAllCards,
  returnCard,
} from "../src/game/rules.js";

function makeState() {
  return {
    players: [
      {
        deck: [
          createCard("gold", baseRuleset),
          createCard("silver", baseRuleset),
          createCard("silver", baseRuleset),
          createCard("bronze", baseRuleset),
          createCard("bronze", baseRuleset),
        ],
        hand: [],
        active: [],
        archive: [],
        discard: [],
      },
      {
        deck: [],
        hand: [],
        active: [],
        archive: [],
        discard: [],
      },
    ],
    ruleset: baseRuleset,
    format: "core",
    currentPlayer: 0,
    tradesThisTurn: 0,
    phase: "main",
    winner: null,
    turnCount: 1,
    pendingArchive: null,
  };
}

function makeExpandedState() {
  return {
    players: [
      {
        deck: [],
        hand: [],
        active: [],
        archive: [],
        discard: [],
      },
      {
        deck: [],
        hand: [],
        active: [],
        archive: [],
        discard: [],
      },
    ],
    ruleset: expandedRuleset,
    format: "expanded",
    currentPlayer: 0,
    tradesThisTurn: 0,
    phase: "main",
    winner: null,
    turnCount: 1,
    pendingArchive: null,
  };
}

function makeAncientState() {
  return {
    players: [
      {
        deck: [],
        hand: [],
        active: [],
        archive: [],
        discard: [],
      },
      {
        deck: [],
        hand: [],
        active: [],
        archive: [],
        discard: [],
      },
    ],
    ruleset: ancientRuleset,
    format: "ancient",
    currentPlayer: 0,
    tradesThisTurn: 0,
    phase: "main",
    winner: null,
    turnCount: 1,
    pendingArchive: null,
  };
}

function current(state) {
  return state.players[state.currentPlayer];
}

describe("rules", () => {
  it("limits plays to MAX_PLAYS", () => {
    const state = makeState();
    const player = current(state);
    player.hand = Array.from({ length: baseRuleset.maxPlays + 1 }, () =>
      createCard("bronze", baseRuleset)
    );

    for (let i = 0; i < baseRuleset.maxPlays; i += 1) {
      expect(playCard(state, player, 0)).toBe(true);
    }

    expect(playCard(state, player, 0)).toBe(false);
    expect(player.active.length).toBe(baseRuleset.maxPlays);
  });

  it("returns cards from active to hand", () => {
    const state = makeState();
    const player = current(state);
    player.hand = [createCard("bronze", baseRuleset)];
    playCard(state, player, 0);

    expect(player.active.length).toBe(1);
    expect(returnCard(state, player, 0)).toBe(true);
    expect(player.hand.length).toBe(1);
    expect(player.active.length).toBe(0);
  });

  it("returns all cards from active to hand", () => {
    const state = makeState();
    const player = current(state);
    player.hand = [createCard("bronze", baseRuleset), createCard("silver", baseRuleset)];
    playCard(state, player, 0);
    playCard(state, player, 0);

    expect(returnAllCards(state, player)).toBe(true);
    expect(player.active.length).toBe(0);
    expect(player.hand.length).toBe(2);
  });

  it("trades five bronze for a silver", () => {
    const state = makeState();
    const player = current(state);
    player.archive = Array.from({ length: 5 }, () => createCard("bronze", baseRuleset));

    expect(canTrade(state, player, "trade_bronze")).toBe(true);
    expect(performTrade(state, player, "trade_bronze").success).toBe(true);
    expect(state.tradesThisTurn).toBe(1);
    expect(player.discard.length).toBe(5);
    expect(player.hand.some((card) => card.type === "silver")).toBe(true);
  });

  it("respects MAX_TRADES per turn", () => {
    const state = makeState();
    const player = current(state);
    player.archive = Array.from({ length: 25 }, () => createCard("bronze", baseRuleset));
    player.deck = Array.from({ length: 6 }, () => createCard("silver", baseRuleset));

    for (let i = 0; i < baseRuleset.maxTrades; i += 1) {
      expect(performTrade(state, player, "trade_bronze").success).toBe(true);
    }
    expect(canTrade(state, player, "trade_bronze")).toBe(false);
  });

  it("allows wood substitution for bronze trade", () => {
    const state = makeExpandedState();
    const player = current(state);
    player.archive = [
      createCard("bronze", expandedRuleset),
      createCard("bronze", expandedRuleset),
      createCard("bronze", expandedRuleset),
      createCard("bronze", expandedRuleset),
      createCard("wood", expandedRuleset),
    ];
    player.deck = [createCard("silver", expandedRuleset)];

    expect(
      canTradeWithOptions(state, player, "trade_bronze", {
        useWood: true,
        substituteType: "bronze",
      })
    ).toBe(true);
    const result = performTrade(state, player, "trade_bronze", {
      useWood: true,
      substituteType: "bronze",
    });
    expect(result.success).toBe(true);
    expect(player.hand.some((card) => card.type === "silver")).toBe(true);
  });

  it("allows wood substitution for gem trade with tutor", () => {
    const state = makeExpandedState();
    const player = current(state);
    player.archive = [
      createCard("ruby", expandedRuleset),
      createCard("sapphire", expandedRuleset),
      createCard("wood", expandedRuleset),
    ];
    player.deck = [createCard("gold", expandedRuleset)];

    const result = performTrade(state, player, "trade_gem_set", {
      useWood: true,
      substituteType: "emerald",
      rewardType: "gold",
    });
    expect(result.success).toBe(true);
    expect(player.hand.some((card) => card.type === "gold")).toBe(true);
  });

  it("allows wood substitution for platinum trade and digs", () => {
    const state = makeExpandedState();
    const player = current(state);
    player.archive = [
      createCard("platinum", expandedRuleset),
      createCard("bronze", expandedRuleset),
      createCard("wood", expandedRuleset),
    ];
    player.deck = [
      createCard("gold", expandedRuleset),
      createCard("silver", expandedRuleset),
      createCard("bronze", expandedRuleset),
    ];

    const result = performTrade(state, player, "trade_platinum", {
      useWood: true,
      substituteType: "silver",
    });
    expect(result.success).toBe(true);
    expect(player.hand.some((card) => card.type === "gold")).toBe(true);
    expect(result.detail.digDiscardedCount).toBe(2);
  });

  it("does not allow substituting platinum with wood", () => {
    const state = makeExpandedState();
    const player = current(state);
    player.archive = [
      createCard("bronze", expandedRuleset),
      createCard("silver", expandedRuleset),
      createCard("wood", expandedRuleset),
    ];
    player.deck = [createCard("gold", expandedRuleset)];

    expect(
      canTradeWithOptions(state, player, "trade_platinum", {
        useWood: true,
        substituteType: "platinum",
      })
    ).toBe(false);
  });

  it("does not allow wood substitution without wood", () => {
    const state = makeExpandedState();
    const player = current(state);
    player.archive = [
      createCard("bronze", expandedRuleset),
      createCard("bronze", expandedRuleset),
      createCard("bronze", expandedRuleset),
      createCard("bronze", expandedRuleset),
    ];
    player.deck = [createCard("silver", expandedRuleset)];

    expect(
      canTradeWithOptions(state, player, "trade_bronze", {
        useWood: true,
        substituteType: "bronze",
      })
    ).toBe(false);
  });

  it("platinum dig can yield no reward when only bronze/silver", () => {
    const state = makeExpandedState();
    const player = current(state);
    player.archive = [
      createCard("platinum", expandedRuleset),
      createCard("bronze", expandedRuleset),
      createCard("silver", expandedRuleset),
    ];
    player.deck = [
      createCard("silver", expandedRuleset),
      createCard("bronze", expandedRuleset),
    ];

    const result = performTrade(state, player, "trade_platinum");
    expect(result.success).toBe(true);
    expect(player.hand.length).toBe(0);
    expect(result.detail.digDiscardedCount).toBe(2);
  });

  it("trades two distinct ancients to archive a non-gold card", () => {
    const state = makeAncientState();
    const player = current(state);
    player.archive = [
      createCard("turquoise", ancientRuleset),
      createCard("carnelian", ancientRuleset),
    ];
    player.deck = [
      createCard("silver", ancientRuleset),
      createCard("gold", ancientRuleset),
    ];

    const result = performTrade(state, player, "trade_ancients_archive", {
      poolTypes: ["turquoise", "carnelian"],
      rewardType: "silver",
    });
    expect(result.success).toBe(true);
    expect(player.archive.some((card) => card.type === "silver")).toBe(true);
    expect(player.discard.length).toBe(2);
  });

  it("rejects duplicate ancients in pool cost", () => {
    const state = makeAncientState();
    const player = current(state);
    player.archive = [
      createCard("turquoise", ancientRuleset),
      createCard("turquoise", ancientRuleset),
    ];
    player.deck = [createCard("silver", ancientRuleset)];

    expect(
      canTradeWithOptions(state, player, "trade_ancients_archive", {
        poolTypes: ["turquoise", "turquoise"],
        rewardType: "silver",
      })
    ).toBe(false);
  });

  it("electrum trade archives cards from hand", () => {
    const state = makeAncientState();
    const player = current(state);
    player.archive = [
      createCard("electrum", ancientRuleset),
      createCard("bronze", ancientRuleset),
      createCard("silver", ancientRuleset),
    ];
    player.hand = [
      createCard("turquoise", ancientRuleset),
      createCard("bronze", ancientRuleset),
      createCard("silver", ancientRuleset),
    ];

    const result = performTrade(state, player, "trade_electrum_draw", {
      handArchive: { turquoise: 1, bronze: 1, silver: 1 },
    });
    expect(result.success).toBe(true);
    expect(player.hand.length).toBe(0);
    expect(player.archive.length).toBe(3);
    expect(result.detail.handArchive).toEqual({ turquoise: 1, bronze: 1, silver: 1 });
  });

  it("rejects electrum trade with invalid hand archive selection", () => {
    const state = makeAncientState();
    const player = current(state);
    player.archive = [
      createCard("electrum", ancientRuleset),
      createCard("bronze", ancientRuleset),
      createCard("silver", ancientRuleset),
    ];
    player.hand = [createCard("bronze", ancientRuleset)];

    expect(
      canTradeWithOptions(state, player, "trade_electrum_draw", {
        handArchive: { bronze: 2 },
      })
    ).toBe(false);
  });

  it("rejects electrum trade when hand archive includes gold", () => {
    const state = makeAncientState();
    const player = current(state);
    player.archive = [
      createCard("electrum", ancientRuleset),
      createCard("bronze", ancientRuleset),
      createCard("silver", ancientRuleset),
    ];
    player.hand = [createCard("gold", ancientRuleset)];

    expect(
      canTradeWithOptions(state, player, "trade_electrum_draw", {
        handArchive: { gold: 1 },
      })
    ).toBe(false);
  });

  it("does not allow wood to replace electrum in electrum trade", () => {
    const state = makeAncientState();
    state.ruleset = ancientExpandedRuleset;
    state.format = "ancient_expanded";
    const player = current(state);
    player.archive = [
      createCard("electrum", ancientExpandedRuleset),
      createCard("bronze", ancientExpandedRuleset),
      createCard("silver", ancientExpandedRuleset),
      createCard("wood", ancientExpandedRuleset),
    ];
    player.hand = [createCard("bronze", ancientExpandedRuleset)];

    expect(
      canTradeWithOptions(state, player, "trade_electrum_draw", {
        useWood: true,
        substituteType: "electrum",
        handArchive: { bronze: 1 },
      })
    ).toBe(false);
  });

  it("prepareArchive creates pending archive and draw count", () => {
    const state = makeState();
    const player = current(state);
    player.active = [
      createCard("bronze", baseRuleset),
      createCard("silver", baseRuleset),
      createCard("gold", baseRuleset),
    ];

    const pending = prepareArchive(state);
    expect(pending).not.toBeNull();
    expect(pending.drawCount).toBe(1 + 2 + 3);
    expect(state.phase).toBe("confirm");
  });

  it("finalizeArchive moves cards, draws, and advances turn", () => {
    const state = makeState();
    const player = current(state);
    player.active = [
      createCard("bronze", baseRuleset),
      createCard("bronze", baseRuleset),
    ];
    prepareArchive(state);

    const result = finalizeArchive(state);
    expect(result.winnerIndex).toBeNull();
    expect(player.archive.length).toBe(2);
    expect(player.active.length).toBe(0);
    expect(state.currentPlayer).toBe(1);
    expect(state.phase).toBe("between");
  });


  it("declares winner when archive has five gold", () => {
    const state = makeState();
    const player = current(state);
    player.active = Array.from({ length: 5 }, () => createCard("gold", baseRuleset));
    prepareArchive(state);

    const result = finalizeArchive(state);
    expect(result.winnerIndex).toBe(0);
  });

  it("playCardByType plays a card of that type", () => {
    const state = makeState();
    const player = current(state);
    player.hand = [
      createCard("bronze", baseRuleset),
      createCard("silver", baseRuleset),
      createCard("bronze", baseRuleset),
    ];

    expect(playCardByType(state, player, "silver")).toBe(true);
    expect(player.active.some((card) => card.type === "silver")).toBe(true);
    expect(player.hand.length).toBe(2);
  });

  it("applyAction routes start turn and cancel archive", () => {
    const state = makeState();
    state.phase = "between";
    applyAction(state, { type: ActionTypes.START_TURN });
    expect(state.phase).toBe("main");

    state.phase = "confirm";
    state.pendingArchive = { playedCards: [], drawCount: 0, playerIndex: 0 };
    applyAction(state, { type: ActionTypes.CANCEL_ARCHIVE });
    expect(state.phase).toBe("main");
    expect(state.pendingArchive).toBe(null);
  });
});
