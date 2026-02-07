import {
  ActionTypes,
  applyAction,
  canInitiateTrade,
  getWoodSubstitutionOptions,
} from "../game/rules.js";
import { renderApp, showConfirmOverlay, showTurnOverlay } from "./render.js";
import { createInitialState } from "../game/state.js";
import { createOnlineClient } from "../online/client.js";
import { startGame } from "../game/lifecycle.js";
import { isMyTurn } from "../game/multiplayer.js";
import { countCards } from "../shared/utils.js";

export function createHandlers(state, elements, onWinner, options = {}) {
  const socketUrl = options.socketUrl ?? resolveSocketUrl();
  const clientFactory = options.clientFactory ?? createOnlineClient;
  let onlineClient = null;
  let gameOverTimer = null;
  let toastTimer = null;
  let pendingTrade = null;
  let pendingWoodChoice = null;
  let pendingGemChoice = null;

  function resolveSocketUrl() {
    if (typeof window !== "undefined" && window.location) {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      return `${protocol}://${window.location.host}`;
    }
    return "ws://localhost:8080";
  }

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
    state.format = payload.state.format;
    state.online.roomId = payload.roomId ?? state.online.roomId;
    state.online.playerId = payload.playerId ?? state.online.playerId;
    updateFormatButtons();
    renderApp(state, elements, handlers);
    if (state.mode !== "online" && state.winner !== null && state.winner !== undefined) {
      onWinner(state.winner);
    }
  }

  function updateDebug(message) {
    if (!elements.debugInfo) return;
    const currentName =
      state.players?.[state.currentPlayer]?.name ?? `Player ${state.currentPlayer + 1}`;
    elements.debugInfo.textContent = `${message.type} | phase: ${state.phase} | turn: ${currentName} | winner: ${state.winner ?? "none"}`;
  }

  function hideActionToast() {
    if (!elements.actionToast) return;
    elements.actionToast.classList.remove("visible");
    elements.actionToast.hidden = true;
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
  }

  function showActionToast(message) {
    if (!elements.actionToast || !elements.actionToastText) return;
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    elements.actionToastText.textContent = message;
    elements.actionToast.hidden = false;
    elements.actionToast.classList.add("visible");
    toastTimer = setTimeout(() => {
      hideActionToast();
    }, 2000);
  }

  function formatPlatinumMessage(prefix, event) {
    const woodNote =
      event.useWood && event.substituteType
        ? ` (wood replaced ${event.substituteType})`
        : "";
    const discardedCount =
      typeof event.digDiscardedCount === "number" ? event.digDiscardedCount : 0;
    const discarded = ` Discarded ${discardedCount} bronze/silver.`;
    const reward = event.rewardType ? ` Found ${event.rewardType}.` : " Deck exhausted.";
    return `${prefix}${woodNote}.${discarded}${reward}`;
  }

  function handleOpponentEvent(message) {
    if (!elements.opponentAlert) return;
    const event = message.lastEvent;
    if (!event) return;
    if (event.playerId === state.online.playerId) return;
    if (event.type === "trade") {
      const woodNote =
        event.useWood && event.substituteType
          ? ` (wood replaced ${event.substituteType})`
          : "";
      if (event.recipeId === "trade_gem_set") {
        const reward = event.rewardType ? ` for 1 ${event.rewardType}` : "";
        elements.opponentAlert.textContent = `Opponent traded ruby, emerald, sapphire${reward}${woodNote}.`;
        return;
      }
      if (event.recipeId === "trade_platinum") {
        elements.opponentAlert.textContent = formatPlatinumMessage(
          "Opponent used platinum to dig",
          event
        );
        return;
      }
      elements.opponentAlert.textContent = `Opponent traded ${event.cost} ${event.from} for 1 ${event.to}${woodNote}.`;
      return;
    }
    if (event.type === "archive") {
      const parts = Object.entries(event.counts ?? {})
        .filter(([, value]) => value)
        .map(([type, value]) => `${value} ${type}`);
      const summary = parts.length ? parts.join(", ") : "no cards";
      elements.opponentAlert.textContent = `Opponent archived ${summary} (drew ${event.drawCount}).`;
    }
  }

  function handleSelfPlatinumToast(message) {
    const event = message.lastEvent;
    if (!event || event.type !== "trade" || event.recipeId !== "trade_platinum") return;
    const selfId = message.playerId ?? state.online.playerId;
    if (!selfId || event.playerId !== selfId) return;
    showActionToast(formatPlatinumMessage("Platinum dig", event));
  }

  function handleServerMessage(message) {
    updateDebug(message);
    handleSelfPlatinumToast(message);
    handleOpponentEvent(message);
    if (message.type === "state_update") {
      applyServerState(message);
      if (state.mode === "online") {
        if (state.phase === "confirm" && isMyTurn(state)) {
          showConfirmOverlay(state, elements);
        } else {
          elements.confirmOverlay.hidden = true;
        }
      }
      return;
    }
    if (message.type === "room_created" || message.type === "room_joined") {
      state.online.roomId = message.roomId;
      state.online.playerId = message.playerId;
      applyServerState(message);
      elements.roomCodeInput.value = message.roomId;
      elements.guestRoomCodeInput.value = message.roomId;
      const formatLabel = state.format === "expanded" ? "EXPANDED" : "CORE";
      setStatus(`Connected to room ${message.roomId}. Format: ${formatLabel}.`);
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
      if (state.online.role === "host") elements.readyButton.disabled = true;
      if (state.online.role === "guest") elements.readyButtonGuest.disabled = true;
      if (state.mode === "online") {
        if (state.phase === "confirm" && isMyTurn(state)) {
          showConfirmOverlay(state, elements);
        } else {
          elements.confirmOverlay.hidden = true;
        }
      }
      return;
    }
    if (message.type === "error") {
      setStatus(message.message);
    }
    if (message.type === "game_over") {
      const winnerName = message.winnerName ?? "Opponent";
      if (elements.winnerModalText) {
        elements.winnerModalText.textContent = `${winnerName} wins!`;
      }
      if (elements.winnerModalMessage) {
        elements.winnerModalMessage.textContent = "Returning to mode selection...";
      }
      if (elements.restartGameModal) {
        elements.restartGameModal.hidden = true;
      }
      elements.winnerOverlay.hidden = false;
      setStatus(`${winnerName} wins! Returning to mode select.`);
      if (gameOverTimer) {
        clearTimeout(gameOverTimer);
      }
      gameOverTimer = setTimeout(() => {
        returnToModeSelect();
        gameOverTimer = null;
      }, 1500);
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
    if (elements.formatOverlay) {
      updateFormatButtons();
      elements.formatOverlay.hidden = false;
    } else {
      startOfflineGame("core");
    }
  }

  function selectOnlineMode() {
    state.mode = "online";
    state.format = state.format ?? "core";
    elements.modeOverlay.hidden = true;
    if (elements.formatOverlay) {
      elements.formatOverlay.hidden = true;
    }
    elements.onlineChoiceOverlay.hidden = false;
    elements.hostOverlay.hidden = true;
    elements.guestOverlay.hidden = true;
    if (elements.hostStatus) elements.hostStatus.textContent = "";
    if (elements.guestStatus) elements.guestStatus.textContent = "";
    elements.readyButton.disabled = true;
    elements.readyButtonGuest.disabled = true;
    updateFormatButtons();
  }

  function updateFormatButtons() {
    const isCore = state.format !== "expanded";
    const toggle = (el, active) => {
      if (!el) return;
      el.classList.toggle("active", active);
      el.setAttribute("aria-pressed", active ? "true" : "false");
    };
    toggle(elements.formatCore, isCore);
    toggle(elements.formatExpanded, !isCore);
    toggle(elements.hostFormatCore, isCore);
    toggle(elements.hostFormatExpanded, !isCore);
  }

  function startOfflineGame(format) {
    state.mode = "offline";
    state.format = format;
    updateFormatButtons();
    if (elements.formatOverlay) {
      elements.formatOverlay.hidden = true;
    }
    resetGame();
  }

  function selectCoreFormat() {
    startOfflineGame("core");
  }

  function selectExpandedFormat() {
    startOfflineGame("expanded");
  }

  function selectHostFormatCore() {
    state.format = "core";
    updateFormatButtons();
  }

  function selectHostFormatExpanded() {
    state.format = "expanded";
    updateFormatButtons();
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
    setStatus(`Creating room... Format: ${state.format === "expanded" ? "EXPANDED" : "CORE"}`);
    if (!ensureOnlineClient()) return;
    const playerName = elements.playerNameInput.value.trim() || "Host";
    state.online.role = "host";
    state.online.status = "waiting";
    state.online.playerName = playerName;
    elements.roomCodeInput.value = "";
    elements.readyButton.disabled = true;
    onlineClient.send({
      type: "create_room",
      playerName,
      format: state.format ?? "core",
    });
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
    if (state.mode === "online") {
      if (!onlineClient) {
        setStatus("Not connected to server.");
        return null;
      }
      const ok = onlineClient.send({
        type: "action",
        roomId: state.online.roomId,
        playerId: state.online.playerId,
        action,
      });
      if (!ok) {
        setStatus("Unable to send action to server.");
      }
      return null;
    }
    return applyAction(state, action);
  }

  function getLocalPlayer() {
    if (state.mode === "online" && state.online.playerId) {
      return (
        state.players.find((player) => player.id === state.online.playerId) ??
        state.players[state.currentPlayer]
      );
    }
    return state.players[state.currentPlayer];
  }

  function trade(recipeId) {
    if (state.phase !== "main") return null;
    const player = getLocalPlayer();
    if (!canInitiateTrade(state, player, recipeId)) return null;
    pendingTrade = {
      recipeId,
      useWood: false,
      substituteType: null,
      rewardType: null,
    };
    const woodOptions = getWoodSubstitutionOptions(state, player, recipeId);
    const recipe = state.ruleset.tradeRecipes?.[recipeId];
    const archiveCounts = countCards(player.archive);
    const canPayBase =
      recipe &&
      Object.entries(recipe.cost).every(
        ([type, amount]) => (archiveCounts[type] ?? 0) >= amount
      );
    if (woodOptions.length > 0 && elements.woodOverlay) {
      openWoodOverlay(woodOptions, canPayBase);
      return null;
    }
    if (recipe?.reward === "any" && elements.gemTutorOverlay) {
      openGemTutorOverlay();
      return null;
    }
    return finalizeTrade();
  }

  function finalizeTrade() {
    if (!pendingTrade) return null;
    const payload = {
      recipeId: pendingTrade.recipeId,
      useWood: pendingTrade.useWood,
      substituteType: pendingTrade.substituteType,
      rewardType: pendingTrade.rewardType,
    };
    const result = sendOrApply({ type: ActionTypes.TRADE, payload });
    pendingTrade = null;
    pendingWoodChoice = null;
    pendingGemChoice = null;
    if (
      state.mode !== "online" &&
      payload.recipeId === "trade_platinum" &&
      result?.event?.success
    ) {
      showActionToast(
        formatPlatinumMessage("Platinum dig", {
          useWood: payload.useWood,
          substituteType: payload.substituteType,
          rewardType: result.event.detail?.rewardType,
          digDiscardedCount: result.event.detail?.digDiscardedCount,
        })
      );
    }
    if (state.mode !== "online") {
      renderApp(state, elements, handlers);
    }
    return result;
  }

  function openWoodOverlay(options, allowNoWood) {
    if (!elements.woodSubOptions || !elements.woodOverlay) return;
    pendingWoodChoice = null;
    elements.woodSubOptions.innerHTML = "";
    const allOptions = allowNoWood ? ["none", ...options] : options;
    if (elements.woodMessage) {
      elements.woodMessage.textContent = allowNoWood
        ? "Choose whether to replace one required card with wood."
        : "Wood required for this trade.";
    }
    allOptions.forEach((type) => {
      const button = document.createElement("button");
      button.className = "ghost option-button";
      button.textContent = type === "none" ? "No wood" : `Replace ${type}`;
      button.dataset.choice = type;
      button.addEventListener("click", () => selectWoodChoice(type));
      elements.woodSubOptions.appendChild(button);
    });
    if (elements.woodConfirm) elements.woodConfirm.disabled = true;
    elements.woodOverlay.hidden = false;
  }

  function selectWoodChoice(choice) {
    pendingWoodChoice = choice;
    if (elements.woodSubOptions) {
      Array.from(elements.woodSubOptions.children).forEach((child) => {
        child.classList.toggle("active", child.dataset.choice === choice);
      });
    }
    if (elements.woodConfirm) elements.woodConfirm.disabled = false;
  }

  function confirmWoodSubstitution() {
    if (!pendingTrade) return;
    if (pendingWoodChoice && pendingWoodChoice !== "none") {
      pendingTrade.useWood = true;
      pendingTrade.substituteType = pendingWoodChoice;
    }
    if (elements.woodOverlay) elements.woodOverlay.hidden = true;
    pendingWoodChoice = null;
    const recipe = state.ruleset.tradeRecipes?.[pendingTrade.recipeId];
    if (recipe?.reward === "any" && elements.gemTutorOverlay) {
      openGemTutorOverlay();
      return;
    }
    finalizeTrade();
  }

  function cancelWoodSubstitution() {
    pendingTrade = null;
    pendingWoodChoice = null;
    if (elements.woodOverlay) elements.woodOverlay.hidden = true;
  }

  function openGemTutorOverlay() {
    if (!elements.gemTutorOptions || !elements.gemTutorOverlay) return;
    const player = getLocalPlayer();
    const displayOrder = state.ruleset.displayOrder ?? ["bronze", "silver", "gold"];
    const deckCounts = countCards(player.deck, displayOrder);
    pendingGemChoice = null;
    elements.gemTutorOptions.innerHTML = "";
    displayOrder.forEach((type) => {
      const button = document.createElement("button");
      button.className = "ghost option-button";
      button.textContent = type;
      button.dataset.choice = type;
      if ((deckCounts[type] ?? 0) === 0) {
        button.disabled = true;
      } else {
        button.addEventListener("click", () => selectGemChoice(type));
      }
      elements.gemTutorOptions.appendChild(button);
    });
    if (elements.gemTutorConfirm) elements.gemTutorConfirm.disabled = true;
    elements.gemTutorOverlay.hidden = false;
  }

  function selectGemChoice(choice) {
    pendingGemChoice = choice;
    if (elements.gemTutorOptions) {
      Array.from(elements.gemTutorOptions.children).forEach((child) => {
        child.classList.toggle("active", child.dataset.choice === choice);
      });
    }
    if (elements.gemTutorConfirm) elements.gemTutorConfirm.disabled = false;
  }

  function confirmGemTutor() {
    if (!pendingTrade || !pendingGemChoice) return;
    pendingTrade.rewardType = pendingGemChoice;
    if (elements.gemTutorOverlay) elements.gemTutorOverlay.hidden = true;
    pendingGemChoice = null;
    finalizeTrade();
  }

  function cancelGemTutor() {
    pendingTrade = null;
    pendingGemChoice = null;
    if (elements.gemTutorOverlay) elements.gemTutorOverlay.hidden = true;
  }

  function playCard(index) {
    const result = sendOrApply({ type: ActionTypes.PLAY_CARD, payload: { index } });
    if (state.mode !== "online") {
      renderApp(state, elements, handlers);
    }
    return result;
  }

  function playCardByType(type) {
    const result = sendOrApply({ type: ActionTypes.PLAY_CARD_BY_TYPE, payload: { type } });
    if (state.mode !== "online") {
      renderApp(state, elements, handlers);
    }
    return result;
  }

  function returnCard(index) {
    const result = sendOrApply({ type: ActionTypes.RETURN_CARD, payload: { index } });
    if (state.mode !== "online") {
      renderApp(state, elements, handlers);
    }
    return result;
  }

  function returnAllCards() {
    const result = sendOrApply({ type: ActionTypes.RETURN_ALL });
    if (state.mode !== "online") {
      renderApp(state, elements, handlers);
    }
    return result;
  }

  function endTurn() {
    if (state.phase !== "main") return;
    const result = sendOrApply({ type: ActionTypes.END_TURN });
    if (state.mode !== "online") {
      renderApp(state, elements, handlers);
      showConfirmOverlay(state, elements);
    }
    return result;
  }

  function finalizeArchive() {
    const result = sendOrApply({ type: ActionTypes.CONFIRM_ARCHIVE });
    if (state.mode !== "online") {
      elements.confirmOverlay.hidden = true;
      if (result.event?.winnerIndex !== null && result.event?.winnerIndex !== undefined) {
        onWinner(result.event.winnerIndex);
        return;
      }
      showTurnOverlay(state, elements);
      renderApp(state, elements, handlers);
    }
    return result;
  }

  function cancelArchive() {
    const result = sendOrApply({ type: ActionTypes.CANCEL_ARCHIVE });
    if (state.mode !== "online") {
      elements.confirmOverlay.hidden = true;
      renderApp(state, elements, handlers);
    }
    return result;
  }

  function startTurn() {
    const result = sendOrApply({ type: ActionTypes.START_TURN });
    if (state.mode !== "online") {
      elements.turnOverlay.hidden = true;
      renderApp(state, elements, handlers);
    }
    return result;
  }

  function resetGame() {
    if (state.mode === "online") {
      returnToModeSelect();
      return;
    }
    pendingTrade = null;
    pendingWoodChoice = null;
    pendingGemChoice = null;
    const freshState = createInitialState({
      mode: state.mode,
      format: state.format ?? "core",
    });
    state.players = freshState.players;
    state.currentPlayer = freshState.currentPlayer;
    state.tradesThisTurn = freshState.tradesThisTurn;
    state.phase = freshState.phase;
    state.winner = freshState.winner;
    state.turnCount = freshState.turnCount;
    state.pendingArchive = freshState.pendingArchive;
    state.gameId = freshState.gameId;
    state.ruleset = freshState.ruleset;
    state.format = freshState.format;
    state.online = freshState.online;
    elements.winnerPanel.hidden = true;
    elements.winnerOverlay.hidden = true;
    elements.confirmOverlay.hidden = true;
    if (elements.woodOverlay) elements.woodOverlay.hidden = true;
    if (elements.gemTutorOverlay) elements.gemTutorOverlay.hidden = true;
    hideActionToast();

    startGame(state);
    renderApp(state, elements, handlers);
  }

  function returnToModeSelect() {
    if (onlineClient) {
      onlineClient.close();
      onlineClient = null;
    }
    if (gameOverTimer) {
      clearTimeout(gameOverTimer);
      gameOverTimer = null;
    }
    pendingTrade = null;
    pendingWoodChoice = null;
    pendingGemChoice = null;
    const freshState = createInitialState();
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
    state.mode = freshState.mode;
    if (elements.opponentAlert) elements.opponentAlert.textContent = "";
    elements.winnerPanel.hidden = true;
    elements.winnerOverlay.hidden = true;
    elements.confirmOverlay.hidden = true;
    elements.turnOverlay.hidden = true;
    if (elements.woodOverlay) elements.woodOverlay.hidden = true;
    if (elements.gemTutorOverlay) elements.gemTutorOverlay.hidden = true;
    hideActionToast();
    elements.onlineChoiceOverlay.hidden = true;
    elements.hostOverlay.hidden = true;
    elements.guestOverlay.hidden = true;
    elements.modeOverlay.hidden = false;
    if (elements.formatOverlay) {
      elements.formatOverlay.hidden = true;
    }
    if (elements.restartGameModal) {
      elements.restartGameModal.hidden = false;
    }
    renderApp(state, elements, handlers);
  }

  const handlers = {
    showModePicker,
    selectOfflineMode,
    selectOnlineMode,
    selectCoreFormat,
    selectExpandedFormat,
    selectHostFormatCore,
    selectHostFormatExpanded,
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
    confirmWoodSubstitution,
    cancelWoodSubstitution,
    confirmGemTutor,
    cancelGemTutor,
    startTurn,
  };

  return handlers;
}
