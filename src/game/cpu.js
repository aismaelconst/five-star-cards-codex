import { countCards } from "../shared/utils.js";
import {
  ActionTypes,
  applyAction,
  canTradeWithOptions,
  getChoiceCostOptions,
  getWoodSubstitutionOptions,
} from "./rules.js";

const EASY_TRADE_PRIORITY = [
  "trade_silver",
  "trade_bronze",
  "trade_copper_zinc",
  "trade_copper_tin",
  "trade_brass_draw",
  "trade_gem_set",
  "trade_platinum",
];
const MEDIUM_TRADE_PRIORITY = [
  "trade_silver",
  "trade_gem_set",
  "trade_platinum",
  "trade_copper_zinc",
  "trade_copper_tin",
  "trade_brass_draw",
  "trade_bronze",
];
const HARD_TRADE_PRIORITY = MEDIUM_TRADE_PRIORITY;

const EASY_PLAY_PRIORITY = ["gold", "silver", "bronze"];
const MEDIUM_PLAY_PRIORITY = [
  "gold",
  "silver",
  "bronze",
  "brass",
  "copper",
  "tin",
  "zinc",
  "ruby",
  "emerald",
  "sapphire",
  "platinum",
  "wood",
];
const HARD_PLAY_PRIORITY = MEDIUM_PLAY_PRIORITY;

const CARD_VALUE = {
  gold: 100,
  silver: 30,
  bronze: 10,
  brass: 18,
  copper: 8,
  tin: 6,
  zinc: 6,
  platinum: 25,
  sapphire: 20,
  emerald: 20,
  ruby: 20,
  wood: 5,
};

const DRAW_VALUE = 10;
const GEM_SET_BONUS = 30;
const PLATINUM_SET_BONUS = 20;
const WOOD_SETUP_BONUS = 5;
const WIN_BONUS = 500;

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
    "brass",
    "copper",
    "tin",
    "zinc",
    "sapphire",
    "emerald",
    "ruby",
    "wood",
    "bronze",
  ];
}

function getCardValue(type) {
  return CARD_VALUE[type] ?? 0;
}

function countByType(cards, displayOrder) {
  return countCards(cards, displayOrder);
}

function canPayBaseCost(recipe, counts) {
  return Object.entries(recipe.cost).every(
    ([type, amount]) => (counts[type] ?? 0) >= amount
  );
}

function pickBestRewardByValue(deckCounts) {
  let best = null;
  let bestValue = -Infinity;
  Object.entries(deckCounts).forEach(([type, count]) => {
    if (count <= 0) return;
    const value = getCardValue(type);
    if (value > bestValue || (value === bestValue && (!best || type < best))) {
      best = type;
      bestValue = value;
    }
  });
  return best;
}

function pickTutorReward(state, player, difficulty) {
  const deckCounts = countCards(player.deck, state.ruleset.displayOrder);
  if (difficulty === "hard") {
    return pickBestRewardByValue(deckCounts);
  }
  const priority = getTutorPriority(state, difficulty);
  return priority.find((type) => (deckCounts[type] ?? 0) > 0) ?? null;
}

function buildCostWithWood(cost, substituteType) {
  const adjusted = { ...cost };
  adjusted[substituteType] = Math.max(0, (adjusted[substituteType] ?? 0) - 1);
  adjusted.wood = (adjusted.wood ?? 0) + 1;
  return adjusted;
}

function getPayloadCost(recipe, payload) {
  let cost = recipe.cost;
  if (payload.useWood && payload.substituteType) {
    cost = buildCostWithWood(recipe.cost, payload.substituteType);
  }
  if (recipe.choiceCost && payload.choiceType) {
    cost = {
      ...cost,
      [payload.choiceType]: (cost[payload.choiceType] ?? 0) + recipe.choiceCost.count,
    };
  }
  return cost;
}

function costValue(cost) {
  return Object.entries(cost).reduce(
    (sum, [type, amount]) => sum + amount * getCardValue(type),
    0
  );
}

function expectedPlatinumRewardValue(deckCounts) {
  const entries = Object.entries(deckCounts).filter(
    ([type, count]) => count > 0 && type !== "bronze" && type !== "silver"
  );
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return 0;
  const weighted = entries.reduce(
    (sum, [type, count]) => sum + getCardValue(type) * count,
    0
  );
  return weighted / total;
}

function goldWinBonus(state, player, extraGold) {
  const displayOrder = state.ruleset.displayOrder ?? EASY_PLAY_PRIORITY;
  const archiveCounts = countByType(player.archive, displayOrder);
  const activeCounts = countByType(player.active, displayOrder);
  const handCounts = countByType(player.hand, displayOrder);
  const totalGold =
    (archiveCounts.gold ?? 0) +
    (activeCounts.gold ?? 0) +
    (handCounts.gold ?? 0) +
    extraGold;
  return totalGold >= state.ruleset.winCondition.goldInArchive ? WIN_BONUS : 0;
}

function scoreTradePayload(state, player, recipe, payload) {
  const deckCounts = countCards(player.deck, state.ruleset.displayOrder);
  let rewardType = payload.rewardType;
  let rewardValue = 0;
  if (recipe.reward === "any") {
    rewardValue = rewardType ? getCardValue(rewardType) : 0;
  } else if (recipe.reward === "dig_non_bronze_silver") {
    rewardValue = expectedPlatinumRewardValue(deckCounts);
  } else if (typeof recipe.reward === "string") {
    rewardType = recipe.reward;
    rewardValue = getCardValue(recipe.reward);
  } else if (recipe.reward?.type === "cards") {
    rewardType = recipe.reward.card;
    rewardValue = getCardValue(recipe.reward.card) * recipe.reward.count;
  } else if (recipe.reward?.type === "draw") {
    rewardValue = recipe.reward.count * DRAW_VALUE;
  }
  const cost = getPayloadCost(recipe, payload);
  const score = rewardValue - costValue(cost);
  const bonus =
    rewardType === "gold" ? goldWinBonus(state, player, 1) : 0;
  return score + bonus;
}

function chooseWoodSubstitution(state, player, recipeId, difficulty, basePayable) {
  if (difficulty !== "hard") return null;
  const options = getWoodSubstitutionOptions(state, player, recipeId);
  if (options.length === 0) return null;
  if (!basePayable) return options[0];
  if (HARD_WOOD_RECIPES.has(recipeId)) return options[0];
  return null;
}

function chooseChoiceCostType(state, player, recipeId, payload) {
  const options = getChoiceCostOptions(state, player, recipeId, payload);
  if (options.length === 0) return null;
  let best = null;
  let bestValue = Infinity;
  options.forEach((type) => {
    const value = getCardValue(type);
    if (value < bestValue || (value === bestValue && (!best || type < best))) {
      best = type;
      bestValue = value;
    }
  });
  return best;
}

function finalizeTradePayload(state, player, recipeId, payload) {
  const recipe = state.ruleset.tradeRecipes?.[recipeId];
  if (!recipe) return null;
  const finalized = { ...payload };
  if (recipe.choiceCost) {
    const choiceType = chooseChoiceCostType(state, player, recipeId, payload);
    if (!choiceType) return null;
    finalized.choiceType = choiceType;
  }
  if (canTradeWithOptions(state, player, recipeId, finalized)) return finalized;
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
  const finalizedBase = finalizeTradePayload(state, player, recipeId, basePayload);
  if (finalizedBase) return finalizedBase;
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
  return finalizeTradePayload(state, player, recipeId, woodPayload);
}

function chooseHardTrade(state, player) {
  const recipes = Object.entries(state.ruleset.tradeRecipes ?? {});
  if (state.ruleset.tradeRecipes?.trade_silver) {
    const forcedSilver = buildTradePayload(state, player, "trade_silver", "hard");
    if (forcedSilver) return forcedSilver;
  }
  if (state.ruleset.tradeRecipes?.trade_bronze) {
    const forcedBronze = buildTradePayload(state, player, "trade_bronze", "hard");
    if (forcedBronze) return forcedBronze;
  }
  const candidates = [];
  const deckCounts = countCards(player.deck, state.ruleset.displayOrder);
  recipes.forEach(([recipeId, recipe]) => {
    const rewardType =
      recipe.reward === "any" ? pickTutorReward(state, player, "hard") : null;
    const basePayload = {
      recipeId,
      useWood: false,
      substituteType: null,
      rewardType,
    };
    const finalizedBase = finalizeTradePayload(state, player, recipeId, basePayload);
    if (finalizedBase) {
      candidates.push({ recipeId, recipe, payload: finalizedBase });
    }
    const woodOptions = getWoodSubstitutionOptions(state, player, recipeId);
    woodOptions.forEach((substituteType) => {
      const payload = {
        recipeId,
        useWood: true,
        substituteType,
        rewardType,
      };
      const finalized = finalizeTradePayload(state, player, recipeId, payload);
      if (finalized) {
        candidates.push({ recipeId, recipe, payload: finalized });
      }
    });
  });

  let best = null;
  let bestScore = -Infinity;
  candidates.forEach((candidate) => {
    const score = scoreTradePayload(
      state,
      player,
      candidate.recipe,
      candidate.payload
    );
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
      return;
    }
    if (score === bestScore && best) {
      if (candidate.recipeId < best.recipeId) {
        best = candidate;
        return;
      }
      if (candidate.recipeId === best.recipeId) {
        if (best.payload.useWood && !candidate.payload.useWood) {
          best = candidate;
          return;
        }
        if (
          candidate.payload.useWood === best.payload.useWood &&
          candidate.payload.substituteType &&
          best.payload.substituteType &&
          candidate.payload.substituteType < best.payload.substituteType
        ) {
          best = candidate;
        }
      }
    }
  });
  if (!best || bestScore <= 0) return null;
  return best.payload;
}

export function chooseCpuTrade(state, player, difficulty) {
  if (difficulty === "hard") {
    return chooseHardTrade(state, player);
  }
  const priority = getTradePriority(difficulty);
  for (const recipeId of priority) {
    const payload = buildTradePayload(state, player, recipeId, difficulty);
    if (payload) return payload;
  }
  return null;
}

function completesGemSet(counts, type) {
  if (!["ruby", "emerald", "sapphire"].includes(type)) return false;
  return (
    (counts.ruby ?? 0) >= 1 &&
    (counts.emerald ?? 0) >= 1 &&
    (counts.sapphire ?? 0) >= 1
  );
}

function completesPlatinumSet(counts) {
  return (
    (counts.platinum ?? 0) >= 1 &&
    (counts.bronze ?? 0) >= 1 &&
    (counts.silver ?? 0) >= 1
  );
}

function scorePlay(state, player, type) {
  const displayOrder = state.ruleset.displayOrder ?? EASY_PLAY_PRIORITY;
  const draw = state.ruleset.cardTypes?.[type]?.draw ?? 0;
  const deckCounts = countByType(player.deck, displayOrder);
  const archiveCounts = countByType(player.archive, displayOrder);
  const activeCounts = countByType(player.active, displayOrder);
  const projected = { ...archiveCounts };
  Object.entries(activeCounts).forEach(([key, value]) => {
    projected[key] = (projected[key] ?? 0) + value;
  });
  projected[type] = (projected[type] ?? 0) + 1;

  let score = draw * DRAW_VALUE;
  if (type === "gold" && (projected.gold ?? 0) >= state.ruleset.winCondition.goldInArchive) {
    score += WIN_BONUS;
  }
  if (["ruby", "emerald", "sapphire"].includes(type) && completesGemSet(projected, type)) {
    score += GEM_SET_BONUS;
  }
  if (type === "platinum" && completesPlatinumSet(projected)) {
    score += PLATINUM_SET_BONUS;
  }
  if (type === "wood" && (archiveCounts.wood ?? 0) === 0) {
    score += WOOD_SETUP_BONUS;
  }
  if (type === "copper") {
    if ((deckCounts.tin ?? 0) > 0 || (deckCounts.zinc ?? 0) > 0) {
      score += DRAW_VALUE;
    }
  }
  if (type === "tin" || type === "zinc") {
    if ((deckCounts.copper ?? 0) > 0) {
      score += DRAW_VALUE;
    }
  }
  if (type === "brass") {
    score += DRAW_VALUE * 0.5;
  }
  return score;
}

export function chooseCpuPlays(state, player, difficulty) {
  if (difficulty === "hard") {
    const displayOrder = state.ruleset.displayOrder ?? HARD_PLAY_PRIORITY;
    const handCounts = countByType(player.hand, displayOrder);
    const entries = [];
    displayOrder.forEach((type) => {
      const count = handCounts[type] ?? 0;
      for (let i = 0; i < count; i += 1) {
        entries.push({ type, score: scorePlay(state, player, type) });
      }
    });
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.type.localeCompare(b.type);
    });
    const maxPlays = state.ruleset.maxPlays ?? 5;
    return entries.slice(0, maxPlays).map((entry) => entry.type);
  }
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
      choiceType: payload.choiceType ?? null,
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
