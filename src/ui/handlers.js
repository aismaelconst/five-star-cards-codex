import { ActionTypes, applyAction, drawCards } from "../game/rules.js";
import { renderApp, showConfirmOverlay, showTurnOverlay } from "./render.js";
import { createInitialState } from "../game/state.js";
import { createOnlineClient } from "../online/client.js";

export function createHandlers(state, elements, onWinner, options = {}) {
  const socketUrl = options.socketUrl ?? "ws://localhost:8080";
  const clientFactory = options.clientFactory ?? createOnlineClient;
  let onlineClient = null;

  function ensureOnlineClient() {
    if (!onlineClient) {
      onlineClient = clientFactory({
        url: socketUrl,
        onMessage: handleServerMessage,
        onStatus: handleConnectionStatus,
      });
    }
    onlineClient.connect();
  }

  function handleConnectionStatus(status) {
    state.online.connection = status;
    if (elements.lobbyStatus) {
      elements.lobbyStatus.textContent = `Connection: ${status}`;
    }
  }

  function applyServerState(payload) {
    if (!payload?.state) return;
    state.players = payload.state.players;
    state.currentPlayer = payload.state.currentPlayer;
    state.tradesThisTurn = payload.state.tradesThisTurn;
    state.phase = payload.state.phase;
    state.winner = payload.state.winner;
    state.turnCount = payload.state.turnCount;
    state.pendingArchive = payload.state.pendingArchive;
    state.gameId = payload.state.gameId;
    state.ruleset = payload.state.ruleset;
    state.online.roomId = payload.roomId ?? state.online.roomId;
    state.online.playerId = payload.playerId ?? state.online.playerId;
    renderApp(state, elements, handlers);
  }

  function handleServerMessage(message) {
    if (message.type === "state_update") {
      applyServerState(message);
      return;
    }
    if (message.type === "room_created" || message.type === "room_joined") {
      state.online.roomId = message.roomId;
      state.online.playerId = message.playerId;
      applyServerState(message);
      elements.lobbyStatus.textContent = `Connected to room ${message.roomId}.`;
      return;
    }
    if (message.type === "error") {
      elements.lobbyStatus.textContent = message.message;
    }
  }
  function showModePicker() {
    elements.modeOverlay.hidden = false;
  }

  function selectOfflineMode() {
    state.mode = "offline";
    elements.modeOverlay.hidden = true;
    elements.onlineLobby.hidden = true;
    resetGame();
  }

  function selectOnlineMode() {
    state.mode = "online";
    elements.modeOverlay.hidden = false;
    elements.onlineNote.textContent = "Lobby ready. Multiplayer coming soon.";
    elements.onlineLobby.hidden = false;
  }

  function createRoom() {
    state.mode = "online";
    ensureOnlineClient();
    const playerName = elements.playerNameInput.value.trim() || "Host";
    state.online.role = "host";
    state.online.status = "waiting";
    state.online.playerName = playerName;
    elements.roomCodeInput.value = "";
    elements.lobbyStatus.textContent = "Creating room...";
    onlineClient.send({ type: "create_room", playerName });
  }

  function joinRoom() {
    state.mode = "online";
    ensureOnlineClient();
    const roomId = elements.roomCodeInput.value.trim().toUpperCase();
    if (!roomId) {
      elements.lobbyStatus.textContent = "Enter a room code to join.";
      return;
    }
    const playerName = elements.playerNameInput.value.trim() || "Guest";
    state.online.roomId = roomId;
    state.online.role = "guest";
    state.online.status = "joined";
    state.online.playerName = playerName;
    elements.lobbyStatus.textContent = `Joined room ${roomId}. Waiting to start...`;
    onlineClient.send({ type: "join_room", roomId, playerName });
  }

  function sendOrApply(action) {
    if (state.mode === "online" && onlineClient) {
      const ok = onlineClient.send({
        type: "action",
        roomId: state.online.roomId,
        playerId: state.online.playerId,
        action,
      });
      if (!ok) {
        elements.lobbyStatus.textContent = "Unable to send action to server.";
      }
      return;
    }
    return applyAction(state, action);
  }

  function trade(type) {
    sendOrApply({ type: ActionTypes.TRADE, payload: { type } });
    renderApp(state, elements, handlers);
  }

  function playCard(index) {
    sendOrApply({ type: ActionTypes.PLAY_CARD, payload: { index } });
    renderApp(state, elements, handlers);
  }

  function playCardByType(type) {
    sendOrApply({ type: ActionTypes.PLAY_CARD_BY_TYPE, payload: { type } });
    renderApp(state, elements, handlers);
  }

  function returnCard(index) {
    sendOrApply({ type: ActionTypes.RETURN_CARD, payload: { index } });
    renderApp(state, elements, handlers);
  }

  function returnAllCards() {
    sendOrApply({ type: ActionTypes.RETURN_ALL });
    renderApp(state, elements, handlers);
  }

  function endTurn() {
    if (state.phase !== "main") return;
    sendOrApply({ type: ActionTypes.END_TURN });
    renderApp(state, elements, handlers);
    showConfirmOverlay(state, elements);
  }

  function finalizeArchive() {
    const result = sendOrApply({ type: ActionTypes.CONFIRM_ARCHIVE });
    elements.confirmOverlay.hidden = true;

    if (state.mode !== "online") {
      if (result.event?.winnerIndex !== null && result.event?.winnerIndex !== undefined) {
        onWinner(result.event.winnerIndex);
        return;
      }

      showTurnOverlay(state, elements);
      renderApp(state, elements, handlers);
    }
  }

  function cancelArchive() {
    sendOrApply({ type: ActionTypes.CANCEL_ARCHIVE });
    elements.confirmOverlay.hidden = true;
    renderApp(state, elements, handlers);
  }

  function startTurn() {
    sendOrApply({ type: ActionTypes.START_TURN });
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
    state.online = freshState.online;
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
    createRoom,
    joinRoom,
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
