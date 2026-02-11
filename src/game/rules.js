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

function sumCost(cost) {
  return Object.values(cost).reduce((sum, value) => sum + value, 0);
}

function canPayCost(counts, cost) {
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

export function getChoiceCostOptions(state, player, recipeId, options = {}) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe?.choiceCost) return [];
  const counts = countCards(player.archive);
  let baseCost = recipe.cost;
  if (options.useWood) {
    const rules = state.ruleset.woodSubstitution;
    if (!rules?.allow) return [];
    if (sumCost(recipe.cost) < rules.minCost) return [];
    if ((counts.wood ?? 0) < 1) return [];
    if (!options.substituteType || !recipe.cost[options.substituteType]) return [];
    if (recipeId === "trade_platinum" && options.substituteType === "platinum") return [];
    baseCost = buildCostWithWood(recipe.cost, options.substituteType);
  }
  return getChoiceCostOptionsForCost(state.ruleset, recipe, counts, baseCost);
}

function getTradeCost(state, player, recipeId, options = {}) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe) return null;
  const counts = countCards(player.archive);
  let cost = recipe.cost;
  if (options.useWood) {
    const rules = state.ruleset.woodSubstitution;
    if (!rules?.allow) return null;
    if (sumCost(recipe.cost) < rules.minCost) return null;
    if ((counts.wood ?? 0) < 1) return null;
    if (!options.substituteType || !recipe.cost[options.substituteType]) return null;
    if (recipeId === "trade_platinum" && options.substituteType === "platinum") return null;
    cost = buildCostWithWood(recipe.cost, options.substituteType);
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
  if (!canPayCost(counts, cost)) return null;
  return cost;
}

function canConfirmCopperChoices(state, player, pending, options = {}) {
  if (!pending?.playedCards) return true;
  const copperCount = countCards(pending.playedCards).copper ?? 0;
  if (copperCount === 0) return true;
  const choices = Array.isArray(options.copperChoices) ? options.copperChoices : [];
  let choiceIndex = 0;
  const deckCounts = countCards(player.deck, state.ruleset.displayOrder);
  let remainingTin = deckCounts.tin ?? 0;
  let remainingZinc = deckCounts.zinc ?? 0;
  for (let i = 0; i < copperCount; i += 1) {
    const hasTin = remainingTin > 0;
    const hasZinc = remainingZinc > 0;
    if (!hasTin && !hasZinc) {
      continue;
    }
    if (hasTin && hasZinc) {
      const choice = choices[choiceIndex];
      if (choice !== "tin" && choice !== "zinc") return false;
      choiceIndex += 1;
      if (choice === "tin") {
        remainingTin -= 1;
      } else {
        remainingZinc -= 1;
      }
      continue;
    }
    if (hasTin) {
      remainingTin -= 1;
    } else {
      remainingZinc -= 1;
    }
  }
  return choiceIndex === choices.length;
}

export function canConfirmArchiveWithOptions(state, playerIndex, options = {}) {
  const pending = state.pendingArchive;
  if (!pending || pending.playerIndex !== playerIndex) return false;
  const player = state.players[playerIndex];
  return canConfirmCopperChoices(state, player, pending, options);
}

export function getWoodSubstitutionOptions(state, player, recipeId) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe) return [];
  const rules = state.ruleset.woodSubstitution;
  if (!rules?.allow) return [];
  if (sumCost(recipe.cost) < rules.minCost) return [];
  const counts = countCards(player.archive);
  if ((counts.wood ?? 0) < 1) return [];
  const options = [];
  Object.entries(recipe.cost).forEach(([type]) => {
    if (recipeId === "trade_platinum" && type === "platinum") return;
    const adjusted = buildCostWithWood(recipe.cost, type);
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
  let canPay = false;
  if (canPayCost(counts, recipe.cost)) {
    if (!recipe.choiceCost) {
      canPay = true;
    } else if (
      getChoiceCostOptionsForCost(state.ruleset, recipe, counts, recipe.cost).length > 0
    ) {
      canPay = true;
    }
  }
  if (!canPay) {
    const woodOptions = getWoodSubstitutionOptions(state, player, recipeId);
    for (const substituteType of woodOptions) {
      const adjusted = buildCostWithWood(recipe.cost, substituteType);
      if (!canPayCost(counts, adjusted)) continue;
      if (!recipe.choiceCost) {
        canPay = true;
        break;
      }
      if (
        getChoiceCostOptionsForCost(state.ruleset, recipe, counts, adjusted).length > 0
      ) {
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
    const drawn = drawCards(player, recipe.reward.count);
    detail.drawCount = drawn.length;
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

  const tutorFromDeck = (type) => {
    const rewardIndex = player.deck.findIndex((card) => getCardType(card) === type);
    if (rewardIndex === -1) return false;
    const [reward] = player.deck.splice(rewardIndex, 1);
    player.hand.push(reward);
    player.deck = shuffle(player.deck);
    return true;
  };

  const playedCounts = countCards(pending.playedCards);
  const copperCount = playedCounts.copper ?? 0;
  const tinCount = playedCounts.tin ?? 0;
  const zincCount = playedCounts.zinc ?? 0;
  const copperChoices = Array.isArray(options.copperChoices) ? options.copperChoices : [];
  let choiceIndex = 0;
  for (let i = 0; i < copperCount; i += 1) {
    const deckCounts = countCards(player.deck, state.ruleset.displayOrder);
    const hasTin = (deckCounts.tin ?? 0) > 0;
    const hasZinc = (deckCounts.zinc ?? 0) > 0;
    if (!hasTin && !hasZinc) continue;
    let choice = null;
    if (hasTin && hasZinc) {
      const requested = copperChoices[choiceIndex];
      choice = requested === "tin" || requested === "zinc" ? requested : "tin";
      choiceIndex += requested === "tin" || requested === "zinc" ? 1 : 0;
    } else {
      choice = hasTin ? "tin" : "zinc";
    }
    tutorFromDeck(choice);
  }
  for (let i = 0; i < tinCount; i += 1) {
    tutorFromDeck("copper");
  }
  for (let i = 0; i < zincCount; i += 1) {
    tutorFromDeck("copper");
  }

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
