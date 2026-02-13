export function createCpuFlow({
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
}) {
  let pendingCpuWinner = null;

  function formatCountLine(counts, displayOrder) {
    const parts = displayOrder
      .map((type) => {
        const value = counts[type] ?? 0;
        return value > 0 ? `${value} ${type}` : null;
      })
      .filter(Boolean);
    return parts.length ? parts.join(", ") : "no cards";
  }

  function formatCpuTrade(trade) {
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
    } else if (recipe.reward?.type === "archive_hand") {
      const handArchive = trade.handArchive ?? {};
      const parts = Object.entries(handArchive)
        .filter(([, value]) => value)
        .map(([type, value]) => `${value} ${type}`);
      rewardLine = parts.length
        ? `archive ${parts.join(", ")} from hand`
        : "archive cards from hand";
    } else if (recipe.reward?.type === "archive") {
      rewardLine = trade.rewardType ? `archive ${trade.rewardType}` : "archive a card";
    } else if (recipe.reward?.type === "archive_cards") {
      const rewardCards =
        Array.isArray(trade.rewardCards) && trade.rewardCards.length > 0
          ? trade.rewardCards
          : recipe.reward.cards ?? [];
      rewardLine = rewardCards.length
        ? `archive ${rewardCards.join(", ")}`
        : "archive cards";
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
        line.textContent = formatCpuTrade(trade);
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
    render();
    if (pendingCpuWinner !== null && pendingCpuWinner !== undefined) {
      const winner = pendingCpuWinner;
      pendingCpuWinner = null;
      onWinner(winner);
    }
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

  return { maybeRunCpuTurn, closeCpuSummary };
}
