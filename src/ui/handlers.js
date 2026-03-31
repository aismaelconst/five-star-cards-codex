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
import { createFeedbackController } from "./feedback/feedback-controller.js";
import { buildArchiveDrawSequence } from "./feedback/sequence-builder.js";

const THEME_STORAGE_KEY = "fsc_theme";
const ONLINE_MODE_ENABLED = false;

export function createHandlers(state, elements, onWinner, options = {}) {
  const socketUrl = options.socketUrl ?? null;
  const clientFactory = options.clientFactory ?? createOnlineClient;
  const feedbackFactory = options.feedbackFactory ?? createFeedbackController;
  let toastTimer = null;
  let handlers = null;
  let onlineFlow = null;
  let cpuFlow = null;
  let currentTheme = "classic";
  let pendingLocalFeedback = null;

  state.ui = {
    motionMode: state.ui?.motionMode ?? "auto",
    replayQueue: Array.isArray(state.ui?.replayQueue) ? state.ui.replayQueue : [],
    archiveInspect: state.ui?.archiveInspect ?? {
      owner: "player",
      type: null,
      count: 0,
      visible: false,
    },
  };
  const feedback = feedbackFactory({ state, elements });

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

  function toggleMotionMode() {
    feedback.cycleMotionMode();
  }

  function openHowToPlay() {
    if (elements.howToPlayOverlay) {
      elements.howToPlayOverlay.hidden = false;
    }
  }

  function closeHowToPlay() {
    if (elements.howToPlayOverlay) {
      elements.howToPlayOverlay.hidden = true;
    }
  }

  function openTradesModal() {
    if (elements.tradesOverlay) {
      elements.tradesOverlay.hidden = false;
    }
  }

  function closeTradesModal() {
    if (elements.tradesOverlay) {
      elements.tradesOverlay.hidden = true;
    }
  }

  function closeTurnReplay() {
    feedback.closeReplay();
  }

  function showModePicker() {
    if (elements.onlineMode) {
      elements.onlineMode.disabled = !ONLINE_MODE_ENABLED;
      if (ONLINE_MODE_ENABLED) {
        elements.onlineMode.removeAttribute("title");
      } else {
        elements.onlineMode.title = "Online mode is temporarily unavailable.";
      }
    }
    elements.modeOverlay.hidden = false;
  }

  function selectOnlineMode() {
    if (!ONLINE_MODE_ENABLED) return;
    onlineFlow.selectOnlineMode();
  }

  function runPendingFeedback(options = {}) {
    if (!pendingLocalFeedback) return;
    const { before, after, actionType } = pendingLocalFeedback;
    pendingLocalFeedback = null;
    if (actionType === ActionTypes.CONFIRM_ARCHIVE && options.archiveContext) {
      const sequence = buildArchiveDrawSequence({
        playedCards: options.archiveContext.playedCards ?? [],
        drawCount: options.archiveContext.drawCount ?? 0,
        displayOrder: state.ruleset?.displayOrder,
        beforeSnapshot: before,
        afterSnapshot: after,
      });
      if (typeof feedback.animateSequence === "function") {
        void feedback.animateSequence(sequence);
        return;
      }
    }
    void feedback.animateFromSnapshots(before, after);
  }

  function openArchiveInspect(owner, type, count) {
    state.ui.archiveInspect = {
      owner: owner ?? "player",
      type: type ?? null,
      count: Number.isFinite(count) ? count : 0,
      visible: Boolean(type),
    };
    render();
  }

  function closeArchiveInspect(options = {}) {
    state.ui.archiveInspect = {
      owner: "player",
      type: null,
      count: 0,
      visible: false,
    };
    if (elements.archiveInspectOverlay) {
      elements.archiveInspectOverlay.hidden = true;
    }
    if (!options.skipRender) {
      render();
    }
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
    closeHowToPlay();
    closeTradesModal();
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
    closeHowToPlay();
    closeTradesModal();
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
    state.turnEffects = freshState.turnEffects;
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

  function selectMysticFormat() {
    if (state.mode === "cpu") {
      state.format = "mystic";
      updateFormatButtons(state, elements);
      if (elements.formatOverlay) {
        elements.formatOverlay.hidden = true;
      }
      if (elements.cpuOverlay) {
        elements.cpuOverlay.hidden = false;
      }
      return;
    }
    startOfflineGame("mystic");
  }

  function selectFoundryFormat() {
    if (state.mode === "cpu") {
      state.format = "foundry";
      updateFormatButtons(state, elements);
      if (elements.formatOverlay) {
        elements.formatOverlay.hidden = true;
      }
      if (elements.cpuOverlay) {
        elements.cpuOverlay.hidden = false;
      }
      return;
    }
    startOfflineGame("foundry");
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

  function selectHostFormatMystic() {
    state.format = "mystic";
    updateFormatButtons(state, elements);
  }

  function selectHostFormatFoundry() {
    state.format = "foundry";
    updateFormatButtons(state, elements);
  }

  function sendOrApply(action) {
    if (state.mode === "online") {
      return onlineFlow.sendAction(action);
    }
    const localPlayer = getLocalPlayer();
    const localPlayerId = localPlayer?.id;
    const before = feedback.captureSnapshot(localPlayerId);
    const result = applyAction(state, action);
    const after = feedback.captureSnapshot(localPlayerId);
    pendingLocalFeedback = { before, after, actionType: action.type };
    return result;
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
    runFeedback: runPendingFeedback,
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
      runPendingFeedback();
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
      runPendingFeedback();
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
      runPendingFeedback();
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
      runPendingFeedback();
    }
    return result;
  }

  function endTurn() {
    if (state.phase !== "main") return;
    const result = sendOrApply({ type: ActionTypes.END_TURN });
    if (state.mode !== "online") {
      renderApp(state, elements, handlers);
      runPendingFeedback();
      showConfirmOverlay(state, elements);
    }
    return result;
  }

  function finalizeArchive(payload = {}) {
    const pending = state.pendingArchive
      ? {
          playedCards: [...state.pendingArchive.playedCards],
          drawCount: state.pendingArchive.drawCount,
          playerIndex: state.pendingArchive.playerIndex,
        }
      : null;
    const result = sendOrApply({ type: ActionTypes.CONFIRM_ARCHIVE, payload });
    if (state.mode !== "online") {
      elements.confirmOverlay.hidden = true;
      if (result.event?.winnerIndex !== null && result.event?.winnerIndex !== undefined) {
        onWinner(result.event.winnerIndex);
        return;
      }
      if (pending && pending.playedCards.length > 0 && state.mode !== "cpu") {
        const actorName = state.players[pending.playerIndex]?.name ?? "Player";
        feedback.showArchiveReplayFromCards(
          pending.playedCards,
          pending.drawCount,
          actorName
        );
      }
      if (state.mode === "cpu") {
        renderApp(state, elements, handlers);
        runPendingFeedback({ archiveContext: pending });
        cpuFlow.maybeRunCpuTurn();
        return result;
      }
      showTurnOverlay(state, elements);
      renderApp(state, elements, handlers);
      runPendingFeedback({ archiveContext: pending });
    }
    return result;
  }

  function cancelArchive() {
    const result = sendOrApply({ type: ActionTypes.CANCEL_ARCHIVE });
    if (state.mode !== "online") {
      elements.confirmOverlay.hidden = true;
      renderApp(state, elements, handlers);
      runPendingFeedback();
    }
    return result;
  }

  function startTurn() {
    const result = sendOrApply({ type: ActionTypes.START_TURN });
    if (state.mode !== "online") {
      elements.turnOverlay.hidden = true;
      renderApp(state, elements, handlers);
      runPendingFeedback();
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
    state.turnEffects = freshState.turnEffects;
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
    closeHowToPlay();
    closeTradesModal();
    closeArchiveInspect({ skipRender: true });
    feedback.reset();

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
    state.turnEffects = freshState.turnEffects;
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
    closeHowToPlay();
    closeTradesModal();
    closeArchiveInspect({ skipRender: true });
    feedback.reset();
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
    captureFeedbackSnapshot: () => {
      const localPlayer = getLocalPlayer();
      return feedback.captureSnapshot(localPlayer?.id);
    },
    runFeedbackFromSnapshot: (beforeSnapshot) => {
      const localPlayer = getLocalPlayer();
      const afterSnapshot = feedback.captureSnapshot(localPlayer?.id);
      void feedback.animateFromSnapshots(beforeSnapshot, afterSnapshot);
    },
    showArchiveReplayFromEvent: (event, actorName) => {
      feedback.showArchiveReplayFromEvent(event, actorName);
    },
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
    toggleMotionMode,
    openHowToPlay,
    closeHowToPlay,
    openTradesModal,
    closeTradesModal,
    closeTurnReplay,
    openArchiveInspect,
    closeArchiveInspect,
    selectOfflineMode,
    selectCpuMode,
    selectOnlineMode,
    selectCoreFormat,
    selectExpandedFormat,
    selectAncientFormat,
    selectMysticFormat,
    selectFoundryFormat,
    selectCpuEasy,
    selectCpuMedium,
    selectCpuHard,
    selectHostFormatCore,
    selectHostFormatExpanded,
    selectHostFormatAncient,
    selectHostFormatMystic,
    selectHostFormatFoundry,
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
    renderBoard: render,
  };

  initTheme();
  return handlers;
}
