import { countCards, getCardType } from "../shared/utils.js";
import { canTrade, getCurrentPlayer } from "../game/rules.js";

function renderCards(container, cards, clickHandler) {
  container.innerHTML = "";
  cards.forEach((card, index) => {
    const type = getCardType(card);
    const el = document.createElement("div");
    el.className = `card ${type}`;
    el.innerHTML = `<div class="label">${type}</div><div class="stars">${
      type === "gold" ? "★★★" : type === "silver" ? "★★" : "★"
    }</div>`;
    el.addEventListener("click", () => clickHandler(index));
    container.appendChild(el);
  });
}

function renderHand(state, player, elements, handlers) {
  if (player.hand.length <= 10) {
    renderCards(elements.handCards, player.hand, handlers.playCard);
    return;
  }

  elements.handCards.innerHTML = "";
  const counts = countCards(player.hand);
  ["gold", "silver", "bronze"].forEach((type) => {
    if (counts[type] === 0) return;
    const el = document.createElement("div");
    el.className = `card ${type} pile`;
    el.innerHTML = `<div class="label">${type}</div><div class="stars">${
      type === "gold" ? "★★★★★" : type === "silver" ? "★★" : "★"
    }</div><div class="pile-count">x ${counts[type]}</div>`;
    el.addEventListener("click", () => handlers.playCardByType(type));
    elements.handCards.appendChild(el);
  });
}

export function renderApp(state, elements, handlers) {
  if (state.winner !== null) return;
  const player = getCurrentPlayer(state);
  const opponent = state.players[state.currentPlayer === 0 ? 1 : 0];

  const handCounts = countCards(player.hand);
  const archiveCounts = countCards(player.archive);
  const opponentArchive = countCards(opponent.archive);

  elements.turnIndicator.textContent = `Player ${state.currentPlayer + 1}'s Turn`;
  elements.turnCounter.textContent = `Turn ${state.turnCount}`;
  elements.opponentSummary.textContent = `Opponent Archive — Bronze ${
    opponentArchive.bronze
  } / Silver ${opponentArchive.silver} / Gold ${opponentArchive.gold}`;

  elements.archiveCounts.textContent = `Bronze ${archiveCounts.bronze} · Silver ${archiveCounts.silver} · Gold ${archiveCounts.gold}`;
  elements.handCounts.textContent = `Bronze ${handCounts.bronze} · Silver ${handCounts.silver} · Gold ${handCounts.gold}`;

  elements.deckInfo.textContent = `Deck: ${player.deck.length} cards`;
  elements.discardInfo.textContent = `Discard: ${player.discard.length} cards`;
  elements.tradeInfo.textContent = `Trades used: ${state.tradesThisTurn}/${state.ruleset.maxTrades}`;

  renderHand(state, player, elements, handlers);
  renderCards(elements.activeCards, player.active, handlers.returnCard);

  elements.archivePile.innerHTML = "";
  ["bronze", "silver", "gold"].forEach((type) => {
    const badge = document.createElement("div");
    badge.className = `chip ${type}`;
    badge.textContent = `${type} x ${archiveCounts[type]}`;
    elements.archivePile.appendChild(badge);
  });

  const inMainPhase = state.phase === "main";
  elements.tradeBronze.disabled = !inMainPhase || !canTrade(state, player, "bronze");
  elements.tradeSilver.disabled = !inMainPhase || !canTrade(state, player, "silver");
  elements.endTurn.disabled = state.phase !== "main";
  elements.undoPlays.disabled = !inMainPhase || player.active.length === 0;
}

export function showTurnOverlay(state, elements) {
  elements.overlayTitle.textContent = `Player ${state.currentPlayer + 1}, ready?`;
  elements.turnOverlay.hidden = false;
}

export function showConfirmOverlay(state, elements) {
  const pending = state.pendingArchive;
  if (!pending) return;
  const counts = countCards(pending.playedCards);
  elements.confirmSummary.textContent = `Archive ${pending.playedCards.length} card(s) and draw ${pending.drawCount} card(s).`;
  elements.confirmCards.innerHTML = "";
  ["bronze", "silver", "gold"].forEach((type) => {
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
