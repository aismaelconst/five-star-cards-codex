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
  const canPay =
    canPayCost(counts, recipe.cost) ||
    getWoodSubstitutionOptions(state, player, recipeId).length > 0;
  if (!canPay) return false;
  if (recipe.reward === "any") {
    return player.deck.length > 0;
  }
  if (recipe.reward === "dig_non_bronze_silver") {
    return true;
  }
  const deckCounts = countCards(player.deck);
  return (deckCounts[recipe.reward] ?? 0) > 0;
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
  const rules = state.ruleset.woodSubstitution;
  const counts = countCards(player.archive);
  let cost = recipe.cost;
  if (options.useWood) {
    if (!rules?.allow) return false;
    if (sumCost(recipe.cost) < rules.minCost) return false;
    if ((counts.wood ?? 0) < 1) return false;
    if (!options.substituteType || !recipe.cost[options.substituteType]) return false;
    if (recipeId === "trade_platinum" && options.substituteType === "platinum") return false;
    cost = buildCostWithWood(recipe.cost, options.substituteType);
  }
  if (!canPayCost(counts, cost)) return false;
  if (recipe.reward === "any") {
    if (!options.rewardType) return false;
    const deckCounts = countCards(player.deck);
    return (deckCounts[options.rewardType] ?? 0) > 0;
  }
  if (recipe.reward === "dig_non_bronze_silver") {
    return true;
  }
  const deckCounts = countCards(player.deck);
  return (deckCounts[recipe.reward] ?? 0) > 0;
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
  let cost = recipe.cost;
  if (options.useWood && options.substituteType) {
    cost = buildCostWithWood(recipe.cost, options.substituteType);
  }
  Object.entries(cost).forEach(([type, amount]) => {
    if (amount > 0) {
      removeCardsFromArchive(player, type, amount);
    }
  });

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
  } else {
    const rewardIndex = player.deck.findIndex(
      (card) => getCardType(card) === recipe.reward
    );
    if (rewardIndex !== -1) {
      const [reward] = player.deck.splice(rewardIndex, 1);
      player.hand.push(reward);
      player.deck = shuffle(player.deck);
      detail.rewardType = recipe.reward;
    }
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

export function finalizeArchive(state) {
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
      return { event: finalizeArchive(state) };
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
