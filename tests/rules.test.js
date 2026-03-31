import { describe, it, expect, vi } from "vitest";
import {
  baseRuleset,
  expandedRuleset,
  ancientRuleset,
  mysticRuleset,
  foundryRuleset,
  mintedRuleset,
} from "../src/game/ruleset.js";
import { createCard } from "../src/game/cards.js";
import {
  ActionTypes,
  applyAction,
  canInitiateTrade,
  canTrade,
  canTradeWithOptions,
  finalizeArchive,
  getPlayerPlayLimit,
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

function makeMintedState() {
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
    ruleset: mintedRuleset,
    format: "minted",
    currentPlayer: 0,
    tradesThisTurn: 0,
    phase: "main",
    winner: null,
    turnCount: 1,
    pendingArchive: null,
  };
}

function makeMysticState() {
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
    ruleset: mysticRuleset,
    format: "mystic",
    currentPlayer: 0,
    tradesThisTurn: 0,
    phase: "main",
    winner: null,
    turnCount: 1,
    pendingArchive: null,
    turnEffects: {
      currentPlayBonusByPlayer: [0, 0],
      currentPlayPenaltyByPlayer: [0, 0],
      nextTurnPlayPenaltyByPlayer: [0, 0],
      currentTradeBlockedByPlayer: [false, false],
      nextTurnTradeBlockedByPlayer: [false, false],
      usedTradeRecipesByPlayer: [{}, {}],
    },
  };
}

function makeFoundryState() {
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
    ruleset: foundryRuleset,
    format: "foundry",
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

  it("rejects shelved electrum trade in ancient format", () => {
    const state = makeAncientState();
    const player = current(state);
    player.archive = [
      createCard("electrum", ancientRuleset),
      createCard("copper", ancientRuleset),
    ];
    player.hand = [createCard("bronze", ancientRuleset)];

    const result = performTrade(state, player, "trade_electrum_draw", {
      choiceType: "copper",
      handArchive: { bronze: 1 },
    });
    expect(canTradeWithOptions(state, player, "trade_electrum_draw", {
      choiceType: "copper",
      handArchive: { bronze: 1 },
    })).toBe(false);
    expect(result.success).toBe(false);
  });

  it("mystic pearl trade costs itself, raises play cap, and is once per turn", () => {
    const state = makeMysticState();
    const player = current(state);
    player.archive = [createCard("pearl", mysticRuleset)];

    expect(canTradeWithOptions(state, player, "trade_pearl", {})).toBe(true);
    const result = performTrade(state, player, "trade_pearl", {});

    expect(result.success).toBe(true);
    expect(result.detail.effectId).toBe("pearl_extra_play");
    expect(getPlayerPlayLimit(state, 0)).toBe(6);
    expect(player.discard.filter((card) => card.type === "pearl")).toHaveLength(1);
    expect(canInitiateTrade(state, player, "trade_pearl")).toBe(false);
  });

  it("obsidian applies next-turn play penalty with minimum floor of one playable card", () => {
    const state = makeMysticState();
    const player = current(state);
    const opponent = state.players[1];
    player.archive = [createCard("obsidian", mysticRuleset)];
    opponent.hand = [createCard("bronze", mysticRuleset), createCard("silver", mysticRuleset)];

    const trade = performTrade(state, player, "trade_obsidian");
    expect(trade.success).toBe(true);
    expect(state.turnEffects.nextTurnPlayPenaltyByPlayer[1]).toBe(1);

    prepareArchive(state);
    finalizeArchive(state);
    applyAction(state, { type: ActionTypes.START_TURN });

    expect(state.currentPlayer).toBe(1);
    expect(getPlayerPlayLimit(state, 1)).toBe(4);

    state.turnEffects.currentPlayPenaltyByPlayer[1] = 99;
    expect(getPlayerPlayLimit(state, 1)).toBe(1);
    expect(playCard(state, opponent, 0)).toBe(true);
    expect(playCard(state, opponent, 0)).toBe(false);
  });

  it("amethyst requires valid targetType and can move gold from opponent archive", () => {
    const state = makeMysticState();
    const player = current(state);
    const opponent = state.players[1];
    player.archive = [createCard("amethyst", mysticRuleset)];
    opponent.archive = [
      createCard("gold", mysticRuleset),
      createCard("silver", mysticRuleset),
    ];
    opponent.deck = [];

    expect(canInitiateTrade(state, player, "trade_amethyst")).toBe(true);
    expect(canTradeWithOptions(state, player, "trade_amethyst", {})).toBe(false);
    expect(
      canTradeWithOptions(state, player, "trade_amethyst", { targetType: "bronze" })
    ).toBe(false);

    const result = performTrade(state, player, "trade_amethyst", { targetType: "gold" });
    expect(result.success).toBe(true);
    expect(result.detail.effectId).toBe("amethyst_archive_to_deck");
    expect(result.detail.targetType).toBe("gold");
    expect(result.detail.movedCount).toBe(1);
    expect(result.detail.movedTypes).toEqual(["gold"]);
    expect(opponent.archive.some((card) => card.type === "gold")).toBe(false);
    expect(opponent.deck.some((card) => card.type === "gold")).toBe(true);
  });

  it("ash moves one random opponent hand card to deck", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const state = makeMysticState();
      const player = current(state);
      const opponent = state.players[1];
      player.archive = [createCard("ash", mysticRuleset)];
      opponent.hand = [
        createCard("gold", mysticRuleset),
        createCard("silver", mysticRuleset),
      ];
      opponent.deck = [createCard("bronze", mysticRuleset)];

      const result = performTrade(state, player, "trade_ash");
      expect(result.success).toBe(true);
      expect(result.detail.effectId).toBe("ash_random_hand_to_deck");
      expect(result.detail.movedCount).toBe(1);
      expect(result.detail.movedTypes).toEqual(["gold"]);
      expect(opponent.hand).toHaveLength(1);
      expect(opponent.deck).toHaveLength(2);
      expect(opponent.deck.some((card) => card.type === "gold")).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("ember blocks opponent trades on their next turn", () => {
    const state = makeMysticState();
    const player = current(state);
    const opponent = state.players[1];
    player.archive = [createCard("ember", mysticRuleset)];
    opponent.archive = Array.from({ length: 5 }, () => createCard("bronze", mysticRuleset));
    opponent.deck = [createCard("silver", mysticRuleset)];

    const result = performTrade(state, player, "trade_ember");
    expect(result.success).toBe(true);
    expect(result.detail.effectId).toBe("ember_next_turn_trade_block");
    expect(result.detail.tradeBlocked).toBe(true);
    expect(state.turnEffects.nextTurnTradeBlockedByPlayer[1]).toBe(true);

    prepareArchive(state);
    finalizeArchive(state);
    applyAction(state, { type: ActionTypes.START_TURN });

    expect(state.currentPlayer).toBe(1);
    expect(state.turnEffects.currentTradeBlockedByPlayer[1]).toBe(true);
    expect(canInitiateTrade(state, opponent, "trade_bronze")).toBe(false);

    prepareArchive(state);
    finalizeArchive(state);
    applyAction(state, { type: ActionTypes.START_TURN });
    expect(state.currentPlayer).toBe(0);
    expect(state.turnEffects.currentTradeBlockedByPlayer[1]).toBe(false);
  });

  it("disables target-based mystic trades when no opponent targets exist", () => {
    const state = makeMysticState();
    const player = current(state);
    player.archive = [
      createCard("amethyst", mysticRuleset),
      createCard("ash", mysticRuleset),
      createCard("ember", mysticRuleset),
    ];
    state.players[1].archive = [];
    state.players[1].hand = [];
    state.players[1].discard = [];

    expect(canInitiateTrade(state, player, "trade_amethyst")).toBe(false);
    expect(canInitiateTrade(state, player, "trade_ash")).toBe(false);
    expect(canInitiateTrade(state, player, "trade_ember")).toBe(true);
  });

  it("ingot counts as three bronze for bronze trades when chosen", () => {
    const state = makeMintedState();
    const player = current(state);
    player.archive = [
      createCard("ingot", mintedRuleset),
      createCard("bronze", mintedRuleset),
      createCard("bronze", mintedRuleset),
    ];
    player.deck = [createCard("silver", mintedRuleset)];

    const result = performTrade(state, player, "trade_bronze", {
      useEfficiency: true,
    });

    expect(result.success).toBe(true);
    expect(player.hand.some((card) => card.type === "silver")).toBe(true);
    expect(player.discard.filter((card) => card.type === "ingot")).toHaveLength(1);
  });

  it("sterling and ledger count toward silver trades when chosen", () => {
    const state = makeMintedState();
    const player = current(state);
    player.archive = [
      createCard("sterling", mintedRuleset),
      createCard("ledger", mintedRuleset),
      createCard("silver", mintedRuleset),
      createCard("silver", mintedRuleset),
    ];
    player.deck = [createCard("gold", mintedRuleset)];

    const result = performTrade(state, player, "trade_silver", {
      useEfficiency: true,
    });

    expect(result.success).toBe(true);
    expect(player.hand.some((card) => card.type === "gold")).toBe(true);
    expect(player.discard.filter((card) => card.type === "sterling")).toHaveLength(1);
  });

  it("does not auto-use efficiency cards without selection", () => {
    const state = makeMintedState();
    const player = current(state);
    player.archive = [
      createCard("ingot", mintedRuleset),
      createCard("bronze", mintedRuleset),
      createCard("bronze", mintedRuleset),
    ];
    player.deck = [createCard("silver", mintedRuleset)];

    expect(canTradeWithOptions(state, player, "trade_bronze")).toBe(false);
    expect(
      canTradeWithOptions(state, player, "trade_bronze", { useEfficiency: true })
    ).toBe(true);
  });

  it("mint trade restricts rewards to efficiency cards", () => {
    const state = makeMintedState();
    const player = current(state);
    player.archive = [createCard("mint", mintedRuleset), createCard("bronze", mintedRuleset)];
    player.deck = [
      createCard("ingot", mintedRuleset),
      createCard("sterling", mintedRuleset),
      createCard("ledger", mintedRuleset),
    ];

    const rejected = performTrade(state, player, "trade_mint", {
      choiceType: "bronze",
      rewardType: "bronze",
    });

    expect(rejected.success).toBe(false);

    const result = performTrade(state, player, "trade_mint", {
      choiceType: "bronze",
      rewardType: "ingot",
    });

    expect(result.success).toBe(true);
    expect(player.hand.some((card) => card.type === "ingot")).toBe(true);
  });

  it("hallmark archives efficiency cards from the deck", () => {
    const state = makeMintedState();
    const player = current(state);
    player.archive = [
      createCard("hallmark", mintedRuleset),
      createCard("bronze", mintedRuleset),
      createCard("silver", mintedRuleset),
    ];
    player.deck = [
      createCard("ingot", mintedRuleset),
      createCard("sterling", mintedRuleset),
      createCard("mint", mintedRuleset),
      createCard("bronze", mintedRuleset),
    ];

    const result = performTrade(state, player, "trade_hallmark");

    expect(result.success).toBe(true);
    expect(player.archive.filter((card) => card.type === "ingot")).toHaveLength(1);
    expect(player.archive.filter((card) => card.type === "sterling")).toHaveLength(1);
    expect(player.archive.filter((card) => card.type === "mint")).toHaveLength(1);
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
  it("prospector digs until the first non-bronze card", () => {
    const state = makeFoundryState();
    const player = current(state);
    player.archive = [
      createCard("prospector", foundryRuleset),
      createCard("bronze", foundryRuleset),
    ];
    player.deck = [
      createCard("gold", foundryRuleset),
      createCard("bronze", foundryRuleset),
      createCard("bronze", foundryRuleset),
    ];

    const result = performTrade(state, player, "trade_prospector");

    expect(result.success).toBe(true);
    expect(result.detail.rewardType).toBe("gold");
    expect(result.detail.digDiscardedCount).toBe(2);
    expect(player.hand.map((card) => card.type)).toContain("gold");
    expect(player.discard.map((card) => card.type)).toEqual([
      "prospector",
      "bronze",
      "bronze",
      "bronze",
    ]);
  });

  it("alloy can satisfy bronze and silver efficiency costs", () => {
    const bronzeState = makeFoundryState();
    const bronzePlayer = current(bronzeState);
    bronzePlayer.archive = [
      createCard("smelter", foundryRuleset),
      createCard("bronze", foundryRuleset),
      createCard("bronze", foundryRuleset),
      createCard("alloy", foundryRuleset),
    ];
    bronzePlayer.deck = [createCard("silver", foundryRuleset)];

    expect(
      canTradeWithOptions(bronzeState, bronzePlayer, "trade_smelter", { useEfficiency: true })
    ).toBe(true);
    const bronzeResult = performTrade(bronzeState, bronzePlayer, "trade_smelter", {
      useEfficiency: true,
    });
    expect(bronzeResult.success).toBe(true);
    expect(bronzePlayer.hand.some((card) => card.type === "silver")).toBe(true);

    const silverState = makeFoundryState();
    const silverPlayer = current(silverState);
    silverPlayer.archive = [
      createCard("refiner", foundryRuleset),
      createCard("silver", foundryRuleset),
      createCard("silver", foundryRuleset),
      createCard("alloy", foundryRuleset),
    ];
    silverPlayer.deck = [createCard("gold", foundryRuleset)];

    expect(
      canTradeWithOptions(silverState, silverPlayer, "trade_refiner", { useEfficiency: true })
    ).toBe(true);
    const silverResult = performTrade(silverState, silverPlayer, "trade_refiner", {
      useEfficiency: true,
    });
    expect(silverResult.success).toBe(true);
    expect(silverPlayer.hand.some((card) => card.type === "gold")).toBe(true);
  });

  it("assayer only tutors foundry rewards", () => {
    const state = makeFoundryState();
    const player = current(state);
    player.archive = [
      createCard("assayer", foundryRuleset),
      createCard("bronze", foundryRuleset),
    ];
    player.deck = [
      createCard("silver", foundryRuleset),
      createCard("alloy", foundryRuleset),
      createCard("refiner", foundryRuleset),
    ];

    expect(
      canTradeWithOptions(state, player, "trade_assayer", {
        choiceType: "bronze",
        rewardType: "refiner",
      })
    ).toBe(true);
    expect(
      canTradeWithOptions(state, player, "trade_assayer", {
        choiceType: "bronze",
        rewardType: "silver",
      })
    ).toBe(false);

    const result = performTrade(state, player, "trade_assayer", {
      choiceType: "bronze",
      rewardType: "refiner",
    });
    expect(result.success).toBe(true);
    expect(player.hand.some((card) => card.type === "refiner")).toBe(true);
  });

});
