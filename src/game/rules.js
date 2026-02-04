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

export function canTrade(state, player, type) {
  const archiveCounts = countCards(player.archive);
  const deckCounts = countCards(player.deck);
  if (state.tradesThisTurn >= state.ruleset.maxTrades) return false;
  const tradeUp = state.ruleset.cardTypes[type]?.tradeUp;
  if (!tradeUp) return false;
  return archiveCounts[type] >= tradeUp.cost && deckCounts[tradeUp.to] > 0;
}

export function performTrade(state, player, type) {
  if (!canTrade(state, player, type)) return false;
  const tradeUp = state.ruleset.cardTypes[type].tradeUp;
  const costType = type;
  const rewardType = tradeUp.to;

  let removed = 0;
  player.archive = player.archive.filter((card) => {
    if (getCardType(card) === costType && removed < tradeUp.cost) {
      removed += 1;
      player.discard.push(card);
      return false;
    }
    return true;
  });

  const rewardIndex = player.deck.findIndex((card) => getCardType(card) === rewardType);
  if (rewardIndex === -1) return false;
  const [reward] = player.deck.splice(rewardIndex, 1);
  player.hand.push(reward);
  player.deck = shuffle(player.deck);
  state.tradesThisTurn += 1;
  return true;
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
      return { event: performTrade(state, player, action.payload.type) ? null : null };
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
