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
  "trade_hallmark",
  "trade_mint",
  "trade_gem_set",
  "trade_platinum",
  "trade_ancients_archive",
  "trade_electrum_draw",
];
const MEDIUM_TRADE_PRIORITY = [
  "trade_silver",
  "trade_gem_set",
  "trade_platinum",
  "trade_ancients_archive",
  "trade_electrum_draw",
  "trade_hallmark",
  "trade_mint",
  "trade_bronze",
];
const HARD_TRADE_PRIORITY = MEDIUM_TRADE_PRIORITY;

const EASY_PLAY_PRIORITY = ["gold", "silver", "bronze"];
const MEDIUM_PLAY_PRIORITY = [
  "gold",
  "silver",
  "bronze",
  "hallmark",
  "mint",
  "ledger",
  "ingot",
  "sterling",
  "electrum",
  "copper",
  "turquoise",
  "lapis_lazuli",
  "carnelian",
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
  ingot: 22,
  sterling: 32,
  ledger: 18,
  mint: 16,
  hallmark: 24,
  electrum: 18,
  copper: 6,
  turquoise: 14,
  lapis_lazuli: 14,
  carnelian: 14,
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
const HAND_DECLUTTER_THRESHOLD = 10;

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

function getTutorPriority(state, difficulty, allowed) {
  let priority;
  if (difficulty === "easy") {
    priority = state.ruleset.displayOrder ?? EASY_PLAY_PRIORITY;
  } else {
    priority = [
      "gold",
      "silver",
      "platinum",
      "hallmark",
      "mint",
    "ledger",
    "ingot",
    "sterling",
    "electrum",
    "turquoise",
    "lapis_lazuli",
    "carnelian",
    "sapphire",
    "emerald",
    "ruby",
      "wood",
      "bronze",
    ];
  }
  if (!allowed || allowed.length === 0) return priority;
  const allowedSet = new Set(allowed);
  return priority.filter((type) => allowedSet.has(type));
}

function resolvePoolTypes(pool, displayOrder) {
  if (!pool) return [];
  if (Array.isArray(pool)) return pool.filter((type) => displayOrder.includes(type));
  if (pool === "ancient") {
    return ["turquoise", "lapis_lazuli", "carnelian"].filter((type) =>
      displayOrder.includes(type)
    );
  }
  if (pool === "non_gold_non_electrum") {
    return displayOrder.filter((type) => type !== "gold" && type !== "electrum");
  }
  return [];
}

function chooseHandArchiveSelection(state, player, recipe) {
  if (!recipe?.reward || recipe.reward.type !== "archive_hand") return null;
  const allowed = recipe.reward.allowed ?? [];
  const min = recipe.reward.min ?? 1;
  const max = recipe.reward.max ?? min;
  const counts = countByType(player.hand, state.ruleset.displayOrder);
  const eligible = allowed.reduce((sum, type) => sum + (counts[type] ?? 0), 0);
  if (eligible < min) return null;
  const cardDefs = state.ruleset.cardTypes ?? {};
  const order = [...allowed].sort((a, b) => {
    const drawA = cardDefs[a]?.draw ?? 0;
    const drawB = cardDefs[b]?.draw ?? 0;
    if (drawA !== drawB) return drawA - drawB;
    const valueA = getCardValue(a);
    const valueB = getCardValue(b);
    if (valueA !== valueB) return valueA - valueB;
    return a.localeCompare(b);
  });
  const selected = {};
  let total = 0;
  order.forEach((type) => {
    if (total >= max) return;
    const available = counts[type] ?? 0;
    const take = Math.min(available, max - total);
    if (take > 0) {
      selected[type] = take;
      total += take;
    }
  });
  if (total < min) return null;
  return selected;
}

function getCardValue(type) {
  return CARD_VALUE[type] ?? 0;
}

function countByType(cards, displayOrder) {
  return countCards(cards, displayOrder);
}

function canPayBaseCost(recipe, counts) {
  const cost = recipe.cost ?? {};
  return Object.entries(cost).every(
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

function pickTutorReward(state, player, difficulty, allowed) {
  const deckCounts = countCards(player.deck, state.ruleset.displayOrder);
  const allowedSet = Array.isArray(allowed) && allowed.length > 0 ? new Set(allowed) : null;
  const filteredCounts = allowedSet
    ? Object.fromEntries(
        Object.entries(deckCounts).filter(([type]) => allowedSet.has(type))
      )
    : deckCounts;
  if (difficulty === "hard") {
    return pickBestRewardByValue(filteredCounts);
  }
  const priority = getTutorPriority(state, difficulty, allowed);
  return priority.find((type) => (filteredCounts[type] ?? 0) > 0) ?? null;
}

function pickArchiveReward(deckCounts) {
  let best = null;
  let bestValue = -Infinity;
  Object.entries(deckCounts).forEach(([type, count]) => {
    if (count <= 0) return;
    if (type === "gold") return;
    const value = getCardValue(type);
    if (value > bestValue || (value === bestValue && (!best || type < best))) {
      best = type;
      bestValue = value;
    }
  });
  return best;
}

function choosePoolTypesForRecipe(state, player, recipe) {
  if (!recipe?.poolCost) return [];
  const displayOrder = state.ruleset.displayOrder ?? [];
  const allowed = resolvePoolTypes(recipe.poolCost.pool, displayOrder);
  const archiveCounts = countByType(player.archive, displayOrder);
  const available = allowed.filter((type) => (archiveCounts[type] ?? 0) > 0);
  const sorted = [...available].sort((a, b) => {
    const diff = getCardValue(a) - getCardValue(b);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });
  const min = recipe.poolCost.min ?? 0;
  const max = recipe.poolCost.max ?? min;
  if (sorted.length < min) {
    if (min === 2 && max === 2 && (archiveCounts.copper ?? 0) > 0 && sorted.length >= 1) {
      return [sorted[0]];
    }
    return null;
  }
  if (recipe.reward?.type === "draw" && recipe.reward.count === undefined) {
    let best = sorted.slice(0, min);
    let bestScore = -Infinity;
    const limit = Math.min(max, sorted.length);
    for (let n = min; n <= limit; n += 1) {
      const slice = sorted.slice(0, n);
      const cost = slice.reduce((sum, type) => sum + getCardValue(type), 0);
      const reward = n * DRAW_VALUE;
      const score = reward - cost;
      if (score > bestScore) {
        bestScore = score;
        best = slice;
      }
    }
    return best;
  }
  return sorted.slice(0, min);
}

function buildCostWithWood(cost, substituteType) {
  const adjusted = { ...cost };
  adjusted[substituteType] = Math.max(0, (adjusted[substituteType] ?? 0) - 1);
  adjusted.wood = (adjusted.wood ?? 0) + 1;
  return adjusted;
}

function getPayloadCost(recipe, payload) {
  let cost = recipe.cost ?? {};
  if (payload.useWood && payload.substituteType) {
    cost = buildCostWithWood(cost, payload.substituteType);
  }
  if (recipe.choiceCost && payload.choiceType) {
    cost = {
      ...cost,
      [payload.choiceType]: (cost[payload.choiceType] ?? 0) + recipe.choiceCost.count,
    };
  }
  if (recipe.poolCost && Array.isArray(payload.poolTypes)) {
    payload.poolTypes.forEach((type) => {
      cost = {
        ...cost,
        [type]: (cost[type] ?? 0) + 1,
      };
    });
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
    const drawCount =
      typeof recipe.reward.count === "number"
        ? recipe.reward.count
        : Array.isArray(payload.poolTypes)
          ? payload.poolTypes.length
          : 0;
    rewardValue = drawCount * DRAW_VALUE;
  } else if (recipe.reward?.type === "archive") {
    rewardType = payload.rewardType;
    rewardValue = rewardType ? getCardValue(rewardType) : 0;
  } else if (recipe.reward?.type === "archive_cards") {
    const rewardCards = recipe.reward.cards ?? [];
    rewardValue = rewardCards.reduce(
      (sum, type) => sum + ((deckCounts[type] ?? 0) > 0 ? getCardValue(type) : 0),
      0
    );
  } else if (recipe.reward?.type === "archive_hand") {
    const handArchive = payload.handArchive ?? {};
    rewardValue = Object.entries(handArchive).reduce(
      (sum, [type, amount]) => sum + getCardValue(type) * amount,
      0
    );
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
  if (recipe.poolCost) {
    const poolTypes = choosePoolTypesForRecipe(state, player, recipe);
    if (!poolTypes) return null;
    finalized.poolTypes = poolTypes;
  }
  if (recipe.reward?.type === "archive" && !finalized.rewardType) {
    const deckCounts = countCards(player.deck, state.ruleset.displayOrder);
    const rewardType = pickArchiveReward(deckCounts);
    if (!rewardType) return null;
    finalized.rewardType = rewardType;
  }
  if (recipe.reward?.type === "archive_hand" && !finalized.handArchive) {
    const selection = chooseHandArchiveSelection(state, player, recipe);
    if (!selection) return null;
    finalized.handArchive = selection;
  }
  if (canTradeWithOptions(state, player, recipeId, finalized)) return finalized;
  return null;
}

function buildTradePayload(state, player, recipeId, difficulty) {
  const recipe = state.ruleset.tradeRecipes?.[recipeId];
  if (!recipe) return null;
  if (recipe.reward?.type === "archive_hand" && player.hand.length <= HAND_DECLUTTER_THRESHOLD) {
    return null;
  }
  const counts = countCards(player.archive);
  const basePayable = canPayBaseCost(recipe, counts);
  const rewardType =
    recipe.reward === "any"
      ? pickTutorReward(state, player, difficulty, recipe.rewardOptions)
      : null;
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
      recipe.reward === "any"
        ? pickTutorReward(state, player, "hard", recipe.rewardOptions)
        : null;
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
    const plays = entries.slice(0, maxPlays).map((entry) => entry.type);
    return applyEmptyHandGuard(state, player, plays);
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
  return applyEmptyHandGuard(state, player, plays);
}

function applyEmptyHandGuard(state, player, plays) {
  if (plays.length === 0) return plays;
  if (plays.length < player.hand.length) return plays;
  const drawCount = plays.reduce((sum, type) => {
    const draw = state.ruleset.cardTypes?.[type]?.draw ?? 0;
    return sum + draw;
  }, 0);
  if (drawCount > 0) return plays;
  return plays.slice(0, Math.max(0, plays.length - 1));
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
      poolTypes: payload.poolTypes ?? null,
      handArchive: result?.event?.detail?.handArchive ?? payload.handArchive ?? null,
      rewardCards: result?.event?.detail?.rewardCards ?? null,
      rewardType:
        result?.event?.detail?.rewardType ?? payload.rewardType ?? null,
      drawCount: result?.event?.detail?.drawCount,
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
