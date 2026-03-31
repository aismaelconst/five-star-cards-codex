import { countCards, getCardType } from "../shared/utils.js";
import { canInitiateTrade, getCurrentPlayer, getPlayerPlayLimit } from "../game/rules.js";
import { isMyTurn } from "../game/multiplayer.js";
import { getCardTooltip } from "./card-tooltips.js";
import { isCompactBoardActive } from "./viewport.js";

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

function renderHand(state, player, elements, handlers, options = {}) {
  const compactBoard = options.compactBoard ?? false;
  const displayOrder = state.ruleset.displayOrder ?? ["bronze", "silver", "gold"];
  const pileThreshold = compactBoard ? 5 : 10;
  if (player.hand.length <= pileThreshold) {
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

function renderArchiveMiniStacks(container, counts, displayOrder, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  container.classList.remove("archive-count-grid");
  const owner = options.owner ?? "player";
  const onSelect = options.onSelect ?? null;
  let shown = 0;
  displayOrder.forEach((type) => {
    const count = counts[type] ?? 0;
    if (count <= 0) return;
    shown += 1;
    const stack = document.createElement("button");
    stack.type = "button";
    stack.className = `mini-stack ${type}`;
    stack.dataset.cardType = type;
    stack.dataset.owner = owner;
    stack.setAttribute(
      "aria-label",
      `${owner === "opponent" ? "Opponent" : "Player"} archive ${titleCase(type)} x ${count}`
    );
    if (type === "gold") {
      stack.classList.add("gold-focus");
      if (count >= 4) {
        stack.classList.add("gold-urgent");
      }
    }

    const cards = document.createElement("div");
    cards.className = "mini-stack-cards";
    const previewCount = Math.min(3, count);
    for (let index = 0; index < previewCount; index += 1) {
      const miniCard = document.createElement("div");
      miniCard.className = `mini-card card ${type}`;
      miniCard.style.setProperty("--stack-offset", `${index * 10}px`);
      cards.appendChild(miniCard);
    }

    const badge = document.createElement("div");
    badge.className = "mini-stack-badge";
    badge.textContent = `x${count}`;

    const label = document.createElement("div");
    label.className = "mini-stack-label";
    label.textContent = titleCase(type);

    stack.appendChild(cards);
    stack.appendChild(badge);
    stack.appendChild(label);

    if (typeof onSelect === "function") {
      stack.addEventListener("click", () => onSelect(owner, type, count));
    } else {
      stack.disabled = true;
    }

    container.appendChild(stack);
  });
  if (shown === 0) {
    const empty = document.createElement("div");
    empty.className = "archive-empty muted";
    empty.textContent = "No archived cards.";
    container.appendChild(empty);
  }
}

function renderArchiveCounts(container, counts, displayOrder, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  container.classList.add("archive-count-grid");
  const owner = options.owner ?? "player";
  const onSelect = options.onSelect ?? null;
  let shown = 0;
  displayOrder.forEach((type) => {
    const count = counts[type] ?? 0;
    if (count <= 0) return;
    shown += 1;
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = `archive-count-button chip ${type}`;
    badge.dataset.cardType = type;
    badge.dataset.owner = owner;
    badge.setAttribute(
      "aria-label",
      `${owner === "opponent" ? "Opponent" : "Player"} archive ${titleCase(type)} x ${count}`
    );
    if (type === "gold") {
      badge.classList.add("gold-focus");
      if (count >= 4) {
        badge.classList.add("gold-urgent");
      }
    }
    const label = document.createElement("span");
    label.className = "archive-count-label";
    label.textContent = titleCase(type);
    const total = document.createElement("span");
    total.className = "archive-count-total";
    total.textContent = `x${count}`;
    badge.appendChild(label);
    badge.appendChild(total);
    if (typeof onSelect === "function") {
      badge.addEventListener("click", () => onSelect(owner, type, count));
    } else {
      badge.disabled = true;
    }
    container.appendChild(badge);
  });
  if (shown === 0) {
    const empty = document.createElement("div");
    empty.className = "archive-empty muted";
    empty.textContent = "No archived cards.";
    container.appendChild(empty);
  }
}

function renderDeckDiscardWidgets(elements, player, options = {}) {
  const compactBoard = options.compactBoard ?? false;
  if (elements.deckInfo) {
    elements.deckInfo.textContent = `${player.deck.length} card(s)`;
  }
  if (elements.discardInfo) {
    elements.discardInfo.textContent = `${player.discard.length} card(s)`;
  }
  if (elements.deckZone) {
    elements.deckZone.classList.toggle("compact-count-only", compactBoard);
  }
  if (elements.discardZone) {
    elements.discardZone.classList.toggle("compact-count-only", compactBoard);
  }
  if (elements.boardDeckStack) {
    elements.boardDeckStack.hidden = compactBoard;
    elements.boardDeckStack.className = "stack-card card card-back back";
  }
  if (elements.boardDiscardStack) {
    elements.boardDiscardStack.hidden = compactBoard;
    const topCard = player.discard[player.discard.length - 1];
    const topCardType = topCard ? getCardType(topCard) : null;
    if (topCardType) {
      elements.boardDiscardStack.className = `stack-card card ${topCardType}`;
      elements.boardDiscardStack.dataset.cardType = topCardType;
    } else {
      elements.boardDiscardStack.className = "stack-card card card-back back";
      elements.boardDiscardStack.dataset.cardType = "back";
    }
  }
}

function renderArchiveInspect(state, elements) {
  if (
    !elements.archiveInspectOverlay ||
    !elements.archiveInspectTitle ||
    !elements.archiveInspectCards ||
    !elements.archiveInspectMeta
  ) {
    return;
  }
  const inspect = state.ui?.archiveInspect;
  if (!inspect?.visible || !inspect.type) {
    elements.archiveInspectOverlay.hidden = true;
    return;
  }
  const safeCount = Math.max(0, inspect.count ?? 0);
  const ownerText = inspect.owner === "opponent" ? "Opponent Archive" : "Your Archive";
  elements.archiveInspectTitle.textContent = `${ownerText}: ${titleCase(inspect.type)}`;
  elements.archiveInspectMeta.textContent = `${titleCase(inspect.type)} x ${safeCount}`;
  elements.archiveInspectCards.innerHTML = "";
  const renderCount = Math.min(12, safeCount);
  for (let index = 0; index < renderCount; index += 1) {
    const card = document.createElement("div");
    card.className = `card ${inspect.type}`;
    card.dataset.cardType = inspect.type;
    const label = document.createElement("span");
    label.className = "card-label";
    label.textContent = titleCase(inspect.type);
    card.appendChild(label);
    elements.archiveInspectCards.appendChild(card);
  }
  if (safeCount > renderCount) {
    const note = document.createElement("div");
    note.className = "muted";
    note.textContent = `+${safeCount - renderCount} more`;
    elements.archiveInspectCards.appendChild(note);
  }
  elements.archiveInspectOverlay.hidden = false;
}

function renderGoldRaceTrack(container, label, count) {
  if (!container) return;
  const safeCount = Math.max(0, Math.min(5, count ?? 0));
  container.className = "gold-race-track";
  if (safeCount >= 4) container.classList.add("urgent");
  container.innerHTML = "";
  const text = document.createElement("div");
  text.className = "gold-race-label";
  text.textContent = `${label}: Gold ${safeCount}/5`;
  container.appendChild(text);
  const segments = document.createElement("div");
  segments.className = "gold-race-segments";
  for (let i = 0; i < 5; i += 1) {
    const segment = document.createElement("span");
    segment.className = "gold-race-segment";
    segment.textContent = "★";
    if (i < safeCount) segment.classList.add("filled");
    segments.appendChild(segment);
  }
  container.appendChild(segments);
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
  const isMystic = state.format === "mystic";
  const isFoundry = state.format === "foundry";
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
  if (isMystic) {
    expansionRules.push("Pearl: trade itself to gain +1 play this turn (once per turn).");
    expansionRules.push(
      "Obsidian: trade itself to make opponent play 1 less card next turn (once per turn)."
    );
    expansionRules.push(
      "Amethyst: trade itself to shuffle 1 chosen opponent archive card into their deck."
    );
    expansionRules.push(
      "Ash: trade itself to shuffle 1 random opponent hand card into their deck."
    );
    expansionRules.push(
      "Ember: trade itself to prevent opponent trades on their next turn (once per turn)."
    );
  }
  if (isFoundry) {
    expansionRules.push(
      "Prospector: trade itself with 1 bronze to dig until the first non-bronze card."
    );
    expansionRules.push("Alloy: counts as 1 bronze or 1 silver in archive trades.");
    expansionRules.push(
      "Assayer: trade itself with 1 non-gold to tutor a Foundry card into hand (shuffle)."
    );
    expansionRules.push("Smelter: trade itself with 3 bronze to tutor 1 silver into hand.");
    expansionRules.push("Refiner: trade itself with 3 silver to tutor 1 gold into hand.");
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
    if (isMystic) {
      legendTypes.push("pearl", "obsidian", "amethyst", "ash", "ember");
    }
    if (isFoundry) {
      legendTypes.push("prospector", "alloy", "assayer", "smelter", "refiner");
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

  const compactBoard = isCompactBoardActive();
  const displayOrder = state.ruleset.displayOrder ?? ["bronze", "silver", "gold"];
  const playerIndex = state.players.findIndex((entry) => entry.id === player.id);
  const effectivePlayerIndex = playerIndex === -1 ? state.currentPlayer : playerIndex;
  const playLimit = getPlayerPlayLimit(state, effectivePlayerIndex);
  const archiveCounts = countCards(player.archive, displayOrder);
  const opponentArchive = countCards(opponent.archive, displayOrder);
  const opponentHandTotal = opponent.hand.length;
  const currentName = state.players[state.currentPlayer]?.name ?? `Player ${state.currentPlayer + 1}`;
  elements.turnIndicator.textContent = `${currentName}'s Turn`;
  elements.turnCounter.textContent = `Turn ${state.turnCount}`;
  renderGoldRaceTrack(elements.goldRacePlayer, player.name ?? "You", archiveCounts.gold ?? 0);
  renderGoldRaceTrack(
    elements.goldRaceOpponent,
    opponent.name ?? "Opponent",
    opponentArchive.gold ?? 0
  );
  if (elements.opponentSummary) {
    elements.opponentSummary.innerHTML = "";
    const title = document.createElement("div");
    title.className = "summary-title";
    title.textContent = "Opponent Summary";
    const stacks = document.createElement("div");
    stacks.className = compactBoard
      ? "summary-archive-stacks archive-count-grid"
      : "summary-archive-stacks";
    if (compactBoard) {
      renderArchiveCounts(stacks, opponentArchive, displayOrder, {
        owner: "opponent",
        onSelect: handlers.openArchiveInspect,
      });
    } else {
      renderArchiveMiniStacks(stacks, opponentArchive, displayOrder, {
        owner: "opponent",
        onSelect: handlers.openArchiveInspect,
      });
    }
    const handInfo = document.createElement("div");
    handInfo.className = "summary-hand";
    handInfo.textContent = `Hand: ${opponentHandTotal}`;
    elements.opponentSummary.appendChild(title);
    elements.opponentSummary.appendChild(stacks);
    elements.opponentSummary.appendChild(handInfo);
  }

  renderDeckDiscardWidgets(elements, player, { compactBoard });
  elements.tradeInfo.textContent = `Trades used: ${state.tradesThisTurn}/${state.ruleset.maxTrades} • Plays used: ${player.active.length}/${playLimit}`;

  const turnGate =
    state.mode === "online"
      ? isMyTurn(state)
      : state.mode === "cpu"
        ? state.currentPlayer === 0
        : true;
  const showOpponentActive = state.mode === "online" && !turnGate && state.phase === "confirm";
  const activeOwner = showOpponentActive ? opponent : player;
  const canInteract = turnGate;

  renderHand(
    state,
    player,
    elements,
    {
      playCard: canInteract ? handlers.playCard : null,
      playCardByType: canInteract ? handlers.playCardByType : null,
    },
    { compactBoard }
  );
  renderCards(
    elements.activeCards,
    activeOwner.active,
    canInteract && !showOpponentActive ? handlers.returnCard : null,
    state.ruleset
  );

  if (compactBoard) {
    renderArchiveCounts(elements.archivePile, archiveCounts, displayOrder, {
      owner: "player",
      onSelect: handlers.openArchiveInspect,
    });
  } else {
    renderArchiveMiniStacks(elements.archivePile, archiveCounts, displayOrder, {
      owner: "player",
      onSelect: handlers.openArchiveInspect,
    });
  }
  renderArchiveInspect(state, elements);

  const inMainPhase = state.phase === "main";
  elements.tradeBronze.disabled =
    !inMainPhase || !turnGate || !canInitiateTrade(state, player, "trade_bronze");
  elements.tradeSilver.disabled =
    !inMainPhase || !turnGate || !canInitiateTrade(state, player, "trade_silver");
  const isExpanded = state.format === "expanded";
  const isAncient = state.format === "ancient";
  const isMystic = state.format === "mystic";
  const isFoundry = state.format === "foundry";
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
  if (elements.tradePearl) {
    elements.tradePearl.hidden = !isMystic;
    elements.tradePearl.disabled =
      !isMystic || !inMainPhase || !turnGate || !canInitiateTrade(state, player, "trade_pearl");
  }
  if (elements.tradeObsidian) {
    elements.tradeObsidian.hidden = !isMystic;
    elements.tradeObsidian.disabled =
      !isMystic ||
      !inMainPhase ||
      !turnGate ||
      !canInitiateTrade(state, player, "trade_obsidian");
  }
  if (elements.tradeAmethyst) {
    elements.tradeAmethyst.hidden = !isMystic;
    elements.tradeAmethyst.disabled =
      !isMystic ||
      !inMainPhase ||
      !turnGate ||
      !canInitiateTrade(state, player, "trade_amethyst");
  }
  if (elements.tradeAsh) {
    elements.tradeAsh.hidden = !isMystic;
    elements.tradeAsh.disabled =
      !isMystic || !inMainPhase || !turnGate || !canInitiateTrade(state, player, "trade_ash");
  }
  if (elements.tradeEmber) {
    elements.tradeEmber.hidden = !isMystic;
    elements.tradeEmber.disabled =
      !isMystic || !inMainPhase || !turnGate || !canInitiateTrade(state, player, "trade_ember");
  }
  if (elements.tradeProspector) {
    elements.tradeProspector.hidden = !isFoundry;
    elements.tradeProspector.disabled =
      !isFoundry ||
      !inMainPhase ||
      !turnGate ||
      !canInitiateTrade(state, player, "trade_prospector");
  }
  if (elements.tradeAssayer) {
    elements.tradeAssayer.hidden = !isFoundry;
    elements.tradeAssayer.disabled =
      !isFoundry || !inMainPhase || !turnGate || !canInitiateTrade(state, player, "trade_assayer");
  }
  if (elements.tradeSmelter) {
    elements.tradeSmelter.hidden = !isFoundry;
    elements.tradeSmelter.disabled =
      !isFoundry || !inMainPhase || !turnGate || !canInitiateTrade(state, player, "trade_smelter");
  }
  if (elements.tradeRefiner) {
    elements.tradeRefiner.hidden = !isFoundry;
    elements.tradeRefiner.disabled =
      !isFoundry || !inMainPhase || !turnGate || !canInitiateTrade(state, player, "trade_refiner");
  }
  if (elements.openTradesModal) {
    const possibleTrades = [
      "trade_bronze",
      "trade_silver",
      ...(isExpanded ? ["trade_gem_set", "trade_platinum"] : []),
      ...(isAncient ? ["trade_ancients_archive"] : []),
      ...(isMystic
        ? ["trade_pearl", "trade_obsidian", "trade_amethyst", "trade_ash", "trade_ember"]
        : []),
      ...(isFoundry
        ? ["trade_prospector", "trade_assayer", "trade_smelter", "trade_refiner"]
        : []),
    ];
    const hasAvailableTrade =
      inMainPhase &&
      turnGate &&
      possibleTrades.some((recipeId) => canInitiateTrade(state, player, recipeId));
    elements.openTradesModal.classList.toggle("has-trades", hasAvailableTrade);
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
