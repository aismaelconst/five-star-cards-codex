import { describe, it, expect, vi } from "vitest";
import { createInitialState } from "../src/game/state.js";
import { executeCpuTurn } from "../src/game/cpu.js";
import { countCards } from "../src/shared/utils.js";

describe("cpu", () => {
  it("uses wood substitution for hard silver trades", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["gold", "gold", "gold", "gold", "silver", "silver", "silver", "silver", "wood"];
    cpu.deck = ["gold"];

    executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    const discardCounts = countCards(cpu.discard, state.ruleset.displayOrder);
    const archiveCounts = countCards(cpu.archive, state.ruleset.displayOrder);
    expect(discardCounts.wood).toBe(1);
    expect(discardCounts.silver).toBe(4);
    expect(archiveCounts.gold).toBe(5);
  });

  it("does not use wood for medium silver trades without base cost", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "medium" };
    const cpu = state.players[1];
    cpu.archive = ["silver", "silver", "silver", "silver", "wood"];
    cpu.deck = ["gold"];

    executeCpuTurn(state, { difficulty: "medium", cpuIndex: 1 });

    const discardCounts = countCards(cpu.discard, state.ruleset.displayOrder);
    const archiveCounts = countCards(cpu.archive, state.ruleset.displayOrder);
    expect(discardCounts.wood ?? 0).toBe(0);
    expect(archiveCounts.gold ?? 0).toBe(0);
  });

  it("tutors gold from gem trade on medium difficulty", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "medium" };
    const cpu = state.players[1];
    cpu.archive = ["ruby", "emerald", "sapphire"];
    cpu.deck = ["gold", "silver"];

    executeCpuTurn(state, { difficulty: "medium", cpuIndex: 1 });

    const archiveCounts = countCards(cpu.archive, state.ruleset.displayOrder);
    expect(archiveCounts.gold).toBe(1);
  });

  it("easy cpu avoids zero-draw cards when playing", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "easy" };
    const cpu = state.players[1];
    cpu.hand = ["wood", "bronze"];

    executeCpuTurn(state, { difficulty: "easy", cpuIndex: 1 });

    const archiveCounts = countCards(cpu.archive, state.ruleset.displayOrder);
    expect(archiveCounts.bronze).toBe(1);
    expect(archiveCounts.wood ?? 0).toBe(0);
  });

  it("cpu uses ancients archive trade in ancient format", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "ancient",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "easy" };
    const cpu = state.players[1];
    cpu.archive = ["turquoise", "carnelian"];
    cpu.deck = ["bronze", "silver"];

    const summary = executeCpuTurn(state, { difficulty: "easy", cpuIndex: 1 });

    expect(summary.trades[0].recipeId).toBe("trade_ancients_archive");
    expect(summary.trades[0].rewardType).toBe("silver");
  });

  it("cpu does not attempt shelved electrum trade in ancient format", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "ancient",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "easy" };
    const cpu = state.players[1];
    cpu.archive = ["electrum", "copper"];
    cpu.hand = [
      "copper",
      "turquoise",
      ...Array.from({ length: 10 }, () => "bronze"),
    ];

    const summary = executeCpuTurn(state, { difficulty: "easy", cpuIndex: 1 });

    expect(summary.trades.some((trade) => trade.recipeId === "trade_electrum_draw")).toBe(false);
  });

  it("cpu uses pearl in mystic format when hand exceeds play cap", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "mystic",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "easy" };
    const cpu = state.players[1];
    const opponent = state.players[0];
    cpu.archive = ["pearl"];
    cpu.hand = ["bronze", "bronze", "bronze", "bronze", "bronze", "bronze"];
    opponent.hand = ["bronze"];

    const summary = executeCpuTurn(state, { difficulty: "easy", cpuIndex: 1 });

    expect(summary.trades[0].recipeId).toBe("trade_pearl");
    expect(summary.trades[0].effectId).toBe("pearl_extra_play");
    expect(summary.trades[0].playLimit).toBe(6);
  });

  it("cpu amethyst picks gold first from opponent archive", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "mystic",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "medium" };
    const cpu = state.players[1];
    const opponent = state.players[0];
    cpu.archive = ["amethyst"];
    opponent.archive = ["silver", "gold", "bronze"];
    opponent.deck = [];

    const summary = executeCpuTurn(state, { difficulty: "medium", cpuIndex: 1 });

    expect(summary.trades[0].recipeId).toBe("trade_amethyst");
    expect(summary.trades[0].targetType).toBe("gold");
    expect(summary.trades[0].movedTypes).toEqual(["gold"]);
  });

  it("cpu skips ash when opponent hand is empty", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "mystic",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "easy" };
    const cpu = state.players[1];
    const opponent = state.players[0];
    cpu.archive = ["ash"];
    opponent.hand = [];

    const summary = executeCpuTurn(state, { difficulty: "easy", cpuIndex: 1 });

    expect(summary.trades.some((trade) => trade.recipeId === "trade_ash")).toBe(false);
  });

  it("cpu uses ember when opponent discard has cards", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const state = createInitialState({
        mode: "cpu",
        format: "mystic",
        playerNames: ["You", "CPU"],
      });
      state.currentPlayer = 1;
      state.cpu = { difficulty: "easy" };
      const cpu = state.players[1];
      const opponent = state.players[0];
      cpu.archive = ["ember"];
      opponent.discard = ["gold", "silver"];
      opponent.deck = [];

      const summary = executeCpuTurn(state, { difficulty: "easy", cpuIndex: 1 });

      expect(summary.trades[0].recipeId).toBe("trade_ember");
      expect(summary.trades[0].movedCount).toBe(2);
      expect(summary.trades[0].movedTypes).toHaveLength(2);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("cpu falls back to core when minted format is requested", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "minted",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "easy" };
    const cpu = state.players[1];
    cpu.archive = ["mint", "bronze"];
    cpu.deck = ["ingot"];

    const summary = executeCpuTurn(state, { difficulty: "easy", cpuIndex: 1 });

    expect(state.format).toBe("core");
    expect(summary.trades.some((trade) => trade.recipeId === "trade_mint")).toBe(false);
  });

  it("cpu avoids playing the last zero-draw card when it would empty the hand", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "medium" };
    const cpu = state.players[1];
    cpu.archive = [];
    cpu.hand = ["wood"];
    cpu.deck = ["bronze"];

    const summary = executeCpuTurn(state, { difficulty: "medium", cpuIndex: 1 });

    expect(summary.plays.length).toBe(0);
    expect(cpu.hand.length).toBe(1);
  });

  it("hard uses gem set when bronze trade is unavailable", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["ruby", "emerald", "sapphire", "bronze", "bronze", "bronze", "bronze"];
    cpu.deck = ["gold"];

    executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    const discardCounts = countCards(cpu.discard, state.ruleset.displayOrder);
    expect(discardCounts.ruby).toBe(1);
    expect(discardCounts.emerald).toBe(1);
    expect(discardCounts.sapphire).toBe(1);
  });

  it("hard plays gem to complete set", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["emerald", "sapphire"];
    cpu.hand = ["ruby", "bronze"];

    const summary = executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    expect(summary.plays).toContain("ruby");
  });

  it("hard picks best tutor reward", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["ruby", "emerald", "sapphire"];
    cpu.deck = ["silver", "gold"];

    executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    const archiveCounts = countCards(cpu.archive, state.ruleset.displayOrder);
    expect(archiveCounts.gold).toBe(1);
  });

  it("hard considers platinum dig expected value", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["platinum", "bronze", "silver"];
    cpu.deck = ["bronze", "silver", "gold"];

    executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    const discardCounts = countCards(cpu.discard, state.ruleset.displayOrder);
    expect(discardCounts.platinum).toBe(1);
    expect(discardCounts.bronze).toBe(1);
    expect(discardCounts.silver).toBe(1);
  });

  it("hard always trades silver to gold when possible", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["silver", "silver", "silver", "silver", "silver"];
    cpu.deck = ["gold"];

    executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    const discardCounts = countCards(cpu.discard, state.ruleset.displayOrder);
    const archiveCounts = countCards(cpu.archive, state.ruleset.displayOrder);
    expect(discardCounts.silver).toBe(5);
    expect(archiveCounts.gold).toBe(1);
  });

  it("hard always trades bronze to silver when possible", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "core",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["bronze", "bronze", "bronze", "bronze", "bronze"];
    cpu.deck = ["silver"];

    executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    const discardCounts = countCards(cpu.discard, state.ruleset.displayOrder);
    const archiveCounts = countCards(cpu.archive, state.ruleset.displayOrder);
    expect(discardCounts.bronze).toBe(5);
    expect(archiveCounts.silver).toBe(1);
  });

  it("hard uses wood substitution for gem trade when base is missing", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["emerald", "sapphire", "wood"];
    cpu.deck = ["gold"];

    const summary = executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    expect(summary.trades[0].useWood).toBe(true);
    expect(summary.trades[0].recipeId).toBe("trade_gem_set");
  });

  it("hard scores string reward trades in custom ruleset", () => {
    const customRuleset = {
      ...createInitialState().ruleset,
      tradeRecipes: {
        trade_custom: {
          cost: { bronze: 2 },
          reward: "silver",
        },
      },
    };
    const state = createInitialState({
      mode: "cpu",
      ruleset: customRuleset,
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["bronze", "bronze"];
    cpu.deck = ["silver"];

    executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    const discardCounts = countCards(cpu.discard, ["bronze", "silver"]);
    expect(discardCounts.bronze).toBe(2);
  });

  it("hard tie-breaks by recipe id for equal scores", () => {
    const customRuleset = {
      ...createInitialState().ruleset,
      tradeRecipes: {
        trade_alpha: {
          cost: { bronze: 2 },
          reward: "silver",
        },
        trade_beta: {
          cost: { bronze: 1, wood: 2 },
          reward: "silver",
        },
      },
      cardTypes: {
        ...createInitialState().ruleset.cardTypes,
        wood: { tier: "wood", draw: 0 },
      },
      deckCounts: {
        bronze: 125,
        silver: 25,
        gold: 5,
        wood: 5,
      },
      displayOrder: ["bronze", "silver", "gold", "wood"],
      woodSubstitution: {
        allow: true,
        minCost: 3,
        maxPerTrade: 1,
      },
    };
    const state = createInitialState({
      mode: "cpu",
      ruleset: customRuleset,
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["bronze", "bronze", "wood", "wood"];
    cpu.deck = ["silver"];

    const summary = executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    expect(summary.trades[0].recipeId).toBe("trade_alpha");
  });

  it("hard tie-breaks to non-wood payload on equal score", () => {
    const customRuleset = {
      ...createInitialState().ruleset,
      tradeRecipes: {
        trade_wood: {
          cost: { wood: 1, bronze: 1 },
          reward: "silver",
        },
      },
      cardTypes: {
        ...createInitialState().ruleset.cardTypes,
        wood: { tier: "wood", draw: 0 },
      },
      deckCounts: {
        bronze: 125,
        silver: 25,
        gold: 5,
        wood: 5,
      },
      displayOrder: ["bronze", "silver", "gold", "wood"],
      woodSubstitution: {
        allow: true,
        minCost: 3,
        maxPerTrade: 1,
      },
    };
    const state = createInitialState({
      mode: "cpu",
      ruleset: customRuleset,
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["bronze", "wood"];
    cpu.deck = ["silver"];

    const summary = executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    expect(summary.trades[0].useWood).toBe(false);
  });

  it("hard tie-breaks by substitute type when scores match", () => {
    const customRuleset = {
      ...createInitialState({ format: "expanded" }).ruleset,
      tradeRecipes: {
        trade_gem: {
          cost: { ruby: 1, emerald: 1, wood: 1 },
          reward: "gold",
        },
      },
    };
    const state = createInitialState({
      mode: "cpu",
      ruleset: customRuleset,
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["ruby", "emerald", "wood", "wood"];
    cpu.deck = ["gold"];

    const summary = executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    expect(summary.trades[0].useWood).toBe(true);
    expect(summary.trades[0].substituteType).toBe("emerald");
  });

  it("hard prefers platinum to complete a set", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = ["bronze", "silver"];
    cpu.hand = ["platinum", "bronze"];

    const summary = executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    expect(summary.plays).toContain("platinum");
  });

  it("hard plays wood when only wood is available", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.hand = ["wood"];

    const summary = executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    expect(summary.plays).toEqual([]);
    expect(cpu.hand.length).toBe(1);
  });

  it("hard tie-breaks play order deterministically", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.hand = ["ruby", "emerald"];

    const summary = executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    expect(summary.plays).toEqual(["emerald"]);
  });

  it("starts cpu turn from between phase", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "core",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.phase = "between";
    state.cpu = { difficulty: "hard" };

    const summary = executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    expect(summary).toBeTruthy();
  });
});
