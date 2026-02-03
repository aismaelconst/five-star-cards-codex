import { createInitialState } from "./src/game/state.js";
import {
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
import { renderApp, showConfirmOverlay, showTurnOverlay } from "./src/ui/render.js";
import { wireEvents } from "./src/ui/events.js";


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

const handlers = {
  trade,
  playCard,
  playCardByType,
  returnCard,
  returnAllCards,
  endTurn,
  confirmArchive: finalizeArchive,
  cancelArchive,
  resetGame,
  startTurn,
};

function trade(type) {
  const player = currentPlayer();
  if (!applyTrade(state, player, type)) return;
  renderApp(state, elements, handlers);
}

function playCard(index) {
  const player = currentPlayer();
  if (!applyPlayCard(state, player, index)) return;
  renderApp(state, elements, handlers);
}

function playCardByType(type) {
  const player = currentPlayer();
  if (!applyPlayCardByType(state, player, type)) return;
  renderApp(state, elements, handlers);
}

function returnCard(index) {
  const player = currentPlayer();
  if (!applyReturnCard(state, player, index)) return;
  renderApp(state, elements, handlers);
}

function returnAllCards() {
  const player = currentPlayer();
  if (!applyReturnAllCards(state, player)) return;
  renderApp(state, elements, handlers);
}

function endTurn() {
  if (state.phase !== "main") return;
  const pending = prepareArchive(state);
  if (!pending) return;
  renderApp(state, elements, handlers);
  showConfirmOverlay(state, elements);
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

function finalizeArchive() {
  const result = applyFinalizeArchive(state);
  elements.confirmOverlay.hidden = true;

  if (result.winnerIndex !== null && result.winnerIndex !== undefined) {
    declareWinner(result.winnerIndex);
    return;
  }

  showTurnOverlay(state, elements);
  renderApp(state, elements, handlers);
}

function cancelArchive() {
  applyCancelArchive(state);
  elements.confirmOverlay.hidden = true;
  renderApp(state, elements, handlers);
}

function startTurn() {
  state.phase = "main";
  elements.turnOverlay.hidden = true;
  renderApp(state, elements, handlers);
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
  renderApp(state, elements, handlers);
}

wireEvents(elements, handlers);
resetGame();
