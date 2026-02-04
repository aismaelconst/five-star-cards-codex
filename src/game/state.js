import { shuffle } from "../shared/utils.js";
import { createDeck } from "./cards.js";
import { baseRuleset } from "./ruleset.js";

export function createPlayerState(ruleset, playerId) {
  return {
    id: playerId,
    deck: shuffle(createDeck(ruleset)),
    hand: [],
    active: [],
    archive: [],
    discard: [],
  };
}

export function createInitialState(options = {}) {
  const ruleset = options.ruleset ?? baseRuleset;
  const gameId = options.gameId ?? `game-${Date.now()}`;
  const playerIds = options.playerIds ?? ["player-1", "player-2"];
  const mode = options.mode ?? null;
  return {
    gameId,
    ruleset,
    mode,
    online: {
      roomId: null,
      role: null,
      status: null,
      playerName: null,
      playerId: null,
      connection: "disconnected",
    },
    players: [
      createPlayerState(ruleset, playerIds[0]),
      createPlayerState(ruleset, playerIds[1]),
    ],
    currentPlayer: 0,
    tradesThisTurn: 0,
    phase: "main",
    winner: null,
    turnCount: 1,
    pendingArchive: null,
  };
}
