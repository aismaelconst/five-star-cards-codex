import { describe, it, expect } from "vitest";
import { createInitialState, createPlayerState } from "../src/game/state.js";
import { createDeck, countCards, shuffle } from "../src/shared/utils.js";

describe("state", () => {
  it("creates a player with a full deck and empty zones", () => {
    const player = createPlayerState();
    expect(player.deck.length).toBe(155);
    expect(player.hand.length).toBe(0);
    expect(player.active.length).toBe(0);
    expect(player.archive.length).toBe(0);
    expect(player.discard.length).toBe(0);
  });

  it("creates an initial state with two players and defaults", () => {
    const state = createInitialState();
    expect(state.players.length).toBe(2);
    expect(state.currentPlayer).toBe(0);
    expect(state.tradesThisTurn).toBe(0);
    expect(state.phase).toBe("main");
    expect(state.winner).toBe(null);
    expect(state.turnCount).toBe(1);
    expect(state.pendingArchive).toBe(null);
  });
});

describe("utils", () => {
  it("createDeck builds correct counts", () => {
    const deck = createDeck();
    const counts = countCards(deck);
    expect(deck.length).toBe(155);
    expect(counts.gold).toBe(5);
    expect(counts.silver).toBe(25);
    expect(counts.bronze).toBe(125);
  });

  it("countCards tallies correctly", () => {
    const counts = countCards(["gold", "silver", "silver", "bronze"]);
    expect(counts).toEqual({ bronze: 1, silver: 2, gold: 1 });
  });

  it("shuffle preserves all items", () => {
    const list = ["a", "b", "c", "d", "e"];
    const shuffled = shuffle(list);
    expect(shuffled).toHaveLength(list.length);
    expect(shuffled.sort()).toEqual([...list].sort());
  });
});
