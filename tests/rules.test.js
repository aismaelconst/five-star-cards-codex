import { describe, it, expect } from "vitest";
import { baseRuleset } from "../src/game/ruleset.js";
import { createCard } from "../src/game/cards.js";
import {
  ActionTypes,
  applyAction,
  canTrade,
  finalizeArchive,
  performTrade,
  playCard,
  playCardByType,
  prepareArchive,
  returnAllCards,
  returnCard,
} from "../src/game/rules.js";

function makeState() {
  return {
    players: [
      {
        deck: [
          createCard("gold", baseRuleset),
          createCard("silver", baseRuleset),
          createCard("silver", baseRuleset),
          createCard("bronze", baseRuleset),
          createCard("bronze", baseRuleset),
        ],
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
    ruleset: baseRuleset,
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
    player.hand = Array.from({ length: baseRuleset.maxPlays + 1 }, () =>
      createCard("bronze", baseRuleset)
    );

    for (let i = 0; i < baseRuleset.maxPlays; i += 1) {
      expect(playCard(state, player, 0)).toBe(true);
    }

    expect(playCard(state, player, 0)).toBe(false);
    expect(player.active.length).toBe(baseRuleset.maxPlays);
  });

  it("returns cards from active to hand", () => {
    const state = makeState();
    const player = current(state);
    player.hand = [createCard("bronze", baseRuleset)];
    playCard(state, player, 0);

    expect(player.active.length).toBe(1);
    expect(returnCard(state, player, 0)).toBe(true);
    expect(player.hand.length).toBe(1);
    expect(player.active.length).toBe(0);
  });

  it("returns all cards from active to hand", () => {
    const state = makeState();
    const player = current(state);
    player.hand = [createCard("bronze", baseRuleset), createCard("silver", baseRuleset)];
    playCard(state, player, 0);
    playCard(state, player, 0);

    expect(returnAllCards(state, player)).toBe(true);
    expect(player.active.length).toBe(0);
    expect(player.hand.length).toBe(2);
  });

  it("trades five bronze for a silver", () => {
    const state = makeState();
    const player = current(state);
    player.archive = Array.from({ length: 5 }, () => createCard("bronze", baseRuleset));

    expect(canTrade(state, player, "bronze")).toBe(true);
    expect(performTrade(state, player, "bronze")).toBe(true);
    expect(state.tradesThisTurn).toBe(1);
    expect(player.discard.length).toBe(5);
    expect(player.hand.some((card) => card.type === "silver")).toBe(true);
  });

  it("respects MAX_TRADES per turn", () => {
    const state = makeState();
    const player = current(state);
    player.archive = Array.from({ length: 25 }, () => createCard("bronze", baseRuleset));
    player.deck = Array.from({ length: 6 }, () => createCard("silver", baseRuleset));

    for (let i = 0; i < baseRuleset.maxTrades; i += 1) {
      expect(performTrade(state, player, "bronze")).toBe(true);
    }
    expect(canTrade(state, player, "bronze")).toBe(false);
  });

  it("prepareArchive creates pending archive and draw count", () => {
    const state = makeState();
    const player = current(state);
    player.active = [
      createCard("bronze", baseRuleset),
      createCard("silver", baseRuleset),
      createCard("gold", baseRuleset),
    ];

    const pending = prepareArchive(state);
    expect(pending).not.toBeNull();
    expect(pending.drawCount).toBe(1 + 2 + 3);
    expect(state.phase).toBe("confirm");
  });

  it("finalizeArchive moves cards, draws, and advances turn", () => {
    const state = makeState();
    const player = current(state);
    player.active = [
      createCard("bronze", baseRuleset),
      createCard("bronze", baseRuleset),
    ];
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
    player.active = Array.from({ length: 5 }, () => createCard("gold", baseRuleset));
    prepareArchive(state);

    const result = finalizeArchive(state);
    expect(result.winnerIndex).toBe(0);
  });

  it("playCardByType plays a card of that type", () => {
    const state = makeState();
    const player = current(state);
    player.hand = [
      createCard("bronze", baseRuleset),
      createCard("silver", baseRuleset),
      createCard("bronze", baseRuleset),
    ];

    expect(playCardByType(state, player, "silver")).toBe(true);
    expect(player.active.some((card) => card.type === "silver")).toBe(true);
    expect(player.hand.length).toBe(2);
  });

  it("applyAction routes start turn and cancel archive", () => {
    const state = makeState();
    state.phase = "between";
    applyAction(state, { type: ActionTypes.START_TURN });
    expect(state.phase).toBe("main");

    state.phase = "confirm";
    state.pendingArchive = { playedCards: [], drawCount: 0, playerIndex: 0 };
    applyAction(state, { type: ActionTypes.CANCEL_ARCHIVE });
    expect(state.phase).toBe("main");
    expect(state.pendingArchive).toBe(null);
  });
});
