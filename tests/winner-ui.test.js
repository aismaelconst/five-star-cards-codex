import { describe, it, expect } from "vitest";
import { updateWinnerOverlay } from "../src/ui/winner.js";

describe("ui/winner", () => {
  it("shows winner stats in the modal", () => {
    const state = {
      players: [
        { name: "Ava", deck: Array.from({ length: 7 }, () => "bronze") },
        { name: "Bo", deck: [] },
      ],
      turnCount: 9,
    };
    const elements = {
      winnerText: document.createElement("div"),
      winnerModalText: document.createElement("div"),
      winnerModalMessage: document.createElement("div"),
      winnerStats: document.createElement("div"),
      restartGameModal: document.createElement("button"),
      winnerOverlay: document.createElement("div"),
    };

    updateWinnerOverlay(state, elements, 0);

    expect(elements.winnerText.textContent).toContain("Ava wins!");
    expect(elements.winnerStats.textContent).toContain("Deck left: 7");
    expect(elements.winnerStats.textContent).toContain("Turn: 9");
  });
});
