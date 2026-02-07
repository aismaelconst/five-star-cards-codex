import { describe, it, expect } from "vitest";
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
    cpu.archive = ["silver", "silver", "silver", "silver", "wood"];
    cpu.deck = ["gold"];

    executeCpuTurn(state, { difficulty: "hard", cpuIndex: 1 });

    const discardCounts = countCards(cpu.discard, state.ruleset.displayOrder);
    const archiveCounts = countCards(cpu.archive, state.ruleset.displayOrder);
    expect(discardCounts.wood).toBe(1);
    expect(discardCounts.silver).toBe(4);
    expect(archiveCounts.gold).toBe(1);
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
});
