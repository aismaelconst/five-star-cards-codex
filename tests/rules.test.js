import { describe, it, expect } from "vitest";
import {
  MAX_PLAYS,
  MAX_TRADES,
  canTrade,
  performTrade,
  playCard,
  playCardByType,
  prepareArchive,
  finalizeArchive,
  returnCard,
  returnAllCards,
} from "../src/game/rules.js";

function makeState() {
  return {
    players: [
      {
        deck: ["gold", "silver", "silver", "bronze", "bronze"],
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
    player.hand = Array.from({ length: MAX_PLAYS + 1 }, () => "bronze");

    for (let i = 0; i < MAX_PLAYS; i += 1) {
      expect(playCard(state, player, 0)).toBe(true);
    }

    expect(playCard(state, player, 0)).toBe(false);
    expect(player.active.length).toBe(MAX_PLAYS);
  });

  it("returns cards from active to hand", () => {
    const state = makeState();
    const player = current(state);
    player.hand = ["bronze"];
    playCard(state, player, 0);

    expect(player.active.length).toBe(1);
    expect(returnCard(state, player, 0)).toBe(true);
    expect(player.hand.length).toBe(1);
    expect(player.active.length).toBe(0);
  });

  it("returns all cards from active to hand", () => {
    const state = makeState();
    const player = current(state);
    player.hand = ["bronze", "silver"];
    playCard(state, player, 0);
    playCard(state, player, 0);

    expect(returnAllCards(state, player)).toBe(true);
    expect(player.active.length).toBe(0);
    expect(player.hand.length).toBe(2);
  });

  it("trades five bronze for a silver", () => {
    const state = makeState();
    const player = current(state);
    player.archive = ["bronze", "bronze", "bronze", "bronze", "bronze"];

    expect(canTrade(state, player, "bronze")).toBe(true);
    expect(performTrade(state, player, "bronze")).toBe(true);
    expect(state.tradesThisTurn).toBe(1);
    expect(player.discard.length).toBe(5);
    expect(player.hand).toContain("silver");
  });

  it("respects MAX_TRADES per turn", () => {
    const state = makeState();
    const player = current(state);
    player.archive = Array.from({ length: 25 }, () => "bronze");
    player.deck = ["silver", "silver", "silver", "silver", "silver", "silver"];

    for (let i = 0; i < MAX_TRADES; i += 1) {
      expect(performTrade(state, player, "bronze")).toBe(true);
    }
    expect(canTrade(state, player, "bronze")).toBe(false);
  });

  it("prepareArchive creates pending archive and draw count", () => {
    const state = makeState();
    const player = current(state);
    player.active = ["bronze", "silver", "gold"];

    const pending = prepareArchive(state);
    expect(pending).not.toBeNull();
    expect(pending.drawCount).toBe(1 + 2 + 3);
    expect(state.phase).toBe("confirm");
  });

  it("finalizeArchive moves cards, draws, and advances turn", () => {
    const state = makeState();
    const player = current(state);
    player.active = ["bronze", "bronze"];
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
    player.active = ["gold", "gold", "gold", "gold", "gold"];
    prepareArchive(state);

    const result = finalizeArchive(state);
    expect(result.winnerIndex).toBe(0);
  });

  it("playCardByType plays a card of that type", () => {
    const state = makeState();
    const player = current(state);
    player.hand = ["bronze", "silver", "bronze"];

    expect(playCardByType(state, player, "silver")).toBe(true);
    expect(player.active).toContain("silver");
    expect(player.hand.length).toBe(2);
  });
});
