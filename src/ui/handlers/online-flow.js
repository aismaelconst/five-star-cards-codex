export function createOnlineFlow({
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
  captureFeedbackSnapshot,
  runFeedbackFromSnapshot,
  showArchiveReplayFromEvent,
  returnToModeSelect,
}) {
  let onlineClient = null;
  let gameOverTimer = null;
  const resolvedSocketUrl = socketUrl ?? resolveSocketUrl();

  function resolveSocketUrl() {
    if (typeof window !== "undefined" && window.location) {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      return `${protocol}://${window.location.host}`;
    }
    return "ws://localhost:8080";
  }

  function setStatus(text) {
    if (state.online.role === "guest") {
      if (elements.guestStatus) elements.guestStatus.textContent = text;
      return;
    }
    if (elements.hostStatus) elements.hostStatus.textContent = text;
  }

  function ensureOnlineClient() {
    try {
      if (!onlineClient) {
        onlineClient = clientFactory({
          url: resolvedSocketUrl,
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
    state.turnEffects = payload.state.turnEffects ?? state.turnEffects;
    state.gameId = payload.state.gameId;
    state.ruleset = payload.state.ruleset;
    state.format = payload.state.format;
    state.online.roomId = payload.roomId ?? state.online.roomId;
    state.online.playerId = payload.playerId ?? state.online.playerId;
    updateFormatButtons(state, elements);
    render();
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
      if (event.recipeId === "trade_prospector") {
        const discarded = typeof event.digDiscardedCount === "number" ? event.digDiscardedCount : 0;
        const reward = event.rewardType ? `found ${event.rewardType}` : "deck exhausted";
        elements.opponentAlert.textContent = `Opponent used prospector to dig: discarded ${discarded} bronze, ${reward}${woodNote}.`;
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
        } else if (recipe.reward?.type === "archive_hand") {
          const handArchive = event.handArchive ?? {};
          const parts = Object.entries(handArchive)
            .filter(([, value]) => value)
            .map(([type, value]) => `${value} ${type}`);
          rewardLine = parts.length
            ? `archive ${parts.join(", ")} from hand`
            : "archive cards from hand";
        } else if (recipe.reward?.type === "archive") {
          rewardLine = event.rewardType ? `archive ${event.rewardType}` : "archive a card";
        } else if (recipe.reward?.type === "archive_cards") {
          const rewardCards =
            Array.isArray(event.rewardCards) && event.rewardCards.length > 0
              ? event.rewardCards
              : recipe.reward.cards ?? [];
          rewardLine = rewardCards.length
            ? `archive ${rewardCards.join(", ")}`
            : "archive cards";
        } else if (recipe.reward?.type === "effect") {
          if (recipe.reward.id === "pearl_extra_play") {
            rewardLine = `gain +1 play (limit ${event.playLimit ?? "6"})`;
          } else if (recipe.reward.id === "obsidian_next_turn_penalty") {
            rewardLine = "opponent plays 1 less next turn";
          } else if (recipe.reward.id === "amethyst_archive_to_deck") {
            rewardLine = event.targetType
              ? `shuffle opponent archive ${event.targetType} into deck`
              : "shuffle opponent archive card into deck";
          } else if (recipe.reward.id === "ash_random_hand_to_deck") {
            const moved = Array.isArray(event.movedTypes) && event.movedTypes.length > 0
              ? event.movedTypes[0]
              : "card";
            rewardLine = `shuffle opponent hand ${moved} into deck`;
          } else if (recipe.reward.id === "ember_next_turn_trade_block") {
            rewardLine = "opponent cannot make trades next turn";
          } else {
            rewardLine = recipe.reward.id ?? "effect";
          }
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
      if (typeof showArchiveReplayFromEvent === "function") {
        const actorName =
          state.players.find((player) => player.id === event.playerId)?.name ?? "Opponent";
        showArchiveReplayFromEvent(event, actorName);
      }
    }
  }

  function handleSelfTradeToast(message) {
    const event = message.lastEvent;
    if (!event || event.type !== "trade") return;
    const selfId = message.playerId ?? state.online.playerId;
    if (!selfId || event.playerId !== selfId) return;
    const recipe = state.ruleset.tradeRecipes?.[event.recipeId];
    showActionToast(formatTradeToast(event.recipeId, recipe, event));
  }

  function handleServerMessage(message) {
    updateDebug(message);
    handleSelfTradeToast(message);
    handleOpponentEvent(message);
    if (message.type === "state_update") {
      const beforeSnapshot =
        typeof captureFeedbackSnapshot === "function"
          ? captureFeedbackSnapshot()
          : null;
      applyServerState(message);
      if (typeof runFeedbackFromSnapshot === "function") {
        runFeedbackFromSnapshot(beforeSnapshot);
      }
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
    updateFormatButtons(state, elements);
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

  function sendAction(action) {
    if (state.mode !== "online") return null;
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

  function closeClient() {
    if (onlineClient) {
      onlineClient.close();
      onlineClient = null;
    }
    if (gameOverTimer) {
      clearTimeout(gameOverTimer);
      gameOverTimer = null;
    }
  }

  return {
    selectOnlineMode,
    chooseCreate,
    chooseJoin,
    backToChoice,
    createRoom,
    joinRoom,
    readyUp,
    copyRoomCode,
    sendAction,
    closeClient,
  };
}
