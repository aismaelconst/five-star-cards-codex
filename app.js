import { createInitialState } from "./src/game/state.js";
import {
  MAX_TRADES,
  canTrade,
  cancelArchive as applyCancelArchive,
  finalizeArchive as applyFinalizeArchive,
  getCurrentPlayer,
  performTrade as applyTrade,
  playCard as applyPlayCard,
  playCardByType as applyPlayCardByType,
  prepareArchive,
  returnAllCards as applyReturnAllCards,
  returnCard as applyReturnCard,
  drawCards,
} from "./src/game/rules.js";
import { countCards } from "./src/shared/utils.js";


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

function trade(type) {
  const player = currentPlayer();
  if (!applyTrade(state, player, type)) return;
  render();
}

function playCard(index) {
  const player = currentPlayer();
  if (!applyPlayCard(state, player, index)) return;
  render();
}

function playCardByType(type) {
  const player = currentPlayer();
  if (!applyPlayCardByType(state, player, type)) return;
  render();
}

function returnCard(index) {
  const player = currentPlayer();
  if (!applyReturnCard(state, player, index)) return;
  render();
}

function returnAllCards() {
  const player = currentPlayer();
  if (!applyReturnAllCards(state, player)) return;
  render();
}

function endTurn() {
  if (state.phase !== "main") return;
  const pending = prepareArchive(state);
  if (!pending) return;
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
  return getCurrentPlayer(state);
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
  elements.tradeBronze.disabled = !inMainPhase || !canTrade(state, player, "bronze");
  elements.tradeSilver.disabled = !inMainPhase || !canTrade(state, player, "silver");
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
  const result = applyFinalizeArchive(state);
  elements.confirmOverlay.hidden = true;

  if (result.winnerIndex !== null && result.winnerIndex !== undefined) {
    declareWinner(result.winnerIndex);
    return;
  }

  showOverlay();
  render();
}

function cancelArchive() {
  applyCancelArchive(state);
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
  elements.tradeBronze.addEventListener("click", () => trade("bronze"));
  elements.tradeSilver.addEventListener("click", () => trade("silver"));
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
