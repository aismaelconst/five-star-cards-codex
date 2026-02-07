import { countCards } from "../shared/utils.js";
import {
  ActionTypes,
  applyAction,
  canTradeWithOptions,
  getWoodSubstitutionOptions,
} from "./rules.js";

const EASY_TRADE_PRIORITY = [
  "trade_silver",
  "trade_bronze",
  "trade_gem_set",
  "trade_platinum",
];
const MEDIUM_TRADE_PRIORITY = [
  "trade_silver",
  "trade_gem_set",
  "trade_platinum",
  "trade_bronze",
];
const HARD_TRADE_PRIORITY = MEDIUM_TRADE_PRIORITY;

const EASY_PLAY_PRIORITY = ["gold", "silver", "bronze"];
const MEDIUM_PLAY_PRIORITY = [
  "gold",
  "silver",
  "bronze",
  "ruby",
  "emerald",
  "sapphire",
  "platinum",
  "wood",
];
const HARD_PLAY_PRIORITY = MEDIUM_PLAY_PRIORITY;

const HARD_WOOD_RECIPES = new Set(["trade_silver", "trade_gem_set"]);

function getTradePriority(difficulty) {
  if (difficulty === "hard") return HARD_TRADE_PRIORITY;
  if (difficulty === "medium") return MEDIUM_TRADE_PRIORITY;
  return EASY_TRADE_PRIORITY;
}

function getPlayPriority(difficulty) {
  if (difficulty === "hard") return HARD_PLAY_PRIORITY;
  if (difficulty === "medium") return MEDIUM_PLAY_PRIORITY;
  return EASY_PLAY_PRIORITY;
}

function getTutorPriority(state, difficulty) {
  if (difficulty === "easy") return state.ruleset.displayOrder ?? EASY_PLAY_PRIORITY;
  return [
    "gold",
    "silver",
    "platinum",
    "sapphire",
    "emerald",
    "ruby",
    "wood",
    "bronze",
  ];
}

function canPayBaseCost(recipe, counts) {
  return Object.entries(recipe.cost).every(
    ([type, amount]) => (counts[type] ?? 0) >= amount
  );
}

function pickTutorReward(state, player, difficulty) {
  const deckCounts = countCards(player.deck, state.ruleset.displayOrder);
  const priority = getTutorPriority(state, difficulty);
  return priority.find((type) => (deckCounts[type] ?? 0) > 0) ?? null;
}

function chooseWoodSubstitution(state, player, recipeId, difficulty, basePayable) {
  if (difficulty !== "hard") return null;
  const options = getWoodSubstitutionOptions(state, player, recipeId);
  if (options.length === 0) return null;
  if (!basePayable) return options[0];
  if (HARD_WOOD_RECIPES.has(recipeId)) return options[0];
  return null;
}

function buildTradePayload(state, player, recipeId, difficulty) {
  const recipe = state.ruleset.tradeRecipes?.[recipeId];
  if (!recipe) return null;
  const counts = countCards(player.archive);
  const basePayable = canPayBaseCost(recipe, counts);
  const rewardType = recipe.reward === "any" ? pickTutorReward(state, player, difficulty) : null;
  const basePayload = {
    recipeId,
    useWood: false,
    substituteType: null,
    rewardType,
  };
  if (canTradeWithOptions(state, player, recipeId, basePayload)) return basePayload;
  const substituteType = chooseWoodSubstitution(
    state,
    player,
    recipeId,
    difficulty,
    basePayable
  );
  if (!substituteType) return null;
  const woodPayload = {
    recipeId,
    useWood: true,
    substituteType,
    rewardType,
  };
  if (canTradeWithOptions(state, player, recipeId, woodPayload)) return woodPayload;
  return null;
}

export function chooseCpuTrade(state, player, difficulty) {
  const priority = getTradePriority(difficulty);
  for (const recipeId of priority) {
    const payload = buildTradePayload(state, player, recipeId, difficulty);
    if (payload) return payload;
  }
  return null;
}

export function chooseCpuPlays(state, player, difficulty) {
  const priority = getPlayPriority(difficulty);
  const counts = countCards(player.hand, priority);
  const plays = [];
  const maxPlays = state.ruleset.maxPlays ?? 5;
  priority.forEach((type) => {
    let remaining = counts[type] ?? 0;
    while (remaining > 0 && plays.length < maxPlays) {
      plays.push(type);
      remaining -= 1;
    }
  });
  return plays;
}

export function executeCpuTurn(state, options = {}) {
  const cpuIndex = options.cpuIndex ?? 1;
  const difficulty = options.difficulty ?? "easy";
  if (state.currentPlayer !== cpuIndex) return false;
  if (state.phase === "between") {
    applyAction(state, { type: ActionTypes.START_TURN });
  }
  if (state.phase !== "main") return false;
  const player = state.players[cpuIndex];
  const summary = {
    trades: [],
    plays: [],
    archive: null,
    winnerIndex: null,
  };

  while (state.tradesThisTurn < state.ruleset.maxTrades) {
    const payload = chooseCpuTrade(state, player, difficulty);
    if (!payload) break;
    const result = applyAction(state, { type: ActionTypes.TRADE, payload });
    summary.trades.push({
      recipeId: payload.recipeId,
      useWood: payload.useWood,
      substituteType: payload.substituteType,
      rewardType:
        result?.event?.detail?.rewardType ?? payload.rewardType ?? null,
      digDiscardedCount: result?.event?.detail?.digDiscardedCount,
    });
  }

  const plays = chooseCpuPlays(state, player, difficulty);
  plays.forEach((type) => {
    summary.plays.push(type);
    applyAction(state, { type: ActionTypes.PLAY_CARD_BY_TYPE, payload: { type } });
  });

  applyAction(state, { type: ActionTypes.END_TURN });
  if (state.phase === "confirm") {
    if (state.pendingArchive) {
      summary.archive = {
        counts: countCards(state.pendingArchive.playedCards, state.ruleset.displayOrder),
        drawCount: state.pendingArchive.drawCount,
      };
    }
    applyAction(state, { type: ActionTypes.CONFIRM_ARCHIVE });
  }
  summary.winnerIndex = state.winner;
  return summary;
}
