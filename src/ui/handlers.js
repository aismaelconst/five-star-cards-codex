import { ActionTypes, applyAction } from "../game/rules.js";
import { renderApp, showConfirmOverlay, showTurnOverlay } from "./render.js";
import { createInitialState } from "../game/state.js";
import { createOnlineClient } from "../online/client.js";
import { startGame } from "../game/lifecycle.js";

export function createHandlers(state, elements, onWinner, options = {}) {
  const socketUrl = options.socketUrl ?? "ws://localhost:8080";
  const clientFactory = options.clientFactory ?? createOnlineClient;
  let onlineClient = null;

  function ensureOnlineClient() {
    try {
      if (!onlineClient) {
        onlineClient = clientFactory({
          url: socketUrl,
          onMessage: handleServerMessage,
          onStatus: handleConnectionStatus,
        });
      }
      onlineClient.connect();
      return true;
    } catch (error) {
      setStatus("Unable to connect to server.");
      return false;
    }
  }

  function setStatus(text) {
    if (state.online.role === "guest") {
      if (elements.guestStatus) elements.guestStatus.textContent = text;
      return;
    }
    if (elements.hostStatus) elements.hostStatus.textContent = text;
  }

  function handleConnectionStatus(status) {
    state.online.connection = status;
    setStatus(`Connection: ${status}`);
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
      elements.roomCodeInput.value = message.roomId;
      elements.guestRoomCodeInput.value = message.roomId;
      setStatus(`Connected to room ${message.roomId}.`);
      if (state.online.role === "host") {
        elements.readyButton.disabled = false;
      }
      if (state.online.role === "guest") {
        elements.readyButtonGuest.disabled = false;
      }
      return;
    }
    if (message.type === "lobby_update") {
      const readyCount = message.players.filter((player) => player.ready).length;
      setStatus(`${readyCount}/${message.players.length} ready`);
      return;
    }
    if (message.type === "game_start") {
      applyServerState(message);
      elements.modeOverlay.hidden = true;
      elements.onlineChoiceOverlay.hidden = true;
      elements.hostOverlay.hidden = true;
      elements.guestOverlay.hidden = true;
      setStatus("Game started!");
      return;
    }
    if (message.type === "error") {
      setStatus(message.message);
    }
  }
  function showModePicker() {
    elements.modeOverlay.hidden = false;
  }

  function selectOfflineMode() {
    state.mode = "offline";
    elements.modeOverlay.hidden = true;
    elements.onlineChoiceOverlay.hidden = true;
    elements.hostOverlay.hidden = true;
    elements.guestOverlay.hidden = true;
    resetGame();
  }

  function selectOnlineMode() {
    state.mode = "online";
    elements.modeOverlay.hidden = true;
    elements.onlineChoiceOverlay.hidden = false;
    elements.hostOverlay.hidden = true;
    elements.guestOverlay.hidden = true;
    if (elements.hostStatus) elements.hostStatus.textContent = "";
    if (elements.guestStatus) elements.guestStatus.textContent = "";
    elements.readyButton.disabled = true;
    elements.readyButtonGuest.disabled = true;
  }

  function chooseCreate() {
    elements.onlineChoiceOverlay.hidden = true;
    elements.hostOverlay.hidden = false;
    elements.guestOverlay.hidden = true;
    setStatus("Create a room to get a code.");
    elements.readyButton.disabled = true;
  }

  function chooseJoin() {
    elements.onlineChoiceOverlay.hidden = true;
    elements.guestOverlay.hidden = false;
    elements.hostOverlay.hidden = true;
    setStatus("Enter a room code to join.");
    elements.readyButtonGuest.disabled = true;
  }

  function backToChoice() {
    elements.hostOverlay.hidden = true;
    elements.guestOverlay.hidden = true;
    elements.onlineChoiceOverlay.hidden = false;
    if (elements.hostStatus) elements.hostStatus.textContent = "";
    if (elements.guestStatus) elements.guestStatus.textContent = "";
  }

  function createRoom() {
    state.mode = "online";
    setStatus("Creating room...");
    if (!ensureOnlineClient()) return;
    const playerName = elements.playerNameInput.value.trim() || "Host";
    state.online.role = "host";
    state.online.status = "waiting";
    state.online.playerName = playerName;
    elements.roomCodeInput.value = "";
    elements.readyButton.disabled = true;
    onlineClient.send({ type: "create_room", playerName });
  }

  function joinRoom() {
    state.mode = "online";
    setStatus("Joining room...");
    if (!ensureOnlineClient()) return;
    const roomId = elements.guestRoomCodeInput.value.trim().toUpperCase();
    if (!roomId) {
      setStatus("Enter a room code to join.");
      return;
    }
    const playerName = elements.guestNameInput.value.trim() || "Guest";
    state.online.roomId = roomId;
    state.online.role = "guest";
    state.online.status = "joined";
    state.online.playerName = playerName;
    setStatus(`Joined room ${roomId}. Waiting to start...`);
    elements.readyButtonGuest.disabled = false;
    onlineClient.send({ type: "join_room", roomId, playerName });
  }

  function readyUp() {
    if (!state.online.roomId || !state.online.playerId) {
      setStatus("Join a room before readying up.");
      return;
    }
    if (!onlineClient) {
      if (!ensureOnlineClient()) return;
    }
    setStatus("Ready! Waiting for opponent...");
    onlineClient.send({
      type: "ready_up",
      roomId: state.online.roomId,
      playerId: state.online.playerId,
    });
  }

  async function copyRoomCode() {
    const code = elements.roomCodeInput.value.trim();
    if (!code) {
      setStatus("Create a room first to get a code.");
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
      setStatus("Room code copied.");
      return;
    }
    setStatus(`Room code: ${code}`);
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
        setStatus("Unable to send action to server.");
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

    startGame(state);
    renderApp(state, elements, handlers);
  }

  const handlers = {
    showModePicker,
    selectOfflineMode,
    selectOnlineMode,
    createRoom,
    joinRoom,
    backToChoice,
    copyRoomCode,
    readyUp,
    chooseCreate,
    chooseJoin,
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
