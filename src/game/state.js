import { createDeck } from "../shared/utils.js";

export function createPlayerState() {
  return {
    deck: createDeck(),
    hand: [],
    active: [],
    archive: [],
    discard: [],
  };
}

export function createInitialState() {
  return {
    players: [createPlayerState(), createPlayerState()],
    currentPlayer: 0,
    tradesThisTurn: 0,
    phase: "main",
    winner: null,
    turnCount: 1,
    pendingArchive: null,
  };
}
