import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/game/state.js";
import { initializeOnlineGame } from "../src/game/online.js";

describe("online game init", () => {
  it("draws initial hands once", () => {
    const state = createInitialState({ mode: "online" });
    const didStart = initializeOnlineGame(state);
    expect(didStart).toBe(true);
    expect(state.players[0].hand.length).toBe(5);
    expect(state.players[1].hand.length).toBe(5);

    const didStartAgain = initializeOnlineGame(state);
    expect(didStartAgain).toBe(false);
    expect(state.players[0].hand.length).toBe(5);
  });
});
