import { describe, it, expect } from "vitest";
import { createInitialState, createPlayerState } from "../src/game/state.js";
import { createDeck, createCard } from "../src/game/cards.js";
import {
  baseRuleset,
  expandedRuleset,
  ancientRuleset,
  mintedRuleset,
} from "../src/game/ruleset.js";
import { countCards, generateRoomCode, shuffle } from "../src/shared/utils.js";

describe("state", () => {
  it("creates a player with a full deck and empty zones", () => {
    const player = createPlayerState(baseRuleset, "player-test");
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
    expect(state.mode).toBe(null);
    expect(state.format).toBe("core");
    expect(state.cpu).toEqual({ difficulty: null });
    expect(state.online).toEqual({
      roomId: null,
      role: null,
      status: null,
      playerName: null,
      playerId: null,
      connection: "disconnected",
    });
    expect(state.players[0].name).toBe("Player 1");
    expect(state.players[1].name).toBe("Player 2");
  });

  it("creates an expanded state with larger deck", () => {
    const state = createInitialState({ format: "expanded" });
    expect(state.format).toBe("expanded");
    expect(state.players[0].deck.length).toBe(180);
  });

  it("creates an ancient state with ancients expansion", () => {
    const state = createInitialState({ format: "ancient" });
    expect(state.format).toBe("ancient");
    expect(state.players[0].deck.length).toBe(180);
  });

  it("creates a minted state with minted expansion", () => {
    const state = createInitialState({ format: "minted" });
    expect(state.format).toBe("minted");
    expect(state.players[0].deck.length).toBe(180);
  });
});

describe("utils", () => {
  it("createCard includes type, tier, and draw", () => {
    const card = createCard("silver", baseRuleset);
    expect(card.type).toBe("silver");
    expect(card.tier).toBe("silver");
    expect(card.draw).toBe(2);
    expect(card.id).toBeTruthy();
  });

  it("baseRuleset has expected defaults", () => {
    expect(baseRuleset.maxPlays).toBe(5);
    expect(baseRuleset.maxTrades).toBe(5);
    expect(baseRuleset.winCondition.goldInArchive).toBe(5);
  });

  it("createDeck builds correct counts", () => {
    const deck = createDeck(baseRuleset);
    const counts = countCards(deck);
    expect(deck.length).toBe(155);
    expect(counts.gold).toBe(5);
    expect(counts.silver).toBe(25);
    expect(counts.bronze).toBe(125);
  });

  it("createDeck builds expanded counts", () => {
    const deck = createDeck(expandedRuleset);
    const counts = countCards(deck, expandedRuleset.displayOrder);
    expect(deck.length).toBe(180);
    expect(counts.wood).toBe(5);
    expect(counts.ruby).toBe(5);
    expect(counts.emerald).toBe(5);
    expect(counts.sapphire).toBe(5);
    expect(counts.platinum).toBe(5);
  });

  it("createDeck builds ancient counts", () => {
    const deck = createDeck(ancientRuleset);
    const counts = countCards(deck, ancientRuleset.displayOrder);
    expect(deck.length).toBe(180);
    expect(counts.turquoise).toBe(5);
    expect(counts.lapis_lazuli).toBe(5);
    expect(counts.carnelian).toBe(5);
    expect(counts.electrum).toBe(5);
    expect(counts.copper).toBe(5);
  });

  it("createDeck builds minted counts", () => {
    const deck = createDeck(mintedRuleset);
    const counts = countCards(deck, mintedRuleset.displayOrder);
    expect(deck.length).toBe(180);
    expect(counts.ingot).toBe(5);
    expect(counts.sterling).toBe(5);
    expect(counts.ledger).toBe(5);
    expect(counts.mint).toBe(5);
    expect(counts.hallmark).toBe(5);
  });

  it("countCards tallies correctly", () => {
    const counts = countCards(["gold", "silver", "silver", "bronze"]);
    expect(counts).toEqual({ bronze: 1, silver: 2, gold: 1 });
  });

  it("countCards tallies card objects correctly", () => {
    const cards = [
      createCard("gold", baseRuleset),
      createCard("silver", baseRuleset),
      createCard("silver", baseRuleset),
    ];
    const counts = countCards(cards);
    expect(counts).toEqual({ bronze: 0, silver: 2, gold: 1 });
  });

  it("shuffle preserves all items", () => {
    const list = ["a", "b", "c", "d", "e"];
    const shuffled = shuffle(list);
    expect(shuffled).toHaveLength(list.length);
    expect(shuffled.sort()).toEqual([...list].sort());
  });

  it("generateRoomCode creates expected length and charset", () => {
    const code = generateRoomCode(6);
    expect(code).toHaveLength(6);
    expect(/^[A-Z2-9]+$/.test(code)).toBe(true);
  });
});
