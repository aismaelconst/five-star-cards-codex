import { ActionTypes, applyAction } from "../game/rules.js";
import { renderApp, showConfirmOverlay, showTurnOverlay } from "./render.js";
import { createInitialState } from "../game/state.js";
import { createOnlineClient } from "../online/client.js";
import { startGame } from "../game/lifecycle.js";
import { isMyTurn } from "../game/multiplayer.js";
import { countCards } from "../shared/utils.js";
import { executeCpuTurn } from "../game/cpu.js";
import { createTradeFlow } from "./handlers/trade-flow.js";
import { formatPlatinumMessage, formatPoolCostLine } from "./handlers/trade-utils.js";

export function createHandlers(state, elements, onWinner, options = {}) {
  const socketUrl = options.socketUrl ?? resolveSocketUrl();
  const clientFactory = options.clientFactory ?? createOnlineClient;
  let onlineClient = null;
  let gameOverTimer = null;
  let toastTimer = null;
  let pendingCpuWinner = null;
  let handlers = null;

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

  function formatLabel(format) {
    if (format === "expanded") return "GEMSTONE + PLATINUM";
    if (format === "ancient") return "ANCIENT";
    if (format === "ancient_expanded") return "ANCIENT + GEMSTONE + PLATINUM";
    return "CORE";
  }

  function formatCountLine(counts, displayOrder) {
    const parts = displayOrder
      .map((type) => {
        const value = counts[type] ?? 0;
        return value > 0 ? `${value} ${type}` : null;
      })
      .filter(Boolean);
    return parts.length ? parts.join(", ") : "no cards";
  }


  function formatCpuTrade(state, trade) {
    const recipe = state.ruleset.tradeRecipes?.[trade.recipeId];
    const woodNote =
      trade.useWood && trade.substituteType
        ? ` (wood replaced ${trade.substituteType})`
        : "";
    if (trade.recipeId === "trade_platinum") {
      const discarded = typeof trade.digDiscardedCount === "number" ? trade.digDiscardedCount : 0;
      const reward = trade.rewardType ? `found ${trade.rewardType}` : "deck exhausted";
      return `Platinum dig${woodNote}: discarded ${discarded} bronze/silver, ${reward}.`;
    }
    if (trade.recipeId === "trade_gem_set") {
      const reward = trade.rewardType ? `selected ${trade.rewardType}` : "no reward";
      return `Gem tutor${woodNote}: ${reward}.`;
    }
    if (!recipe) return "Trade executed.";
    const costParts = [];
    if (recipe.cost) {
      Object.entries(recipe.cost).forEach(([type, amount]) => {
        costParts.push(`${amount} ${type}`);
      });
    }
    if (recipe.choiceCost && trade.choiceType) {
      costParts.push(`${recipe.choiceCost.count} ${trade.choiceType}`);
    }
    const poolLine = formatPoolCostLine(recipe, trade, state.ruleset.displayOrder);
    if (poolLine) {
      costParts.push(poolLine);
    }
    const costLine = costParts.length ? costParts.join(", ") : "cost";
    let rewardLine = trade.rewardType ?? recipe.reward ?? "reward";
    if (recipe.reward?.type === "cards") {
      rewardLine = `${recipe.reward.count} ${recipe.reward.card}`;
    } else if (recipe.reward?.type === "draw") {
      const count =
        typeof trade.drawCount === "number"
          ? trade.drawCount
          : recipe.reward.count ?? 0;
      rewardLine = `draw ${count}`;
    } else if (recipe.reward?.type === "archive") {
      rewardLine = trade.rewardType ? `archive ${trade.rewardType}` : "archive a card";
    } else if (typeof recipe.reward === "string") {
      rewardLine = `1 ${recipe.reward}`;
    }
    return `Trade${woodNote}: ${costLine} → ${rewardLine}.`;
  }

  function showCpuSummary(summary) {
    if (!elements.cpuTurnOverlay || !elements.cpuTurnSummary) return;
    const displayOrder = state.ruleset.displayOrder ?? ["bronze", "silver", "gold"];
    elements.cpuTurnSummary.innerHTML = "";
    if (summary.trades.length > 0) {
      const title = document.createElement("div");
      title.className = "summary-title";
      title.textContent = "Trades";
      elements.cpuTurnSummary.appendChild(title);
      summary.trades.forEach((trade) => {
        const line = document.createElement("div");
        line.className = "summary-line";
        line.textContent = formatCpuTrade(state, trade);
        elements.cpuTurnSummary.appendChild(line);
      });
    }
    if (summary.plays.length > 0) {
      const title = document.createElement("div");
      title.className = "summary-title";
      title.textContent = "Plays";
      elements.cpuTurnSummary.appendChild(title);
      const counts = countCards(summary.plays, displayOrder);
      const line = document.createElement("div");
      line.className = "summary-line";
      line.textContent = `Played ${formatCountLine(counts, displayOrder)}.`;
      elements.cpuTurnSummary.appendChild(line);
    }
    if (summary.archive) {
      const title = document.createElement("div");
      title.className = "summary-title";
      title.textContent = "Archive";
      elements.cpuTurnSummary.appendChild(title);
      const line = document.createElement("div");
      line.className = "summary-line";
      line.textContent = `Archived ${formatCountLine(
        summary.archive.counts,
        displayOrder
      )}. Drew ${summary.archive.drawCount} card(s).`;
      elements.cpuTurnSummary.appendChild(line);
    }
    if (
      summary.trades.length === 0 &&
      summary.plays.length === 0 &&
      !summary.archive
    ) {
      const line = document.createElement("div");
      line.className = "summary-line";
      line.textContent = "CPU took no actions.";
      elements.cpuTurnSummary.appendChild(line);
    }
    elements.cpuTurnOverlay.hidden = false;
  }

  function closeCpuSummary() {
    if (!elements.cpuTurnOverlay) return;
    elements.cpuTurnOverlay.hidden = true;
    renderApp(state, elements, handlers);
    if (pendingCpuWinner !== null && pendingCpuWinner !== undefined) {
      const winner = pendingCpuWinner;
      pendingCpuWinner = null;
      onWinner(winner);
    }
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
      const recipe = state.ruleset.tradeRecipes?.[event.recipeId];
      if (recipe) {
        const costParts = [];
        if (recipe.cost) {
          Object.entries(recipe.cost).forEach(([type, amount]) => {
            costParts.push(`${amount} ${type}`);
          });
        }
        if (recipe.choiceCost && event.choiceType) {
          costParts.push(`${recipe.choiceCost.count} ${event.choiceType}`);
        }
        const poolLine = formatPoolCostLine(recipe, event, state.ruleset.displayOrder);
        if (poolLine) {
          costParts.push(poolLine);
        }
        const costLine = costParts.length ? costParts.join(", ") : "cost";
        let rewardLine = event.rewardType ?? recipe.reward ?? "reward";
        if (recipe.reward?.type === "cards") {
          rewardLine = `${recipe.reward.count} ${recipe.reward.card}`;
        } else if (recipe.reward?.type === "draw") {
          const count =
            typeof event.drawCount === "number"
              ? event.drawCount
              : recipe.reward.count ?? 0;
          rewardLine = `draw ${count}`;
        } else if (recipe.reward?.type === "archive") {
          rewardLine = event.rewardType ? `archive ${event.rewardType}` : "archive a card";
        } else if (typeof recipe.reward === "string") {
          rewardLine = `1 ${recipe.reward}`;
        }
        elements.opponentAlert.textContent = `Opponent traded ${costLine} for ${rewardLine}${woodNote}.`;
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
      setStatus(`Connected to room ${message.roomId}. Format: ${formatLabel(state.format)}.`);
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
    if (elements.cpuOverlay) {
      elements.cpuOverlay.hidden = true;
    }
    if (elements.formatOverlay) {
      updateFormatButtons();
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
      updateFormatButtons();
      elements.formatOverlay.hidden = false;
    } else {
      startCpuGame("core", state.cpu?.difficulty ?? "easy");
    }
  }

  function selectOnlineMode() {
    state.mode = "online";
    state.format = state.format ?? "core";
    elements.modeOverlay.hidden = true;
    if (elements.formatOverlay) {
      elements.formatOverlay.hidden = true;
    }
    if (elements.cpuOverlay) {
      elements.cpuOverlay.hidden = true;
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
    const isCore =
      !state.format ||
      !["expanded", "ancient", "ancient_expanded"].includes(state.format);
    const isExpanded = state.format === "expanded";
    const isAncient = state.format === "ancient";
    const isAncientExpanded = state.format === "ancient_expanded";
    const toggle = (el, active) => {
      if (!el) return;
      el.classList.toggle("active", active);
      el.setAttribute("aria-pressed", active ? "true" : "false");
    };
    toggle(elements.formatCore, isCore);
    toggle(elements.formatExpanded, isExpanded);
    toggle(elements.formatAncient, isAncient);
    toggle(elements.formatAncientExpanded, isAncientExpanded);
    toggle(elements.hostFormatCore, isCore);
    toggle(elements.hostFormatExpanded, isExpanded);
    toggle(elements.hostFormatAncient, isAncient);
    toggle(elements.hostFormatAncientExpanded, isAncientExpanded);
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

  function startCpuGame(format, difficulty) {
    state.mode = "cpu";
    state.format = format;
    state.cpu = { difficulty };
    updateFormatButtons();
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
    maybeRunCpuTurn();
  }

  function selectCoreFormat() {
    if (state.mode === "cpu") {
      state.format = "core";
      updateFormatButtons();
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
      updateFormatButtons();
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
      updateFormatButtons();
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

  function selectAncientExpandedFormat() {
    if (state.mode === "cpu") {
      state.format = "ancient_expanded";
      updateFormatButtons();
      if (elements.formatOverlay) {
        elements.formatOverlay.hidden = true;
      }
      if (elements.cpuOverlay) {
        elements.cpuOverlay.hidden = false;
      }
      return;
    }
    startOfflineGame("ancient_expanded");
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
    updateFormatButtons();
  }

  function selectHostFormatExpanded() {
    state.format = "expanded";
    updateFormatButtons();
  }

  function selectHostFormatAncient() {
    state.format = "ancient";
    updateFormatButtons();
  }

  function selectHostFormatAncientExpanded() {
    state.format = "ancient_expanded";
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
    setStatus(`Creating room... Format: ${formatLabel(state.format)}`);
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

  function isCpuTurn() {
    return state.mode === "cpu" && state.currentPlayer === 1;
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

  function maybeRunCpuTurn() {
    if (!isCpuTurn()) return;
    if (state.phase === "between") {
      applyAction(state, { type: ActionTypes.START_TURN });
    }
    if (state.phase !== "main") return;
    const summary = executeCpuTurn(state, {
      difficulty: state.cpu?.difficulty ?? "easy",
      cpuIndex: 1,
    });
    if (summary && summary.winnerIndex !== null && summary.winnerIndex !== undefined) {
      pendingCpuWinner = summary.winnerIndex;
    }
    if (state.phase === "between") {
      applyAction(state, { type: ActionTypes.START_TURN });
    }
    render();
    if (summary && elements.cpuTurnOverlay) {
      showCpuSummary(summary);
      return;
    }
    if (pendingCpuWinner !== null && pendingCpuWinner !== undefined) {
      const winner = pendingCpuWinner;
      pendingCpuWinner = null;
      onWinner(winner);
    }
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
        maybeRunCpuTurn();
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
    maybeRunCpuTurn();
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
    pendingCpuWinner = null;
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

  handlers = {
    showModePicker,
    selectOfflineMode,
    selectCpuMode,
    selectOnlineMode,
    selectCoreFormat,
    selectExpandedFormat,
    selectAncientFormat,
    selectAncientExpandedFormat,
    selectCpuEasy,
    selectCpuMedium,
    selectCpuHard,
    selectHostFormatCore,
    selectHostFormatExpanded,
    selectHostFormatAncient,
    selectHostFormatAncientExpanded,
    createRoom,
    joinRoom,
    backToChoice,
    copyRoomCode,
    readyUp,
    chooseCreate,
    chooseJoin,
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
    confirmGemTutor: tradeFlow.confirmGemTutor,
    cancelGemTutor: tradeFlow.cancelGemTutor,
    confirmChoiceCost: tradeFlow.confirmChoiceCost,
    cancelChoiceCost: tradeFlow.cancelChoiceCost,
    confirmPoolCost: tradeFlow.confirmPoolCost,
    cancelPoolCost: tradeFlow.cancelPoolCost,
    confirmArchiveTutor: tradeFlow.confirmArchiveTutor,
    cancelArchiveTutor: tradeFlow.cancelArchiveTutor,
    startTurn,
    closeCpuSummary,
  };

  return handlers;
}
