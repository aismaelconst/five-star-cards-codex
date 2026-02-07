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

  it("hard picks gem set over bronze trade", () => {
    const state = createInitialState({
      mode: "cpu",
      format: "expanded",
      playerNames: ["You", "CPU"],
    });
    state.currentPlayer = 1;
    state.cpu = { difficulty: "hard" };
    const cpu = state.players[1];
    cpu.archive = [
      "ruby",
      "emerald",
      "sapphire",
      "bronze",
      "bronze",
      "bronze",
      "bronze",
      "bronze",
    ];
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
});
