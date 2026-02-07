import { countCards, getCardType } from "../shared/utils.js";
import { canInitiateTrade, getCurrentPlayer } from "../game/rules.js";
import { isMyTurn } from "../game/multiplayer.js";

function renderCards(container, cards, clickHandler) {
  container.innerHTML = "";
  cards.forEach((card, index) => {
    const type = getCardType(card);
    const el = document.createElement("div");
    el.className = `card ${type}`;
    el.dataset.cardType = type;
    el.innerHTML = ``;
    if (clickHandler) {
      el.addEventListener("click", () => clickHandler(index));
    }
    container.appendChild(el);
  });
}

function renderHand(state, player, elements, handlers) {
  const displayOrder = state.ruleset.displayOrder ?? ["bronze", "silver", "gold"];
  if (player.hand.length <= 10) {
    renderCards(elements.handCards, player.hand, handlers.playCard);
    return;
  }

  elements.handCards.innerHTML = "";
  const counts = countCards(player.hand, displayOrder);
  displayOrder.forEach((type) => {
    if (counts[type] === 0) return;
    const el = document.createElement("div");
    el.className = `card ${type} pile`;
    el.dataset.cardType = type;
    el.innerHTML = `<div class="pile-count">x ${counts[type]}</div>`;
    if (handlers.playCardByType) {
      el.addEventListener("click", () => handlers.playCardByType(type));
    }
    elements.handCards.appendChild(el);
  });
}

export function renderApp(state, elements, handlers) {
  if (state.winner !== null) return;
  const cpuPerspective = state.mode === "cpu";
  const onlinePerspective = state.mode === "online" && state.online?.playerId;
  const player = cpuPerspective
    ? state.players[0]
    : onlinePerspective
      ? state.players.find((p) => p.id === state.online.playerId) ?? getCurrentPlayer(state)
      : getCurrentPlayer(state);
  const opponent = cpuPerspective
    ? state.players[1]
    : state.players.find((p) => p.id !== player.id) ??
      state.players[state.currentPlayer === 0 ? 1 : 0];

  const displayOrder = state.ruleset.displayOrder ?? ["bronze", "silver", "gold"];
  const primaryTypes = displayOrder.slice(0, 3);
  const secondaryTypes = displayOrder.slice(3);
  const handCounts = countCards(player.hand, displayOrder);
  const archiveCounts = countCards(player.archive, displayOrder);
  const opponentArchive = countCards(opponent.archive, displayOrder);
  const opponentHandTotal = opponent.hand.length;
  const opponentArchiveTotal = opponent.archive.length;

  const buildLine = (types, counts) =>
    types
      .map((type) => `${type.charAt(0).toUpperCase() + type.slice(1)} ${counts[type] ?? 0}`)
      .join(" · ");
  const currentName = state.players[state.currentPlayer]?.name ?? `Player ${state.currentPlayer + 1}`;
  elements.turnIndicator.textContent = `${currentName}'s Turn`;
  elements.turnCounter.textContent = `Turn ${state.turnCount}`;
  if (state.mode === "cpu") {
    const primaryOpponent = buildLine(primaryTypes, opponentArchive);
    if (secondaryTypes.length > 0) {
      const secondaryOpponent = buildLine(secondaryTypes, opponentArchive);
      elements.opponentSummary.innerHTML = `<div class="count-line">Opponent Archive — ${primaryOpponent} · Hand ${opponentHandTotal}</div><div class="count-line">${secondaryOpponent}</div>`;
    } else {
      elements.opponentSummary.textContent = `Opponent Archive — ${primaryOpponent} · Hand ${opponentHandTotal}`;
    }
  } else {
    elements.opponentSummary.textContent = `Opponent Archive — Gold ${opponentArchive.gold ?? 0} · Archive ${opponentArchiveTotal} · Hand ${opponentHandTotal}`;
  }
  const primaryArchive = buildLine(primaryTypes, archiveCounts);
  const primaryHand = buildLine(primaryTypes, handCounts);
  if (secondaryTypes.length > 0) {
    const secondaryArchive = buildLine(secondaryTypes, archiveCounts);
    const secondaryHand = buildLine(secondaryTypes, handCounts);
    elements.archiveCounts.innerHTML = `<div class="count-line">${primaryArchive}</div><div class="count-line">${secondaryArchive}</div>`;
    elements.handCounts.innerHTML = `<div class="count-line">${primaryHand}</div><div class="count-line">${secondaryHand}</div>`;
  } else {
    elements.archiveCounts.textContent = primaryArchive;
    elements.handCounts.textContent = primaryHand;
  }

  elements.deckInfo.textContent = `Deck: ${player.deck.length} cards`;
  elements.discardInfo.textContent = `Discard: ${player.discard.length} cards`;
  elements.tradeInfo.textContent = `Trades used: ${state.tradesThisTurn}/${state.ruleset.maxTrades}`;

  const turnGate =
    state.mode === "online"
      ? isMyTurn(state)
      : state.mode === "cpu"
        ? state.currentPlayer === 0
        : true;
  const showOpponentActive = state.mode === "online" && !turnGate && state.phase === "confirm";
  const activeOwner = showOpponentActive ? opponent : player;
  const canInteract = turnGate;

  renderHand(state, player, elements, {
    playCard: canInteract ? handlers.playCard : null,
    playCardByType: canInteract ? handlers.playCardByType : null,
  });
  renderCards(
    elements.activeCards,
    activeOwner.active,
    canInteract && !showOpponentActive ? handlers.returnCard : null
  );

  elements.archivePile.innerHTML = "";
  displayOrder.forEach((type) => {
    const badge = document.createElement("div");
    badge.className = `chip ${type}`;
    badge.textContent = `${type} x ${archiveCounts[type]}`;
    elements.archivePile.appendChild(badge);
  });

  const inMainPhase = state.phase === "main";
  elements.tradeBronze.disabled =
    !inMainPhase || !turnGate || !canInitiateTrade(state, player, "trade_bronze");
  elements.tradeSilver.disabled =
    !inMainPhase || !turnGate || !canInitiateTrade(state, player, "trade_silver");
  if (elements.tradeGems) {
    elements.tradeGems.hidden = state.format !== "expanded";
    elements.tradeGems.disabled =
      state.format !== "expanded" ||
      !inMainPhase ||
      !turnGate ||
      !canInitiateTrade(state, player, "trade_gem_set");
  }
  if (elements.tradePlatinum) {
    elements.tradePlatinum.hidden = state.format !== "expanded";
    elements.tradePlatinum.disabled =
      state.format !== "expanded" ||
      !inMainPhase ||
      !turnGate ||
      !canInitiateTrade(state, player, "trade_platinum");
  }
  elements.endTurn.disabled = state.phase !== "main" || !turnGate;
  elements.undoPlays.disabled = !inMainPhase || !turnGate || player.active.length === 0;
}

export function showTurnOverlay(state, elements) {
  elements.overlayTitle.textContent = `Player ${state.currentPlayer + 1}, ready?`;
  elements.turnOverlay.hidden = false;
}

export function showConfirmOverlay(state, elements) {
  const pending = state.pendingArchive;
  if (!pending) return;
  const displayOrder = state.ruleset.displayOrder ?? ["bronze", "silver", "gold"];
  const counts = countCards(pending.playedCards, displayOrder);
  elements.confirmSummary.textContent = `Archive ${pending.playedCards.length} card(s) and draw ${pending.drawCount} card(s).`;
  elements.confirmCards.innerHTML = "";
  displayOrder.forEach((type) => {
    if (counts[type] === 0) return;
    const badge = document.createElement("div");
    badge.className = `chip ${type}`;
    badge.textContent = `${type} x ${counts[type]}`;
    elements.confirmCards.appendChild(badge);
  });
  if (pending.playedCards.length === 0) {
    const note = document.createElement("div");
    note.className = "muted";
    note.textContent = "No active cards to archive this turn.";
    elements.confirmCards.appendChild(note);
  }
  elements.confirmOverlay.hidden = false;
}
