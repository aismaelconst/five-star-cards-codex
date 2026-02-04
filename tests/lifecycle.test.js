import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/game/state.js";
import { startGame } from "../src/game/lifecycle.js";

function countHandSizes(state) {
  return state.players.map((player) => player.hand.length);
}

describe("game lifecycle", () => {
  it("starts game by drawing initial hands once", () => {
    const state = createInitialState();
    const didStart = startGame(state);
    expect(didStart).toBe(true);
    expect(countHandSizes(state)).toEqual([5, 5]);

    const didStartAgain = startGame(state);
    expect(didStartAgain).toBe(false);
    expect(countHandSizes(state)).toEqual([5, 5]);
  });
});
