import { createInitialState } from "./src/game/state.js";
import { countCards, shuffle } from "./src/shared/utils.js";

const MAX_PLAYS = 5;
const MAX_TRADES = 5;

const state = createInitialState();

const elements = {
  turnIndicator: document.getElementById("turnIndicator"),
  turnCounter: document.getElementById("turnCounter"),
  opponentSummary: document.getElementById("opponentSummary"),
  archiveCounts: document.getElementById("archiveCounts"),
  handCounts: document.getElementById("handCounts"),
  archivePile: document.getElementById("archivePile"),
  activeCards: document.getElementById("activeCards"),
  handCards: document.getElementById("handCards"),
  tradeInfo: document.getElementById("tradeInfo"),
  deckInfo: document.getElementById("deckInfo"),
  discardInfo: document.getElementById("discardInfo"),
  tradeBronze: document.getElementById("tradeBronze"),
  tradeSilver: document.getElementById("tradeSilver"),
  endTurn: document.getElementById("endTurn"),
  undoPlays: document.getElementById("undoPlays"),
  winnerPanel: document.getElementById("winnerPanel"),
  winnerText: document.getElementById("winnerText"),
  restartGame: document.getElementById("restartGame"),
  winnerOverlay: document.getElementById("winnerOverlay"),
  winnerModalText: document.getElementById("winnerModalText"),
  restartGameModal: document.getElementById("restartGameModal"),
  confirmOverlay: document.getElementById("confirmOverlay"),
  confirmSummary: document.getElementById("confirmSummary"),
  confirmCards: document.getElementById("confirmCards"),
  cancelArchive: document.getElementById("cancelArchive"),
  confirmArchive: document.getElementById("confirmArchive"),
  turnOverlay: document.getElementById("turnOverlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  startTurn: document.getElementById("startTurn"),
};

function drawCards(player, count) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (player.deck.length === 0) break;
    drawn.push(player.deck.pop());
  }
  player.hand.push(...drawn);
  return drawn;
}

function canTrade(player, type) {
  const archiveCounts = countCards(player.archive);
  const deckCounts = countCards(player.deck);
  if (state.tradesThisTurn >= MAX_TRADES) return false;
  if (type === "bronze") {
    return archiveCounts.bronze >= 5 && deckCounts.silver > 0;
  }
  return archiveCounts.silver >= 5 && deckCounts.gold > 0;
}

function trade(player, type) {
  if (!canTrade(player, type)) return;
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
  if (rewardIndex === -1) return;
  const [reward] = player.deck.splice(rewardIndex, 1);
  player.hand.push(reward);
  player.deck = shuffle(player.deck);
  state.tradesThisTurn += 1;
  render();
}

function playCard(index) {
  const player = currentPlayer();
  if (state.phase !== "main") return;
  if (player.active.length >= MAX_PLAYS) return;
  const [card] = player.hand.splice(index, 1);
  player.active.push(card);
  render();
}

function playCardByType(type) {
  const player = currentPlayer();
  if (state.phase !== "main") return;
  if (player.active.length >= MAX_PLAYS) return;
  const index = player.hand.findIndex((card) => card === type);
  if (index === -1) return;
  playCard(index);
}

function returnCard(index) {
  const player = currentPlayer();
  if (state.phase !== "main") return;
  const [card] = player.active.splice(index, 1);
  player.hand.push(card);
  render();
}

function returnAllCards() {
  const player = currentPlayer();
  if (state.phase !== "main") return;
  if (player.active.length === 0) return;
  player.hand.push(...player.active);
  player.active = [];
  render();
}

function endTurn() {
  const player = currentPlayer();
  if (state.phase !== "main") return;

  const playedCards = [...player.active];
  const counts = countCards(playedCards);
  const drawCount = counts.bronze + counts.silver * 2 + counts.gold * 3;
  state.pendingArchive = {
    playedCards,
    drawCount,
    playerIndex: state.currentPlayer,
  };
  state.phase = "confirm";
  render();
  showConfirmOverlay();
}

function declareWinner(playerIndex) {
  state.winner = playerIndex;
  elements.winnerText.textContent = `Player ${playerIndex + 1} wins!`;
  elements.winnerModalText.textContent = `Player ${playerIndex + 1} wins!`;
  elements.winnerOverlay.hidden = false;
  elements.turnOverlay.hidden = true;
}

function currentPlayer() {
  return state.players[state.currentPlayer];
}

function renderCards(container, cards, clickHandler) {
  container.innerHTML = "";
  cards.forEach((card, index) => {
    const el = document.createElement("div");
    el.className = `card ${card}`;
    el.innerHTML = `<div class="label">${card}</div><div class="stars">${
      card === "gold" ? "★★★★★" : card === "silver" ? "★★" : "★"
    }</div>`;
    el.addEventListener("click", () => clickHandler(index));
    container.appendChild(el);
  });
}

function renderHand(player) {
  if (player.hand.length <= 10) {
    renderCards(elements.handCards, player.hand, playCard);
    return;
  }

  elements.handCards.innerHTML = "";
  const counts = countCards(player.hand);
  ["gold", "silver", "bronze"].forEach((type) => {
    if (counts[type] === 0) return;
    const el = document.createElement("div");
    el.className = `card ${type} pile`;
    el.innerHTML = `<div class="label">${type}</div><div class="stars">${
      type === "gold" ? "★★★★★" : type === "silver" ? "★★" : "★"
    }</div><div class="pile-count">x ${counts[type]}</div>`;
    el.addEventListener("click", () => playCardByType(type));
    elements.handCards.appendChild(el);
  });
}

function render() {
  if (state.winner !== null) return;
  const player = currentPlayer();
  const opponent = state.players[state.currentPlayer === 0 ? 1 : 0];

  const handCounts = countCards(player.hand);
  const archiveCounts = countCards(player.archive);
  const opponentArchive = countCards(opponent.archive);

  elements.turnIndicator.textContent = `Player ${state.currentPlayer + 1}'s Turn`;
  elements.turnCounter.textContent = `Turn ${state.turnCount}`;
  elements.opponentSummary.textContent = `Opponent Archive — Bronze ${
    opponentArchive.bronze
  } / Silver ${opponentArchive.silver} / Gold ${opponentArchive.gold}`;

  elements.archiveCounts.textContent = `Bronze ${archiveCounts.bronze} · Silver ${archiveCounts.silver} · Gold ${archiveCounts.gold}`;
  elements.handCounts.textContent = `Bronze ${handCounts.bronze} · Silver ${handCounts.silver} · Gold ${handCounts.gold}`;

  elements.deckInfo.textContent = `Deck: ${player.deck.length} cards`;
  elements.discardInfo.textContent = `Discard: ${player.discard.length} cards`;
  elements.tradeInfo.textContent = `Trades used: ${state.tradesThisTurn}/${MAX_TRADES}`;

  renderHand(player);
  renderCards(elements.activeCards, player.active, returnCard);

  elements.archivePile.innerHTML = "";
  ["bronze", "silver", "gold"].forEach((type) => {
    const badge = document.createElement("div");
    badge.className = `chip ${type}`;
    badge.textContent = `${type} x ${archiveCounts[type]}`;
    elements.archivePile.appendChild(badge);
  });

  const inMainPhase = state.phase === "main";
  elements.tradeBronze.disabled = !inMainPhase || !canTrade(player, "bronze");
  elements.tradeSilver.disabled = !inMainPhase || !canTrade(player, "silver");
  elements.endTurn.disabled = state.phase !== "main";
  elements.undoPlays.disabled = !inMainPhase || player.active.length === 0;
}

function showOverlay() {
  elements.overlayTitle.textContent = `Player ${state.currentPlayer + 1}, ready?`;
  elements.turnOverlay.hidden = false;
}

function showConfirmOverlay() {
  const pending = state.pendingArchive;
  if (!pending) return;
  const counts = countCards(pending.playedCards);
  elements.confirmSummary.textContent = `Archive ${pending.playedCards.length} card(s) and draw ${pending.drawCount} card(s).`;
  elements.confirmCards.innerHTML = "";
  ["bronze", "silver", "gold"].forEach((type) => {
    if (counts[type] === 0) return;
    const badge = document.createElement("div");
    badge.className = `chip ${type}`;
    badge.textContent = `${type} x ${counts[type]}`;
    elements.confirmCards.appendChild(badge);
  });
  if (pending.playedCards.length === 0) {
    const note = document.createElement("div");
    note.className = "muted";
    note.textContent = "No active cards to archive this turn.";
    elements.confirmCards.appendChild(note);
  }
  elements.confirmOverlay.hidden = false;
}

function finalizeArchive() {
  const pending = state.pendingArchive;
  if (!pending) return;
  const player = state.players[pending.playerIndex];

  player.archive.push(...pending.playedCards);
  player.active = [];
  drawCards(player, pending.drawCount);

  state.pendingArchive = null;
  elements.confirmOverlay.hidden = true;

  if (countCards(player.archive).gold >= 5) {
    declareWinner(pending.playerIndex);
    return;
  }

  state.tradesThisTurn = 0;
  state.currentPlayer = pending.playerIndex === 0 ? 1 : 0;
  state.turnCount += 1;
  state.phase = "between";
  showOverlay();
}

function cancelArchive() {
  state.pendingArchive = null;
  state.phase = "main";
  elements.confirmOverlay.hidden = true;
  render();
}

function startTurn() {
  state.phase = "main";
  elements.turnOverlay.hidden = true;
  render();
}

function resetGame() {
  const freshState = createInitialState();
  state.players = freshState.players;
  state.currentPlayer = freshState.currentPlayer;
  state.tradesThisTurn = freshState.tradesThisTurn;
  state.phase = freshState.phase;
  state.winner = freshState.winner;
  state.turnCount = freshState.turnCount;
  state.pendingArchive = freshState.pendingArchive;
  elements.winnerPanel.hidden = true;
  elements.winnerOverlay.hidden = true;
  elements.confirmOverlay.hidden = true;

  state.players.forEach((player) => drawCards(player, 5));
  render();
}

function wireEvents() {
  elements.tradeBronze.addEventListener("click", () => trade(currentPlayer(), "bronze"));
  elements.tradeSilver.addEventListener("click", () => trade(currentPlayer(), "silver"));
  elements.endTurn.addEventListener("click", endTurn);
  elements.undoPlays.addEventListener("click", returnAllCards);
  elements.restartGame.addEventListener("click", resetGame);
  elements.restartGameModal.addEventListener("click", resetGame);
  elements.confirmArchive.addEventListener("click", finalizeArchive);
  elements.cancelArchive.addEventListener("click", cancelArchive);
  elements.startTurn.addEventListener("click", startTurn);
}

wireEvents();
resetGame();
