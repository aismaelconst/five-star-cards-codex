import { shuffle } from "../shared/utils.js";
import { createDeck } from "./cards.js";
import { getRulesetForFormat, resolveFormat } from "./ruleset.js";

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

export function getPlayerFormat(state, playerIndex = state.currentPlayer ?? 0) {
  if (playerIndex === 0) {
    return resolveFormat(state.format ?? state.formatsByPlayer?.[0] ?? "core");
  }
  if (Array.isArray(state.formatsByPlayer) && state.formatsByPlayer[playerIndex]) {
    return resolveFormat(state.formatsByPlayer[playerIndex]);
  }
  return resolveFormat(state.format ?? "core");
}

export function getPlayerRuleset(state, playerIndex = state.currentPlayer ?? 0) {
  const playerFormat = getPlayerFormat(state, playerIndex);
  const playerZeroFormat = getPlayerFormat(state, 0);
  if (playerIndex === 0) {
    return state.ruleset ?? getRulesetForFormat(playerFormat);
  }
  if (playerFormat === playerZeroFormat) {
    return state.ruleset ?? getRulesetForFormat(playerFormat);
  }
  return getRulesetForFormat(playerFormat);
}

export function createInitialState(options = {}) {
  const format = resolveFormat(options.format ?? "core");
  const cpuFormat = resolveFormat(options.cpuFormat ?? format);
  const ruleset = options.ruleset ?? getRulesetForFormat(format);
  const gameId = options.gameId ?? `game-${Date.now()}`;
  const playerIds = options.playerIds ?? ["player-1", "player-2"];
  const playerNames = options.playerNames ?? ["Player 1", "Player 2"];
  const mode = options.mode ?? null;
  const formatsByPlayer = playerIds.map((_, index) => {
    if (mode === "cpu" && index === 1) {
      return cpuFormat;
    }
    return format;
  });
  const rulesetsByPlayer = playerIds.map((_, index) => {
    if (index === 0) return ruleset;
    if (formatsByPlayer[index] === format) return ruleset;
    return getRulesetForFormat(formatsByPlayer[index]);
  });
  return {
    gameId,
    ruleset,
    format,
    formatsByPlayer,
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
      createPlayerState(rulesetsByPlayer[0], playerIds[0], playerNames[0]),
      createPlayerState(rulesetsByPlayer[1], playerIds[1], playerNames[1]),
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
