import {
  ActionTypes,
  applyAction,
  canInitiateTrade,
  getChoiceCostOptions,
  getWoodSubstitutionOptions,
} from "../game/rules.js";
import { renderApp, showConfirmOverlay, showTurnOverlay } from "./render.js";
import { createInitialState } from "../game/state.js";
import { createOnlineClient } from "../online/client.js";
import { startGame } from "../game/lifecycle.js";
import { isMyTurn } from "../game/multiplayer.js";
import { countCards } from "../shared/utils.js";
import { executeCpuTurn } from "../game/cpu.js";

export function createHandlers(state, elements, onWinner, options = {}) {
  const socketUrl = options.socketUrl ?? resolveSocketUrl();
  const clientFactory = options.clientFactory ?? createOnlineClient;
  let onlineClient = null;
  let gameOverTimer = null;
  let toastTimer = null;
  let pendingCpuWinner = null;
  let pendingTrade = null;
  let pendingWoodChoice = null;
  let pendingGemChoice = null;
  let pendingChoiceSelection = null;
  let pendingPoolSelection = null;
  let pendingArchiveTutorChoice = null;

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

  function formatPoolLabel(pool, displayOrder) {
    if (pool === "ancient") return "ancients";
    if (pool === "non_gold_non_electrum") return "non-gold/non-electrum";
    if (Array.isArray(pool)) return pool.join("/");
    if (Array.isArray(displayOrder)) return "cards";
    return "cards";
  }

  function formatPoolCostLine(recipe, trade, displayOrder) {
    if (!recipe?.poolCost) return null;
    if (Array.isArray(trade.poolTypes) && trade.poolTypes.length > 0) {
      return trade.poolTypes.join(", ");
    }
    const min = recipe.poolCost.min ?? 0;
    const max = recipe.poolCost.max ?? min;
    const range = min === max ? `${min}` : `${min}-${max}`;
    const distinct = recipe.poolCost.distinct ? "distinct " : "";
    return `${range} ${distinct}${formatPoolLabel(recipe.poolCost.pool, displayOrder)}`;
  }

  function resolvePoolTypes(pool, displayOrder) {
    if (!pool) return [];
    if (Array.isArray(pool)) {
      return pool.filter((type) => displayOrder.includes(type));
    }
    if (pool === "ancient") {
      return ["turquoise", "lapis_lazuli", "carnelian"].filter((type) =>
        displayOrder.includes(type)
      );
    }
    if (pool === "non_gold_non_electrum") {
      return displayOrder.filter((type) => type !== "gold" && type !== "electrum");
    }
    return [];
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
    renderApp(state, elements, handlers);
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

  function trade(recipeId) {
    if (state.phase !== "main") return null;
    const player = getLocalPlayer();
    if (!canInitiateTrade(state, player, recipeId)) return null;
    pendingTrade = {
      recipeId,
      useWood: false,
      substituteType: null,
      rewardType: null,
      choiceType: null,
      poolTypes: null,
    };
    const woodOptions = getWoodSubstitutionOptions(state, player, recipeId);
    const recipe = state.ruleset.tradeRecipes?.[recipeId];
    const baseCost = recipe?.cost ?? {};
    const archiveCounts = countCards(player.archive);
    const canPayBase =
      recipe &&
      Object.entries(baseCost).every(
        ([type, amount]) => (archiveCounts[type] ?? 0) >= amount
      );
    if (woodOptions.length > 0 && elements.woodOverlay) {
      openWoodOverlay(woodOptions, canPayBase);
      return null;
    }
    if (recipe?.choiceCost) {
      openChoiceCostOverlay();
      return null;
    }
    if (recipe?.poolCost) {
      openPoolCostOverlay();
      return null;
    }
    if (recipe?.reward === "any" && elements.gemTutorOverlay) {
      openGemTutorOverlay();
      return null;
    }
    if (recipe?.reward?.type === "archive" && elements.archiveTutorOverlay) {
      openArchiveTutorOverlay();
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
      choiceType: pendingTrade.choiceType,
      poolTypes: pendingTrade.poolTypes,
    };
    const result = sendOrApply({ type: ActionTypes.TRADE, payload });
    pendingTrade = null;
    pendingWoodChoice = null;
    pendingGemChoice = null;
    pendingChoiceSelection = null;
    pendingPoolSelection = null;
    pendingArchiveTutorChoice = null;
    pendingCpuWinner = null;
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
    if (recipe?.choiceCost) {
      openChoiceCostOverlay();
      return;
    }
    if (recipe?.poolCost) {
      openPoolCostOverlay();
      return;
    }
    if (recipe?.reward === "any" && elements.gemTutorOverlay) {
      openGemTutorOverlay();
      return;
    }
    if (recipe?.reward?.type === "archive" && elements.archiveTutorOverlay) {
      openArchiveTutorOverlay();
      return;
    }
    finalizeTrade();
  }

  function cancelWoodSubstitution() {
    pendingTrade = null;
    pendingWoodChoice = null;
    pendingChoiceSelection = null;
    pendingPoolSelection = null;
    pendingArchiveTutorChoice = null;
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
    if (elements.cpuTurnOverlay) elements.cpuTurnOverlay.hidden = true;
    pendingGemChoice = null;
    finalizeTrade();
  }

  function cancelGemTutor() {
    pendingTrade = null;
    pendingGemChoice = null;
    pendingChoiceSelection = null;
    pendingPoolSelection = null;
    pendingArchiveTutorChoice = null;
    if (elements.gemTutorOverlay) elements.gemTutorOverlay.hidden = true;
  }

  function openChoiceCostOverlay() {
    if (!pendingTrade || !elements.choiceCostOptions || !elements.choiceCostOverlay) return;
    const player = getLocalPlayer();
    const options = getChoiceCostOptions(state, player, pendingTrade.recipeId, {
      useWood: pendingTrade.useWood,
      substituteType: pendingTrade.substituteType,
    });
    pendingChoiceSelection = null;
    elements.choiceCostOptions.innerHTML = "";
    options.forEach((type) => {
      const button = document.createElement("button");
      button.className = "ghost option-button";
      button.textContent = type;
      button.dataset.choice = type;
      button.addEventListener("click", () => selectChoiceCost(type));
      elements.choiceCostOptions.appendChild(button);
    });
    if (elements.choiceCostConfirm) elements.choiceCostConfirm.disabled = true;
    if (elements.choiceCostMessage) {
      elements.choiceCostMessage.textContent =
        "Choose the additional non-gem, non-wood cost card.";
    }
    elements.choiceCostOverlay.hidden = false;
  }

  function selectChoiceCost(choice) {
    pendingChoiceSelection = choice;
    if (elements.choiceCostOptions) {
      Array.from(elements.choiceCostOptions.children).forEach((child) => {
        child.classList.toggle("active", child.dataset.choice === choice);
      });
    }
    if (elements.choiceCostConfirm) elements.choiceCostConfirm.disabled = false;
  }

  function confirmChoiceCost() {
    if (!pendingTrade || !pendingChoiceSelection) return;
    pendingTrade.choiceType = pendingChoiceSelection;
    if (elements.choiceCostOverlay) elements.choiceCostOverlay.hidden = true;
    pendingChoiceSelection = null;
    const recipe = state.ruleset.tradeRecipes?.[pendingTrade.recipeId];
    if (recipe?.poolCost) {
      openPoolCostOverlay();
      return;
    }
    if (recipe?.reward === "any" && elements.gemTutorOverlay) {
      openGemTutorOverlay();
      return;
    }
    if (recipe?.reward?.type === "archive" && elements.archiveTutorOverlay) {
      openArchiveTutorOverlay();
      return;
    }
    finalizeTrade();
  }

  function cancelChoiceCost() {
    pendingTrade = null;
    pendingChoiceSelection = null;
    pendingPoolSelection = null;
    pendingArchiveTutorChoice = null;
    if (elements.choiceCostOverlay) elements.choiceCostOverlay.hidden = true;
  }

  function openPoolCostOverlay() {
    if (!pendingTrade || !elements.poolCostOptions || !elements.poolCostOverlay) return;
    const recipe = state.ruleset.tradeRecipes?.[pendingTrade.recipeId];
    if (!recipe?.poolCost) return;
    const player = getLocalPlayer();
    const displayOrder = state.ruleset.displayOrder ?? ["bronze", "silver", "gold"];
    const archiveCounts = countCards(player.archive, displayOrder);
    const options = resolvePoolTypes(recipe.poolCost.pool, displayOrder);
    pendingPoolSelection = {
      selected: [],
      min: recipe.poolCost.min ?? 0,
      max: recipe.poolCost.max ?? recipe.poolCost.min ?? 0,
      distinct: recipe.poolCost.distinct ?? false,
    };
    elements.poolCostOptions.innerHTML = "";
    options.forEach((type) => {
      const button = document.createElement("button");
      button.className = "ghost option-button";
      button.textContent = type;
      button.dataset.choice = type;
      if ((archiveCounts[type] ?? 0) === 0) {
        button.disabled = true;
      } else {
        button.addEventListener("click", () => togglePoolChoice(type));
      }
      elements.poolCostOptions.appendChild(button);
    });
    if (elements.poolCostMessage) {
      const min = pendingPoolSelection.min;
      const max = pendingPoolSelection.max;
      const range = min === max ? `${min}` : `${min}-${max}`;
      const distinct = pendingPoolSelection.distinct ? "distinct " : "";
      const label = formatPoolLabel(recipe.poolCost.pool, displayOrder);
      elements.poolCostMessage.textContent = `Select ${range} ${distinct}${label}.`;
    }
    if (elements.poolCostConfirm) elements.poolCostConfirm.disabled = true;
    elements.poolCostOverlay.hidden = false;
  }

  function togglePoolChoice(choice) {
    if (!pendingPoolSelection) return;
    const selected = pendingPoolSelection.selected;
    const index = selected.indexOf(choice);
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      if (
        pendingPoolSelection.distinct &&
        selected.length >= pendingPoolSelection.max
      ) {
        return;
      }
      selected.push(choice);
    }
    if (elements.poolCostOptions) {
      Array.from(elements.poolCostOptions.children).forEach((child) => {
        child.classList.toggle(
          "active",
          selected.includes(child.dataset.choice)
        );
      });
    }
    if (elements.poolCostConfirm) {
      const meetsMin = selected.length >= pendingPoolSelection.min;
      const meetsMax = selected.length <= pendingPoolSelection.max;
      elements.poolCostConfirm.disabled = !(meetsMin && meetsMax);
    }
  }

  function confirmPoolCost() {
    if (!pendingTrade || !pendingPoolSelection) return;
    const selected = pendingPoolSelection.selected;
    if (selected.length < pendingPoolSelection.min) return;
    if (selected.length > pendingPoolSelection.max) return;
    pendingTrade.poolTypes = [...selected];
    if (elements.poolCostOverlay) elements.poolCostOverlay.hidden = true;
    pendingPoolSelection = null;
    const recipe = state.ruleset.tradeRecipes?.[pendingTrade.recipeId];
    if (recipe?.reward === "any" && elements.gemTutorOverlay) {
      openGemTutorOverlay();
      return;
    }
    if (recipe?.reward?.type === "archive" && elements.archiveTutorOverlay) {
      openArchiveTutorOverlay();
      return;
    }
    finalizeTrade();
  }

  function cancelPoolCost() {
    pendingTrade = null;
    pendingPoolSelection = null;
    pendingArchiveTutorChoice = null;
    if (elements.poolCostOverlay) elements.poolCostOverlay.hidden = true;
  }

  function openArchiveTutorOverlay() {
    if (!elements.archiveTutorOptions || !elements.archiveTutorOverlay) return;
    const player = getLocalPlayer();
    const displayOrder = state.ruleset.displayOrder ?? ["bronze", "silver", "gold"];
    const deckCounts = countCards(player.deck, displayOrder);
    pendingArchiveTutorChoice = null;
    elements.archiveTutorOptions.innerHTML = "";
    displayOrder.forEach((type) => {
      if (type === "gold") return;
      const button = document.createElement("button");
      button.className = "ghost option-button";
      button.textContent = type;
      button.dataset.choice = type;
      if ((deckCounts[type] ?? 0) === 0) {
        button.disabled = true;
      } else {
        button.addEventListener("click", () => selectArchiveTutorChoice(type));
      }
      elements.archiveTutorOptions.appendChild(button);
    });
    if (elements.archiveTutorConfirm) elements.archiveTutorConfirm.disabled = true;
    elements.archiveTutorOverlay.hidden = false;
  }

  function selectArchiveTutorChoice(choice) {
    pendingArchiveTutorChoice = choice;
    if (elements.archiveTutorOptions) {
      Array.from(elements.archiveTutorOptions.children).forEach((child) => {
        child.classList.toggle("active", child.dataset.choice === choice);
      });
    }
    if (elements.archiveTutorConfirm) elements.archiveTutorConfirm.disabled = false;
  }

  function confirmArchiveTutor() {
    if (!pendingTrade || !pendingArchiveTutorChoice) return;
    pendingTrade.rewardType = pendingArchiveTutorChoice;
    if (elements.archiveTutorOverlay) elements.archiveTutorOverlay.hidden = true;
    pendingArchiveTutorChoice = null;
    finalizeTrade();
  }

  function cancelArchiveTutor() {
    pendingTrade = null;
    pendingArchiveTutorChoice = null;
    pendingPoolSelection = null;
    if (elements.archiveTutorOverlay) elements.archiveTutorOverlay.hidden = true;
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
    pendingTrade = null;
    pendingWoodChoice = null;
    pendingGemChoice = null;
    pendingChoiceSelection = null;
    pendingPoolSelection = null;
    pendingArchiveTutorChoice = null;
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
    if (elements.woodOverlay) elements.woodOverlay.hidden = true;
    if (elements.gemTutorOverlay) elements.gemTutorOverlay.hidden = true;
    if (elements.choiceCostOverlay) elements.choiceCostOverlay.hidden = true;
    if (elements.poolCostOverlay) elements.poolCostOverlay.hidden = true;
    if (elements.archiveTutorOverlay) elements.archiveTutorOverlay.hidden = true;
    hideActionToast();

    startGame(state);
    renderApp(state, elements, handlers);
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
    pendingTrade = null;
    pendingWoodChoice = null;
    pendingGemChoice = null;
    pendingChoiceSelection = null;
    pendingPoolSelection = null;
    pendingArchiveTutorChoice = null;
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
    if (elements.woodOverlay) elements.woodOverlay.hidden = true;
    if (elements.gemTutorOverlay) elements.gemTutorOverlay.hidden = true;
    if (elements.choiceCostOverlay) elements.choiceCostOverlay.hidden = true;
    if (elements.poolCostOverlay) elements.poolCostOverlay.hidden = true;
    if (elements.archiveTutorOverlay) elements.archiveTutorOverlay.hidden = true;
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
    renderApp(state, elements, handlers);
  }

  const handlers = {
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
    confirmChoiceCost,
    cancelChoiceCost,
    confirmPoolCost,
    cancelPoolCost,
    confirmArchiveTutor,
    cancelArchiveTutor,
    startTurn,
    closeCpuSummary,
  };

  return handlers;
}
