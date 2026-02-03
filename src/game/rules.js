import { countCards, shuffle } from "../shared/utils.js";

export const MAX_PLAYS = 5;
export const MAX_TRADES = 5;

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
  if (state.tradesThisTurn >= MAX_TRADES) return false;
  if (type === "bronze") {
    return archiveCounts.bronze >= 5 && deckCounts.silver > 0;
  }
  return archiveCounts.silver >= 5 && deckCounts.gold > 0;
}

export function performTrade(state, player, type) {
  if (!canTrade(state, player, type)) return false;
  const costType = type;
  const rewardType = type === "bronze" ? "silver" : "gold";

  let removed = 0;
  player.archive = player.archive.filter((card) => {
    if (card === costType && removed < 5) {
      removed += 1;
      player.discard.push(card);
      return false;
    }
    return true;
  });

  const rewardIndex = player.deck.findIndex((card) => card === rewardType);
  if (rewardIndex === -1) return false;
  const [reward] = player.deck.splice(rewardIndex, 1);
  player.hand.push(reward);
  player.deck = shuffle(player.deck);
  state.tradesThisTurn += 1;
  return true;
}

export function playCard(state, player, index) {
  if (state.phase !== "main") return false;
  if (player.active.length >= MAX_PLAYS) return false;
  const [card] = player.hand.splice(index, 1);
  if (!card) return false;
  player.active.push(card);
  return true;
}

export function playCardByType(state, player, type) {
  const index = player.hand.findIndex((card) => card === type);
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
  const counts = countCards(playedCards);
  const drawCount = counts.bronze + counts.silver * 2 + counts.gold * 3;
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

  if (countCards(player.archive).gold >= 5) {
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
