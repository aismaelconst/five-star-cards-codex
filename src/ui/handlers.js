import { ActionTypes, applyAction } from "../game/rules.js";
import { renderApp, showConfirmOverlay, showTurnOverlay } from "./render.js";
import { createInitialState } from "../game/state.js";
import { createOnlineClient } from "../online/client.js";
import { startGame } from "../game/lifecycle.js";
import { isMyTurn } from "../game/multiplayer.js";
import { countCards, getCardType } from "../shared/utils.js";
import { executeCpuTurn } from "../game/cpu.js";
import { createTradeFlow } from "./handlers/trade-flow.js";
import {
  formatPlatinumMessage,
  formatPoolCostLine,
  formatTradeToast,
} from "./handlers/trade-utils.js";
import { createCpuFlow } from "./handlers/cpu-flow.js";
import { createOnlineFlow } from "./handlers/online-flow.js";
import { formatLabel, updateFormatButtons } from "./handlers/format-utils.js";

const THEME_STORAGE_KEY = "fsc_theme";

export function createHandlers(state, elements, onWinner, options = {}) {
  const socketUrl = options.socketUrl ?? null;
  const clientFactory = options.clientFactory ?? createOnlineClient;
  let toastTimer = null;
  let handlers = null;
  let onlineFlow = null;
  let cpuFlow = null;
  let currentTheme = "classic";

  function readStoredTheme() {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors (private mode, blocked, etc.)
    }
  }

  function updateThemeButtons(theme) {
    if (!elements.themeClassic || !elements.themePixel) return;
    elements.themeClassic.classList.toggle("active", theme === "classic");
    elements.themePixel.classList.toggle("active", theme === "pixel");
  }

  function applyTheme(theme, { persist = true } = {}) {
    const nextTheme = theme === "pixel" ? "pixel" : "classic";
    currentTheme = nextTheme;
    if (document?.body) {
      document.body.classList.toggle("theme-pixel", nextTheme === "pixel");
    }
    updateThemeButtons(nextTheme);
    if (persist) {
      storeTheme(nextTheme);
    }
  }

  function initTheme() {
    const stored = readStoredTheme();
    applyTheme(stored === "pixel" ? "pixel" : "classic", { persist: false });
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

  function formatCardName(type) {
    if (!type) return "";
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function selectClassicTheme() {
    applyTheme("classic");
  }

  function selectPixelTheme() {
    applyTheme("pixel");
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
    if (elements.cpuOverlay) {
      elements.cpuOverlay.hidden = true;
    }
    if (elements.formatOverlay) {
      updateFormatButtons(state, elements);
      elements.formatOverlay.hidden = false;
    } else {
      startOfflineGame("core");
    }
  }

  function selectCpuMode() {
    state.mode = "cpu";
    elements.modeOverlay.hidden = true;
    elements.onlineChoiceOverlay.hidden = true;
    elements.hostOverlay.hidden = true;
    elements.guestOverlay.hidden = true;
    if (elements.formatOverlay) {
      updateFormatButtons(state, elements);
      elements.formatOverlay.hidden = false;
    } else {
      startCpuGame("core", state.cpu?.difficulty ?? "easy");
    }
  }

  function startOfflineGame(format) {
    state.mode = "offline";
    state.format = format;
    updateFormatButtons(state, elements);
    if (elements.formatOverlay) {
      elements.formatOverlay.hidden = true;
    }
    resetGame();
  }

  function startCpuGame(format, difficulty) {
    state.mode = "cpu";
    state.format = format;
    state.cpu = { difficulty };
    updateFormatButtons(state, elements);
    if (elements.formatOverlay) {
      elements.formatOverlay.hidden = true;
    }
    if (elements.cpuOverlay) {
      elements.cpuOverlay.hidden = true;
    }
    const freshState = createInitialState({
      mode: "cpu",
      format,
      playerNames: ["You", "CPU"],
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
    state.cpu = { difficulty };
    startGame(state);
    renderApp(state, elements, handlers);
    cpuFlow.maybeRunCpuTurn();
  }

  function selectCoreFormat() {
    if (state.mode === "cpu") {
    state.format = "core";
      updateFormatButtons(state, elements);
      if (elements.formatOverlay) {
        elements.formatOverlay.hidden = true;
      }
      if (elements.cpuOverlay) {
        elements.cpuOverlay.hidden = false;
      }
      return;
    }
    startOfflineGame("core");
  }

  function selectExpandedFormat() {
    if (state.mode === "cpu") {
      state.format = "expanded";
      updateFormatButtons(state, elements);
      if (elements.formatOverlay) {
        elements.formatOverlay.hidden = true;
      }
      if (elements.cpuOverlay) {
        elements.cpuOverlay.hidden = false;
      }
      return;
    }
    startOfflineGame("expanded");
  }

  function selectAncientFormat() {
    if (state.mode === "cpu") {
      state.format = "ancient";
      updateFormatButtons(state, elements);
      if (elements.formatOverlay) {
        elements.formatOverlay.hidden = true;
      }
      if (elements.cpuOverlay) {
        elements.cpuOverlay.hidden = false;
      }
      return;
    }
    startOfflineGame("ancient");
  }

  function selectMintedFormat() {
    if (state.mode === "cpu") {
      state.format = "minted";
      updateFormatButtons(state, elements);
      if (elements.formatOverlay) {
        elements.formatOverlay.hidden = true;
      }
      if (elements.cpuOverlay) {
        elements.cpuOverlay.hidden = false;
      }
      return;
    }
    startOfflineGame("minted");
  }

  function selectCpuEasy() {
    startCpuGame(state.format ?? "core", "easy");
  }

  function selectCpuMedium() {
    startCpuGame(state.format ?? "core", "medium");
  }

  function selectCpuHard() {
    startCpuGame(state.format ?? "core", "hard");
  }

  function selectHostFormatCore() {
    state.format = "core";
    updateFormatButtons(state, elements);
  }

  function selectHostFormatExpanded() {
    state.format = "expanded";
    updateFormatButtons(state, elements);
  }

  function selectHostFormatAncient() {
    state.format = "ancient";
    updateFormatButtons(state, elements);
  }

  function selectHostFormatMinted() {
    state.format = "minted";
    updateFormatButtons(state, elements);
  }

  function sendOrApply(action) {
    if (state.mode === "online") {
      return onlineFlow.sendAction(action);
    }
    return applyAction(state, action);
  }

  function getLocalPlayer() {
    if (state.mode === "cpu") {
      return state.players[0];
    }
    if (state.mode === "online" && state.online.playerId) {
      return (
        state.players.find((player) => player.id === state.online.playerId) ??
        state.players[state.currentPlayer]
      );
    }
    return state.players[state.currentPlayer];
  }

  const render = () => renderApp(state, elements, handlers);
  const tradeFlow = createTradeFlow({
    state,
    elements,
    sendOrApply,
    getLocalPlayer,
    renderApp: render,
    showActionToast,
  });

  function playCard(index) {
    const player = state.mode !== "online" ? getLocalPlayer() : null;
    const card = player?.hand?.[index];
    const cardType = card ? getCardType(card) : null;
    const activeBefore = player?.active?.length ?? 0;
    const result = sendOrApply({ type: ActionTypes.PLAY_CARD, payload: { index } });
    if (state.mode !== "online") {
      if ((player?.active?.length ?? 0) > activeBefore && cardType) {
        showActionToast(`Played ${formatCardName(cardType)}.`);
      }
      renderApp(state, elements, handlers);
    }
    return result;
  }

  function playCardByType(type) {
    const player = state.mode !== "online" ? getLocalPlayer() : null;
    const activeBefore = player?.active?.length ?? 0;
    const result = sendOrApply({ type: ActionTypes.PLAY_CARD_BY_TYPE, payload: { type } });
    if (state.mode !== "online") {
      if ((player?.active?.length ?? 0) > activeBefore) {
        showActionToast(`Played ${formatCardName(type)}.`);
      }
      renderApp(state, elements, handlers);
    }
    return result;
  }

  function returnCard(index) {
    const player = state.mode !== "online" ? getLocalPlayer() : null;
    const card = player?.active?.[index];
    const cardType = card ? getCardType(card) : null;
    const activeBefore = player?.active?.length ?? 0;
    const result = sendOrApply({ type: ActionTypes.RETURN_CARD, payload: { index } });
    if (state.mode !== "online") {
      if ((player?.active?.length ?? 0) < activeBefore && cardType) {
        showActionToast(`Returned ${formatCardName(cardType)} to hand.`);
      }
      renderApp(state, elements, handlers);
    }
    return result;
  }

  function returnAllCards() {
    const player = state.mode !== "online" ? getLocalPlayer() : null;
    const moved = player?.active?.length ?? 0;
    const result = sendOrApply({ type: ActionTypes.RETURN_ALL });
    if (state.mode !== "online") {
      if (moved > 0 && (player?.active?.length ?? 0) === 0) {
        showActionToast(`Returned ${moved} card(s) to hand.`);
      }
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

  function finalizeArchive(payload = {}) {
    const result = sendOrApply({ type: ActionTypes.CONFIRM_ARCHIVE, payload });
    if (state.mode !== "online") {
      elements.confirmOverlay.hidden = true;
      if (result.event?.winnerIndex !== null && result.event?.winnerIndex !== undefined) {
        onWinner(result.event.winnerIndex);
        return;
      }
      if (state.mode === "cpu") {
        renderApp(state, elements, handlers);
        cpuFlow.maybeRunCpuTurn();
        return result;
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
    tradeFlow.resetPending();
    const cpuDifficulty = state.cpu?.difficulty ?? null;
    const freshState = createInitialState({
      mode: state.mode,
      format: state.format ?? "core",
      playerNames: state.mode === "cpu" ? ["You", "CPU"] : undefined,
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
    state.cpu = state.mode === "cpu" ? { difficulty: cpuDifficulty ?? "easy" } : freshState.cpu;
    elements.winnerPanel.hidden = true;
    elements.winnerOverlay.hidden = true;
    elements.confirmOverlay.hidden = true;
    tradeFlow.hideOverlays();
    hideActionToast();

    startGame(state);
    render();
    cpuFlow.maybeRunCpuTurn();
  }

  function returnToModeSelect() {
    onlineFlow?.closeClient();
    tradeFlow.resetPending();
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
    state.cpu = freshState.cpu;
    if (elements.opponentAlert) elements.opponentAlert.textContent = "";
    elements.winnerPanel.hidden = true;
    elements.winnerOverlay.hidden = true;
    elements.confirmOverlay.hidden = true;
    elements.turnOverlay.hidden = true;
    tradeFlow.hideOverlays();
    if (elements.cpuTurnOverlay) elements.cpuTurnOverlay.hidden = true;
    hideActionToast();
    elements.onlineChoiceOverlay.hidden = true;
    elements.hostOverlay.hidden = true;
    elements.guestOverlay.hidden = true;
    elements.modeOverlay.hidden = false;
    if (elements.formatOverlay) {
      elements.formatOverlay.hidden = true;
    }
    if (elements.cpuOverlay) {
      elements.cpuOverlay.hidden = true;
    }
    if (elements.restartGameModal) {
      elements.restartGameModal.hidden = false;
    }
    render();
  }

  onlineFlow = createOnlineFlow({
    state,
    elements,
    clientFactory,
    socketUrl,
    render,
    showConfirmOverlay,
    isMyTurn,
    formatLabel,
    updateFormatButtons,
    formatPoolCostLine,
    formatPlatinumMessage,
    formatTradeToast,
    onWinner,
    showActionToast,
    returnToModeSelect,
  });

  cpuFlow = createCpuFlow({
    state,
    elements,
    onWinner,
    render,
    executeCpuTurn,
    countCards,
    formatPoolCostLine,
    formatPlatinumMessage,
    applyAction,
    ActionTypes,
  });

  handlers = {
    showModePicker,
    selectClassicTheme,
    selectPixelTheme,
    selectOfflineMode,
    selectCpuMode,
    selectOnlineMode: onlineFlow.selectOnlineMode,
    selectCoreFormat,
    selectExpandedFormat,
    selectAncientFormat,
    selectMintedFormat,
    selectCpuEasy,
    selectCpuMedium,
    selectCpuHard,
    selectHostFormatCore,
    selectHostFormatExpanded,
    selectHostFormatAncient,
    selectHostFormatMinted,
    createRoom: onlineFlow.createRoom,
    joinRoom: onlineFlow.joinRoom,
    backToChoice: onlineFlow.backToChoice,
    copyRoomCode: onlineFlow.copyRoomCode,
    readyUp: onlineFlow.readyUp,
    chooseCreate: onlineFlow.chooseCreate,
    chooseJoin: onlineFlow.chooseJoin,
    trade: tradeFlow.trade,
    playCard,
    playCardByType,
    returnCard,
    returnAllCards,
    endTurn,
    confirmArchive: finalizeArchive,
    cancelArchive,
    resetGame,
    confirmWoodSubstitution: tradeFlow.confirmWoodSubstitution,
    cancelWoodSubstitution: tradeFlow.cancelWoodSubstitution,
    confirmEfficiencyChoice: tradeFlow.confirmEfficiencyChoice,
    cancelEfficiencyChoice: tradeFlow.cancelEfficiencyChoice,
    confirmGemTutor: tradeFlow.confirmGemTutor,
    cancelGemTutor: tradeFlow.cancelGemTutor,
    confirmChoiceCost: tradeFlow.confirmChoiceCost,
    cancelChoiceCost: tradeFlow.cancelChoiceCost,
    confirmPoolCost: tradeFlow.confirmPoolCost,
    cancelPoolCost: tradeFlow.cancelPoolCost,
    confirmHandArchive: tradeFlow.confirmHandArchive,
    cancelHandArchive: tradeFlow.cancelHandArchive,
    confirmArchiveTutor: tradeFlow.confirmArchiveTutor,
    cancelArchiveTutor: tradeFlow.cancelArchiveTutor,
    startTurn,
    closeCpuSummary: cpuFlow.closeCpuSummary,
  };

  initTheme();
  return handlers;
}
