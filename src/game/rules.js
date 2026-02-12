import { countCards, getCardType, shuffle } from "../shared/utils.js";

export const ActionTypes = {
  TRADE: "TRADE",
  PLAY_CARD: "PLAY_CARD",
  PLAY_CARD_BY_TYPE: "PLAY_CARD_BY_TYPE",
  RETURN_CARD: "RETURN_CARD",
  RETURN_ALL: "RETURN_ALL",
  END_TURN: "END_TURN",
  CONFIRM_ARCHIVE: "CONFIRM_ARCHIVE",
  CANCEL_ARCHIVE: "CANCEL_ARCHIVE",
  START_TURN: "START_TURN",
};

function getTradeRecipe(state, recipeId) {
  return state.ruleset.tradeRecipes?.[recipeId] ?? null;
}

function sumCost(cost = {}) {
  return Object.values(cost).reduce((sum, value) => sum + value, 0);
}

function canPayCost(counts, cost = {}) {
  return Object.entries(cost).every(
    ([type, amount]) => (counts[type] ?? 0) >= amount
  );
}

function buildCostWithWood(cost, substituteType) {
  const adjusted = { ...cost };
  adjusted[substituteType] = Math.max(0, (adjusted[substituteType] ?? 0) - 1);
  adjusted.wood = (adjusted.wood ?? 0) + 1;
  return adjusted;
}

const GEM_TYPES = new Set(["ruby", "emerald", "sapphire"]);
const ANCIENT_TYPES = ["turquoise", "lapis_lazuli", "carnelian"];

function resolvePoolTypes(ruleset, pool) {
  const displayOrder = ruleset.displayOrder ?? Object.keys(ruleset.cardTypes ?? {});
  if (Array.isArray(pool)) {
    return pool.filter((type) => displayOrder.includes(type));
  }
  if (pool === "ancient") {
    return ANCIENT_TYPES.filter((type) => displayOrder.includes(type));
  }
  if (pool === "non_gold_non_electrum") {
    return displayOrder.filter((type) => type !== "gold" && type !== "electrum");
  }
  return [];
}

function getChoicePoolTypes(ruleset, pool, exclude = []) {
  const displayOrder = ruleset.displayOrder ?? Object.keys(ruleset.cardTypes ?? {});
  let types = displayOrder;
  if (pool === "non_gem_non_wood") {
    types = displayOrder.filter((type) => type !== "wood" && !GEM_TYPES.has(type));
  }
  if (exclude.length > 0) {
    types = types.filter((type) => !exclude.includes(type));
  }
  return types;
}

function getChoiceCostOptionsForCost(ruleset, recipe, counts, baseCost) {
  if (!recipe.choiceCost) return [];
  const pool = getChoicePoolTypes(ruleset, recipe.choiceCost.pool, recipe.choiceCost.exclude);
  return pool.filter((type) => {
    const combined = { ...baseCost };
    combined[type] = (combined[type] ?? 0) + recipe.choiceCost.count;
    return canPayCost(counts, combined);
  });
}

function buildPoolCostCounts(poolTypes) {
  return poolTypes.reduce((acc, type) => {
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
}

function getPoolCostCounts(state, recipe, options) {
  if (!recipe.poolCost) return { valid: true, counts: {}, poolTypes: [] };
  const poolTypes = Array.isArray(options.poolTypes) ? options.poolTypes : null;
  if (!poolTypes) return { valid: false, counts: {}, poolTypes: [] };
  const min = recipe.poolCost.min ?? poolTypes.length;
  const max = recipe.poolCost.max ?? poolTypes.length;
  if (poolTypes.length < min || poolTypes.length > max) {
    return { valid: false, counts: {}, poolTypes: [] };
  }
  if (recipe.poolCost.distinct) {
    const unique = new Set(poolTypes);
    if (unique.size !== poolTypes.length) {
      return { valid: false, counts: {}, poolTypes: [] };
    }
  }
  const allowed = resolvePoolTypes(state.ruleset, recipe.poolCost.pool);
  if (poolTypes.some((type) => !allowed.includes(type))) {
    return { valid: false, counts: {}, poolTypes: [] };
  }
  return { valid: true, counts: buildPoolCostCounts(poolTypes), poolTypes };
}

function canSatisfyPoolCost(counts, poolCost, ruleset) {
  if (!poolCost) return true;
  const allowed = resolvePoolTypes(ruleset, poolCost.pool);
  if (allowed.length === 0) return false;
  const min = poolCost.min ?? poolCost.max ?? 0;
  if (poolCost.distinct) {
    const available = allowed.filter((type) => (counts[type] ?? 0) > 0).length;
    return available >= min;
  }
  const total = allowed.reduce((sum, type) => sum + (counts[type] ?? 0), 0);
  return total >= min;
}

export function getChoiceCostOptions(state, player, recipeId, options = {}) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe?.choiceCost) return [];
  const counts = countCards(player.archive);
  let baseCost = recipe.cost ?? {};
  if (options.useWood) {
    const rules = state.ruleset.woodSubstitution;
    if (!rules?.allow) return [];
    if (sumCost(baseCost) < rules.minCost) return [];
    if ((counts.wood ?? 0) < 1) return [];
    if (!options.substituteType || !baseCost[options.substituteType]) return [];
    if (recipeId === "trade_platinum" && options.substituteType === "platinum") return [];
    baseCost = buildCostWithWood(baseCost, options.substituteType);
  }
  return getChoiceCostOptionsForCost(state.ruleset, recipe, counts, baseCost);
}

function getTradeCost(state, player, recipeId, options = {}) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe) return null;
  const counts = countCards(player.archive);
  const baseCost = recipe.cost ?? {};
  let cost = baseCost;
  if (options.useWood) {
    const rules = state.ruleset.woodSubstitution;
    if (!rules?.allow) return null;
    if (sumCost(baseCost) < rules.minCost) return null;
    if ((counts.wood ?? 0) < 1) return null;
    if (!options.substituteType || !baseCost[options.substituteType]) return null;
    if (recipeId === "trade_platinum" && options.substituteType === "platinum") return null;
    if (recipeId === "trade_electrum_draw" && options.substituteType === "electrum") {
      return null;
    }
    cost = buildCostWithWood(baseCost, options.substituteType);
  }
  if (recipe.choiceCost) {
    if (!options.choiceType) return null;
    const choiceOptions = getChoiceCostOptions(state, player, recipeId, options);
    if (!choiceOptions.includes(options.choiceType)) return null;
    cost = {
      ...cost,
      [options.choiceType]: (cost[options.choiceType] ?? 0) + recipe.choiceCost.count,
    };
  }
  const poolCost = getPoolCostCounts(state, recipe, options);
  if (!poolCost.valid) return null;
  Object.entries(poolCost.counts).forEach(([type, amount]) => {
    cost = {
      ...cost,
      [type]: (cost[type] ?? 0) + amount,
    };
  });
  if (!canPayCost(counts, cost)) return null;
  return cost;
}

export function getWoodSubstitutionOptions(state, player, recipeId) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe) return [];
  const rules = state.ruleset.woodSubstitution;
  if (!rules?.allow) return [];
  const baseCost = recipe.cost ?? {};
  if (sumCost(baseCost) < rules.minCost) return [];
  const counts = countCards(player.archive);
  if ((counts.wood ?? 0) < 1) return [];
  const options = [];
  Object.entries(baseCost).forEach(([type]) => {
    if (recipeId === "trade_platinum" && type === "platinum") return;
    if (recipeId === "trade_electrum_draw" && type === "electrum") return;
    const adjusted = buildCostWithWood(baseCost, type);
    if (canPayCost(counts, adjusted)) {
      options.push(type);
    }
  });
  return options;
}

export function canInitiateTrade(state, player, recipeId) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe) return false;
  if (state.phase !== "main") return false;
  if (state.tradesThisTurn >= state.ruleset.maxTrades) return false;
  const counts = countCards(player.archive);
  const baseCost = recipe.cost ?? {};
  const canPayWithCost = (cost) => {
    if (!canPayCost(counts, cost)) return false;
    const remaining = { ...counts };
    Object.entries(cost).forEach(([type, amount]) => {
      remaining[type] = (remaining[type] ?? 0) - amount;
    });
    if (recipe.choiceCost) {
      if (getChoiceCostOptionsForCost(state.ruleset, recipe, counts, cost).length === 0) {
        return false;
      }
    }
    if (recipe.poolCost && !canSatisfyPoolCost(remaining, recipe.poolCost, state.ruleset)) {
      return false;
    }
    return true;
  };
  let canPay = canPayWithCost(baseCost);
  if (!canPay) {
    const woodOptions = getWoodSubstitutionOptions(state, player, recipeId);
    for (const substituteType of woodOptions) {
      const adjusted = buildCostWithWood(baseCost, substituteType);
      if (canPayWithCost(adjusted)) {
        canPay = true;
        break;
      }
    }
  }
  if (!canPay) return false;
  if (recipe.reward === "any") {
    return player.deck.length > 0;
  }
  if (recipe.reward === "dig_non_bronze_silver") {
    return true;
  }
  const deckCounts = countCards(player.deck);
  if (typeof recipe.reward === "string") {
    return (deckCounts[recipe.reward] ?? 0) > 0;
  }
  if (recipe.reward?.type === "cards") {
    return (deckCounts[recipe.reward.card] ?? 0) >= recipe.reward.count;
  }
  if (recipe.reward?.type === "draw") {
    return true;
  }
  if (recipe.reward?.type === "archive_hand") {
    const allowed = recipe.reward.allowed ?? [];
    if (allowed.length === 0) return false;
    const handCounts = countCards(player.hand);
    const eligible = allowed.reduce((sum, type) => sum + (handCounts[type] ?? 0), 0);
    const min = recipe.reward.min ?? 1;
    return eligible >= min;
  }
  if (recipe.reward?.type === "archive") {
    return Object.entries(deckCounts).some(
      ([type, count]) => count > 0 && type !== "gold"
    );
  }
  return false;
}

export function getCurrentPlayer(state) {
  return state.players[state.currentPlayer];
}

export function drawCards(player, count) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (player.deck.length === 0) break;
    drawn.push(player.deck.pop());
  }
  player.hand.push(...drawn);
  return drawn;
}

export function canTrade(state, player, recipeId) {
  return canTradeWithOptions(state, player, recipeId, {});
}

export function canTradeWithOptions(state, player, recipeId, options = {}) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe) return false;
  if (state.phase !== "main") return false;
  if (state.tradesThisTurn >= state.ruleset.maxTrades) return false;
  const cost = getTradeCost(state, player, recipeId, options);
  if (!cost) return false;
  if (recipe.reward === "any") {
    if (!options.rewardType) return false;
    const deckCounts = countCards(player.deck);
    return (deckCounts[options.rewardType] ?? 0) > 0;
  }
  if (recipe.reward === "dig_non_bronze_silver") {
    return true;
  }
  const deckCounts = countCards(player.deck);
  if (typeof recipe.reward === "string") {
    return (deckCounts[recipe.reward] ?? 0) > 0;
  }
  if (recipe.reward?.type === "cards") {
    return (deckCounts[recipe.reward.card] ?? 0) >= recipe.reward.count;
  }
  if (recipe.reward?.type === "draw") {
    return true;
  }
  if (recipe.reward?.type === "archive_hand") {
    if (!options.handArchive || typeof options.handArchive !== "object") return false;
    const min = recipe.reward.min ?? 0;
    const max = recipe.reward.max ?? min;
    const allowed = recipe.reward.allowed ?? [];
    const handCounts = countCards(player.hand);
    let total = 0;
    for (const [type, amount] of Object.entries(options.handArchive)) {
      if (!allowed.includes(type)) return false;
      if (typeof amount !== "number" || amount <= 0) return false;
      if ((handCounts[type] ?? 0) < amount) return false;
      total += amount;
    }
    if (total < min || total > max) return false;
    return true;
  }
  if (recipe.reward?.type === "archive") {
    if (!options.rewardType || options.rewardType === "gold") return false;
    return (deckCounts[options.rewardType] ?? 0) > 0;
  }
  return false;
}

function removeCardsFromArchive(player, type, count) {
  let removed = 0;
  player.archive = player.archive.filter((card) => {
    if (getCardType(card) === type && removed < count) {
      removed += 1;
      player.discard.push(card);
      return false;
    }
    return true;
  });
}

function removeCardsFromHand(player, type, count) {
  let removed = 0;
  player.hand = player.hand.filter((card) => {
    if (getCardType(card) === type && removed < count) {
      removed += 1;
      player.archive.push(card);
      return false;
    }
    return true;
  });
}

export function performTrade(state, player, recipeId, options = {}) {
  if (!canTradeWithOptions(state, player, recipeId, options)) {
    return { success: false };
  }
  const recipe = getTradeRecipe(state, recipeId);
  const cost = getTradeCost(state, player, recipeId, options);
  if (!cost) {
    return { success: false };
  }
  Object.entries(cost).forEach(([type, amount]) => {
    if (amount > 0) {
      removeCardsFromArchive(player, type, amount);
    }
  });

  const tutorCards = (type, count) => {
    let moved = 0;
    for (let i = 0; i < count; i += 1) {
      const rewardIndex = player.deck.findIndex(
        (card) => getCardType(card) === type
      );
      if (rewardIndex === -1) break;
      const [reward] = player.deck.splice(rewardIndex, 1);
      player.hand.push(reward);
      moved += 1;
    }
    if (moved > 0) {
      player.deck = shuffle(player.deck);
    }
    return moved;
  };

  let detail = {};
  if (recipe.reward === "any") {
    const rewardIndex = player.deck.findIndex(
      (card) => getCardType(card) === options.rewardType
    );
    if (rewardIndex !== -1) {
      const [reward] = player.deck.splice(rewardIndex, 1);
      player.hand.push(reward);
      player.deck = shuffle(player.deck);
      detail.rewardType = options.rewardType;
    }
  } else if (recipe.reward === "dig_non_bronze_silver") {
    let reward = null;
    let discarded = 0;
    while (player.deck.length > 0) {
      const card = player.deck.pop();
      if (getCardType(card) === "bronze" || getCardType(card) === "silver") {
        player.discard.push(card);
        discarded += 1;
      } else {
        reward = card;
        break;
      }
    }
    if (reward) {
      player.hand.push(reward);
      detail.rewardType = getCardType(reward);
    }
    detail.digDiscardedCount = discarded;
  } else if (typeof recipe.reward === "string") {
    const rewardIndex = player.deck.findIndex(
      (card) => getCardType(card) === recipe.reward
    );
    if (rewardIndex !== -1) {
      const [reward] = player.deck.splice(rewardIndex, 1);
      player.hand.push(reward);
      player.deck = shuffle(player.deck);
      detail.rewardType = recipe.reward;
    }
  } else if (recipe.reward?.type === "cards") {
    const moved = tutorCards(recipe.reward.card, recipe.reward.count);
    if (moved > 0) {
      detail.rewardType = recipe.reward.card;
      detail.rewardCount = moved;
    }
  } else if (recipe.reward?.type === "draw") {
    const drawCount =
      typeof recipe.reward.count === "number"
        ? recipe.reward.count
        : Array.isArray(options.poolTypes)
          ? options.poolTypes.length
          : 0;
    const drawn = drawCards(player, drawCount);
    detail.drawCount = drawn.length;
  } else if (recipe.reward?.type === "archive") {
    if (options.rewardType && options.rewardType !== "gold") {
      const rewardIndex = player.deck.findIndex(
        (card) => getCardType(card) === options.rewardType
      );
      if (rewardIndex !== -1) {
        const [reward] = player.deck.splice(rewardIndex, 1);
        player.archive.push(reward);
        player.deck = shuffle(player.deck);
        detail.rewardType = options.rewardType;
      }
    }
  } else if (recipe.reward?.type === "archive_hand") {
    const handArchive = options.handArchive ?? {};
    Object.entries(handArchive).forEach(([type, amount]) => {
      if (amount > 0) {
        removeCardsFromHand(player, type, amount);
      }
    });
    detail.handArchive = { ...handArchive };
  }
  state.tradesThisTurn += 1;
  return { success: true, detail };
}

export function playCard(state, player, index) {
  if (state.phase !== "main") return false;
  if (player.active.length >= state.ruleset.maxPlays) return false;
  const [card] = player.hand.splice(index, 1);
  if (!card) return false;
  player.active.push(card);
  return true;
}

export function playCardByType(state, player, type) {
  const index = player.hand.findIndex((card) => getCardType(card) === type);
  if (index === -1) return false;
  return playCard(state, player, index);
}

export function returnCard(state, player, index) {
  if (state.phase !== "main") return false;
  const [card] = player.active.splice(index, 1);
  if (!card) return false;
  player.hand.push(card);
  return true;
}

export function returnAllCards(state, player) {
  if (state.phase !== "main") return false;
  if (player.active.length === 0) return false;
  player.hand.push(...player.active);
  player.active = [];
  return true;
}

export function prepareArchive(state) {
  if (state.phase !== "main") return null;
  const player = getCurrentPlayer(state);
  const playedCards = [...player.active];
  const drawCount = playedCards.reduce((sum, card) => sum + (card.draw ?? 0), 0);
  state.pendingArchive = {
    playedCards,
    drawCount,
    playerIndex: state.currentPlayer,
  };
  state.phase = "confirm";
  return state.pendingArchive;
}

export function finalizeArchive(state, options = {}) {
  const pending = state.pendingArchive;
  if (!pending) return { winnerIndex: null };
  const player = state.players[pending.playerIndex];

  player.archive.push(...pending.playedCards);
  player.active = [];

  drawCards(player, pending.drawCount);

  state.pendingArchive = null;

  if (countCards(player.archive).gold >= state.ruleset.winCondition.goldInArchive) {
    state.winner = pending.playerIndex;
    return { winnerIndex: pending.playerIndex };
  }

  state.tradesThisTurn = 0;
  state.currentPlayer = pending.playerIndex === 0 ? 1 : 0;
  state.turnCount += 1;
  state.phase = "between";
  return { winnerIndex: null };
}

export function cancelArchive(state) {
  state.pendingArchive = null;
  state.phase = "main";
}

export function startTurn(state) {
  state.phase = "main";
}

export function applyAction(state, action) {
  const player = getCurrentPlayer(state);
  switch (action.type) {
    case ActionTypes.TRADE:
      return {
        event: {
          type: "trade",
          ...performTrade(state, player, action.payload.recipeId, action.payload),
        },
      };
    case ActionTypes.PLAY_CARD:
      playCard(state, player, action.payload.index);
      return { event: null };
    case ActionTypes.PLAY_CARD_BY_TYPE:
      playCardByType(state, player, action.payload.type);
      return { event: null };
    case ActionTypes.RETURN_CARD:
      returnCard(state, player, action.payload.index);
      return { event: null };
    case ActionTypes.RETURN_ALL:
      returnAllCards(state, player);
      return { event: null };
    case ActionTypes.END_TURN:
      prepareArchive(state);
      return { event: null };
    case ActionTypes.CONFIRM_ARCHIVE:
      return { event: finalizeArchive(state, action.payload ?? {}) };
    case ActionTypes.CANCEL_ARCHIVE:
      cancelArchive(state);
      return { event: null };
    case ActionTypes.START_TURN:
      startTurn(state);
      return { event: null };
    default:
      return { event: null };
  }
}
