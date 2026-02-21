import { countCards, getCardType } from "../shared/utils.js";
import { canInitiateTrade, getCurrentPlayer } from "../game/rules.js";
import { isMyTurn } from "../game/multiplayer.js";
import { getCardTooltip } from "./card-tooltips.js";

function applyCardTooltip(el, type, ruleset) {
  const tooltip = getCardTooltip(type, ruleset);
  if (!tooltip) return;
  el.dataset.tooltip = tooltip;
  el.title = tooltip;
}

function renderCards(container, cards, clickHandler, ruleset) {
  container.innerHTML = "";
  cards.forEach((card, index) => {
    const type = getCardType(card);
    const el = document.createElement("div");
    el.className = `card ${type}`;
    el.dataset.cardType = type;
    el.dataset.cardName = titleCase(type);
    applyCardTooltip(el, type, ruleset);
    el.innerHTML = ``;
    const label = document.createElement("span");
    label.className = "card-label";
    label.textContent = titleCase(type);
    el.appendChild(label);
    if (clickHandler) {
      el.addEventListener("click", () => clickHandler(index));
    }
    container.appendChild(el);
  });
}

function renderHand(state, player, elements, handlers) {
  const displayOrder = state.ruleset.displayOrder ?? ["bronze", "silver", "gold"];
  if (player.hand.length <= 10) {
    renderCards(elements.handCards, player.hand, handlers.playCard, state.ruleset);
    return;
  }

  elements.handCards.innerHTML = "";
  const counts = countCards(player.hand, displayOrder);
  displayOrder.forEach((type) => {
    if (counts[type] === 0) return;
    const el = document.createElement("div");
    el.className = `card ${type} pile`;
    el.dataset.cardType = type;
    el.dataset.cardName = titleCase(type);
    applyCardTooltip(el, type, state.ruleset);
    el.innerHTML = `<div class="pile-count">x ${counts[type]}</div>`;
    const label = document.createElement("span");
    label.className = "card-label";
    label.textContent = titleCase(type);
    el.appendChild(label);
    if (handlers.playCardByType) {
      el.addEventListener("click", () => handlers.playCardByType(type));
    }
    elements.handCards.appendChild(el);
  });
}

function titleCase(type) {
  if (!type) return "";
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function updateHowToPlay(state, elements) {
  if (!elements.rulesList && !elements.expansionRules && !elements.cardLegend) return;
  const baseRules = [
    "Each player starts with a shuffled deck and draws 5 cards.",
    "On your turn, trade (up to 5 times), then play up to 5 cards.",
    "End your turn to archive active cards and draw from them.",
    "Win immediately when your Archive contains 5 gold stars.",
  ];
  if (elements.rulesList) {
    elements.rulesList.innerHTML = baseRules.map((rule) => `<li>${rule}</li>`).join("");
  }

  const isExpanded = state.format === "expanded";
  const isAncient = state.format === "ancient";
  const expansionRules = [];
  if (isExpanded) {
    expansionRules.push("Gems: Ruby + Emerald + Sapphire → tutor any card (shuffle).");
    expansionRules.push(
      "Platinum: Platinum + Bronze + Silver → dig for a non-bronze/silver card."
    );
    expansionRules.push(
      "Wood: can replace one required card in trades costing 3+ (max 1 per trade)."
    );
  }
  if (isAncient) {
    expansionRules.push(
      "Ancients: 2 distinct ancients → archive 1 non-gold from deck (shuffle)."
    );
    expansionRules.push("Ingot: counts as 3 bronze in archive trades.");
    expansionRules.push("Sterling: counts as 2 silver in archive trades.");
  }

  if (elements.expansionRules) {
    if (expansionRules.length === 0) {
      elements.expansionRules.innerHTML = "";
    } else {
      elements.expansionRules.innerHTML = `
        <div class="expansion-rules">
          <h3>Expansion Cards</h3>
          <ul class="rules">
            ${expansionRules.map((rule) => `<li>${rule}</li>`).join("")}
          </ul>
        </div>
      `;
    }
  }

  if (elements.cardLegend) {
    const legendTypes = ["bronze", "silver", "gold"];
    if (isExpanded) {
      legendTypes.push("wood", "ruby", "emerald", "sapphire", "platinum");
    }
    if (isAncient) {
      legendTypes.push("turquoise", "lapis_lazuli", "carnelian", "ingot", "sterling");
    }
    elements.cardLegend.innerHTML = "";
    legendTypes.forEach((type) => {
      const chip = document.createElement("span");
      chip.className = `chip ${type}`;
      chip.textContent = titleCase(type);
      elements.cardLegend.appendChild(chip);
    });
  }
}

export function renderApp(state, elements, handlers) {
  if (state.winner !== null) return;
  updateHowToPlay(state, elements);
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
  const handCounts = countCards(player.hand, displayOrder);
  const archiveCounts = countCards(player.archive, displayOrder);
  const opponentArchive = countCards(opponent.archive, displayOrder);
  const opponentHandTotal = opponent.hand.length;

  const buildChips = (types, counts, container) => {
    container.innerHTML = "";
    types.forEach((type) => {
      const badge = document.createElement("div");
      badge.className = `chip ${type}`;
      badge.textContent = `${type} x ${counts[type] ?? 0}`;
      container.appendChild(badge);
    });
  };
  const currentName = state.players[state.currentPlayer]?.name ?? `Player ${state.currentPlayer + 1}`;
  elements.turnIndicator.textContent = `${currentName}'s Turn`;
  elements.turnCounter.textContent = `Turn ${state.turnCount}`;
  if (elements.opponentSummary) {
    const opponentTypes = state.mode === "cpu" ? displayOrder : displayOrder;
    elements.opponentSummary.innerHTML = "";
    const title = document.createElement("div");
    title.className = "summary-title";
    title.textContent = "Opponent Summary";
    const chips = document.createElement("div");
    chips.className = "summary-chips";
    buildChips(opponentTypes, opponentArchive, chips);
    const handInfo = document.createElement("div");
    handInfo.className = "summary-hand";
    handInfo.textContent = `Hand: ${opponentHandTotal}`;
    elements.opponentSummary.appendChild(title);
    elements.opponentSummary.appendChild(chips);
    elements.opponentSummary.appendChild(handInfo);
  }
  if (elements.handCounts) {
    buildChips(displayOrder, handCounts, elements.handCounts);
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
    canInteract && !showOpponentActive ? handlers.returnCard : null,
    state.ruleset
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
  const isExpanded = state.format === "expanded";
  const isAncient = state.format === "ancient";
  if (elements.tradeGems) {
    elements.tradeGems.hidden = !isExpanded;
    elements.tradeGems.disabled =
      !isExpanded ||
      !inMainPhase ||
      !turnGate ||
      !canInitiateTrade(state, player, "trade_gem_set");
  }
  if (elements.tradePlatinum) {
    elements.tradePlatinum.hidden = !isExpanded;
    elements.tradePlatinum.disabled =
      !isExpanded ||
      !inMainPhase ||
      !turnGate ||
      !canInitiateTrade(state, player, "trade_platinum");
  }
  if (elements.tradeAncientsArchive) {
    elements.tradeAncientsArchive.hidden = !isAncient;
    elements.tradeAncientsArchive.disabled =
      !isAncient ||
      !inMainPhase ||
      !turnGate ||
      !canInitiateTrade(state, player, "trade_ancients_archive");
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
