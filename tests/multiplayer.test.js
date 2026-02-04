import { describe, it, expect } from "vitest";
import { baseRuleset } from "../src/game/ruleset.js";
import { createInitialState } from "../src/game/state.js";
import { createCard } from "../src/game/cards.js";
import {
  getPlayerIndexById,
  isPlayersTurn,
  sanitizeStateForPlayer,
  countHandByType,
} from "../src/game/multiplayer.js";

describe("multiplayer helpers", () => {
  it("finds player index by id", () => {
    const state = createInitialState({
      playerIds: ["p1", "p2"],
      ruleset: baseRuleset,
    });
    expect(getPlayerIndexById(state, "p2")).toBe(1);
  });

  it("checks turn ownership", () => {
    const state = createInitialState({
      playerIds: ["p1", "p2"],
      ruleset: baseRuleset,
    });
    expect(isPlayersTurn(state, "p1")).toBe(true);
    expect(isPlayersTurn(state, "p2")).toBe(false);
  });

  it("sanitizes opponent hand", () => {
    const state = createInitialState({
      playerIds: ["p1", "p2"],
      ruleset: baseRuleset,
    });
    state.players[1].hand = [createCard("gold", baseRuleset)];

    const view = sanitizeStateForPlayer(state, "p1");
    expect(view.players[0].hand.length).toBe(0);
    expect(view.players[1].hand[0].type).toBe("unknown");
  });

  it("counts hand by type", () => {
    const hand = [
      createCard("bronze", baseRuleset),
      createCard("silver", baseRuleset),
      createCard("silver", baseRuleset),
    ];
    expect(countHandByType(hand)).toEqual({ bronze: 1, silver: 2, gold: 0 });
  });
});
