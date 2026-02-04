import { ActionTypes, applyAction, drawCards } from "../game/rules.js";
import { renderApp, showConfirmOverlay, showTurnOverlay } from "./render.js";
import { createInitialState } from "../game/state.js";

export function createHandlers(state, elements, onWinner) {
  function showModePicker() {
    elements.modeOverlay.hidden = false;
  }

  function selectOfflineMode() {
    state.mode = "offline";
    elements.modeOverlay.hidden = true;
    resetGame();
  }

  function selectOnlineMode() {
    state.mode = "online";
    elements.modeOverlay.hidden = false;
    elements.onlineNote.textContent = "Online mode is coming soon.";
  }

  function trade(type) {
    applyAction(state, { type: ActionTypes.TRADE, payload: { type } });
    renderApp(state, elements, handlers);
  }

  function playCard(index) {
    applyAction(state, { type: ActionTypes.PLAY_CARD, payload: { index } });
    renderApp(state, elements, handlers);
  }

  function playCardByType(type) {
    applyAction(state, { type: ActionTypes.PLAY_CARD_BY_TYPE, payload: { type } });
    renderApp(state, elements, handlers);
  }

  function returnCard(index) {
    applyAction(state, { type: ActionTypes.RETURN_CARD, payload: { index } });
    renderApp(state, elements, handlers);
  }

  function returnAllCards() {
    applyAction(state, { type: ActionTypes.RETURN_ALL });
    renderApp(state, elements, handlers);
  }

  function endTurn() {
    if (state.phase !== "main") return;
    applyAction(state, { type: ActionTypes.END_TURN });
    renderApp(state, elements, handlers);
    showConfirmOverlay(state, elements);
  }

  function finalizeArchive() {
    const result = applyAction(state, { type: ActionTypes.CONFIRM_ARCHIVE });
    elements.confirmOverlay.hidden = true;

    if (result.event?.winnerIndex !== null && result.event?.winnerIndex !== undefined) {
      onWinner(result.event.winnerIndex);
      return;
    }

    showTurnOverlay(state, elements);
    renderApp(state, elements, handlers);
  }

  function cancelArchive() {
    applyAction(state, { type: ActionTypes.CANCEL_ARCHIVE });
    elements.confirmOverlay.hidden = true;
    renderApp(state, elements, handlers);
  }

  function startTurn() {
    applyAction(state, { type: ActionTypes.START_TURN });
    elements.turnOverlay.hidden = true;
    renderApp(state, elements, handlers);
  }

  function resetGame() {
    const freshState = createInitialState({ mode: state.mode });
    state.players = freshState.players;
    state.currentPlayer = freshState.currentPlayer;
    state.tradesThisTurn = freshState.tradesThisTurn;
    state.phase = freshState.phase;
    state.winner = freshState.winner;
    state.turnCount = freshState.turnCount;
    state.pendingArchive = freshState.pendingArchive;
    state.gameId = freshState.gameId;
    state.ruleset = freshState.ruleset;
    elements.winnerPanel.hidden = true;
    elements.winnerOverlay.hidden = true;
    elements.confirmOverlay.hidden = true;

    state.players.forEach((player) => drawCards(player, 5));
    renderApp(state, elements, handlers);
  }

  const handlers = {
    showModePicker,
    selectOfflineMode,
    selectOnlineMode,
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
