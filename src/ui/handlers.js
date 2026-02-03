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
} from "../game/rules.js";
import { renderApp, showConfirmOverlay, showTurnOverlay } from "./render.js";
import { createInitialState } from "../game/state.js";

export function createHandlers(state, elements, onWinner) {
  function currentPlayer() {
    return getCurrentPlayer(state);
  }

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

  function finalizeArchive() {
    const result = applyFinalizeArchive(state);
    elements.confirmOverlay.hidden = true;

    if (result.winnerIndex !== null && result.winnerIndex !== undefined) {
      onWinner(result.winnerIndex);
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

  return handlers;
}
