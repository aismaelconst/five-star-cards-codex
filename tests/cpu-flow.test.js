import { describe, it, expect, vi } from "vitest";
import { createCpuFlow } from "../src/ui/handlers/cpu-flow.js";

describe("cpu-flow", () => {
  it("shows a summary when CPU takes no actions", () => {
    const state = {
      mode: "cpu",
      currentPlayer: 1,
      phase: "main",
      ruleset: { displayOrder: ["bronze", "silver", "gold"] },
      cpu: { difficulty: "easy" },
    };
    const elements = {
      cpuTurnOverlay: Object.assign(document.createElement("div"), { hidden: true }),
      cpuTurnSummary: document.createElement("div"),
    };
    const render = vi.fn();
    const executeCpuTurn = vi.fn(() => ({
      trades: [],
      plays: [],
      archive: null,
      winnerIndex: null,
    }));

    const cpuFlow = createCpuFlow({
      state,
      elements,
      onWinner: vi.fn(),
      render,
      executeCpuTurn,
      countCards: vi.fn(),
      formatPoolCostLine: () => null,
      formatPlatinumMessage: () => "",
      applyAction: vi.fn(),
      ActionTypes: { START_TURN: "start_turn" },
    });

    cpuFlow.maybeRunCpuTurn();

    expect(elements.cpuTurnOverlay.hidden).toBe(false);
    expect(elements.cpuTurnSummary.textContent).toContain("CPU took no actions.");
  });
});
