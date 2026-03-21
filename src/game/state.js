import { shuffle } from "../shared/utils.js";
import { createDeck } from "./cards.js";
import {
  baseRuleset,
  expandedRuleset,
  ancientRuleset,
  mysticRuleset,
} from "./ruleset.js";

function createTurnEffects(playerCount) {
  return {
    currentPlayBonusByPlayer: Array.from({ length: playerCount }, () => 0),
    currentPlayPenaltyByPlayer: Array.from({ length: playerCount }, () => 0),
    nextTurnPlayPenaltyByPlayer: Array.from({ length: playerCount }, () => 0),
    currentTradeBlockedByPlayer: Array.from({ length: playerCount }, () => false),
    nextTurnTradeBlockedByPlayer: Array.from({ length: playerCount }, () => false),
    usedTradeRecipesByPlayer: Array.from({ length: playerCount }, () => ({})),
  };
}

export function createPlayerState(ruleset, playerId, name) {
  return {
    id: playerId,
    name,
    deck: shuffle(createDeck(ruleset)),
    hand: [],
    active: [],
    archive: [],
    discard: [],
  };
}

export function createInitialState(options = {}) {
  const requestedFormat = options.format ?? "core";
  const format =
    requestedFormat === "expanded" ||
    requestedFormat === "ancient" ||
    requestedFormat === "mystic" ||
    requestedFormat === "core"
      ? requestedFormat
      : "core";
  const ruleset =
    options.ruleset ??
    (format === "expanded"
      ? expandedRuleset
      : format === "ancient"
        ? ancientRuleset
        : format === "mystic"
          ? mysticRuleset
        : baseRuleset);
  const gameId = options.gameId ?? `game-${Date.now()}`;
  const playerIds = options.playerIds ?? ["player-1", "player-2"];
  const playerNames = options.playerNames ?? ["Player 1", "Player 2"];
  const mode = options.mode ?? null;
  return {
    gameId,
    ruleset,
    format,
    mode,
    cpu: {
      difficulty: null,
    },
    online: {
      roomId: null,
      role: null,
      status: null,
      playerName: null,
      playerId: null,
      connection: "disconnected",
    },
    players: [
      createPlayerState(ruleset, playerIds[0], playerNames[0]),
      createPlayerState(ruleset, playerIds[1], playerNames[1]),
    ],
    currentPlayer: 0,
    tradesThisTurn: 0,
    phase: "main",
    winner: null,
    turnCount: 1,
    pendingArchive: null,
    turnEffects: createTurnEffects(playerIds.length),
  };
}
