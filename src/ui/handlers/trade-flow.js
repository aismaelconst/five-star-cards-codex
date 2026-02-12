import {
  ActionTypes,
  canInitiateTrade,
  getChoiceCostOptions,
  getWoodSubstitutionOptions,
} from "../../game/rules.js";
import { countCards } from "../../shared/utils.js";
import { formatPlatinumMessage, formatPoolLabel, resolvePoolTypes } from "./trade-utils.js";

export function createTradeFlow(options) {
  const { state, elements, sendOrApply, getLocalPlayer, renderApp, showActionToast } =
    options;
  let pendingTrade = null;
  let pendingWoodChoice = null;
  let pendingGemChoice = null;
  let pendingChoiceSelection = null;
  let pendingPoolSelection = null;
  let pendingArchiveTutorChoice = null;
  let pendingHandArchive = null;

  function resetPending() {
    pendingTrade = null;
    pendingWoodChoice = null;
    pendingGemChoice = null;
    pendingChoiceSelection = null;
    pendingPoolSelection = null;
    pendingArchiveTutorChoice = null;
    pendingHandArchive = null;
  }

  function hideOverlays() {
    if (elements.woodOverlay) elements.woodOverlay.hidden = true;
    if (elements.gemTutorOverlay) elements.gemTutorOverlay.hidden = true;
    if (elements.choiceCostOverlay) elements.choiceCostOverlay.hidden = true;
    if (elements.poolCostOverlay) elements.poolCostOverlay.hidden = true;
    if (elements.archiveTutorOverlay) elements.archiveTutorOverlay.hidden = true;
    if (elements.handArchiveOverlay) elements.handArchiveOverlay.hidden = true;
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
      handArchive: null,
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
    if (recipe?.reward?.type === "archive_hand" && elements.handArchiveOverlay) {
      openHandArchiveOverlay();
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
      handArchive: pendingTrade.handArchive,
    };
    const result = sendOrApply({ type: ActionTypes.TRADE, payload });
    resetPending();
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
      renderApp();
    }
    return result;
  }

  function openWoodOverlay(options, allowNoWood) {
    if (!elements.woodSubOptions || !elements.woodOverlay) return;
    pendingWoodChoice = null;
    elements.woodSubOptions.innerHTML = "";
    const player = getLocalPlayer();
    const archiveCounts = countCards(player.archive);
    const allOptions = allowNoWood ? ["none", ...options] : options;
    if (elements.woodMessage) {
      elements.woodMessage.textContent = allowNoWood
        ? "Choose whether to replace one required card with wood."
        : "Wood required for this trade.";
    }
    allOptions.forEach((type) => {
      const button = document.createElement("button");
      button.className = "ghost option-button";
      if (type === "none") {
        button.textContent = "No wood";
      } else {
        const count = archiveCounts[type] ?? 0;
        button.textContent = `Replace ${type} (${count})`;
      }
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
    if (recipe?.reward?.type === "archive_hand" && elements.handArchiveOverlay) {
      openHandArchiveOverlay();
      return;
    }
    if (recipe?.reward?.type === "archive" && elements.archiveTutorOverlay) {
      openArchiveTutorOverlay();
      return;
    }
    finalizeTrade();
  }

  function cancelWoodSubstitution() {
    resetPending();
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
    resetPending();
    if (elements.gemTutorOverlay) elements.gemTutorOverlay.hidden = true;
  }

  function openChoiceCostOverlay() {
    if (!pendingTrade || !elements.choiceCostOptions || !elements.choiceCostOverlay) return;
    const player = getLocalPlayer();
    const archiveCounts = countCards(player.archive);
    const options = getChoiceCostOptions(state, player, pendingTrade.recipeId, {
      useWood: pendingTrade.useWood,
      substituteType: pendingTrade.substituteType,
    });
    pendingChoiceSelection = null;
    elements.choiceCostOptions.innerHTML = "";
    options.forEach((type) => {
      const button = document.createElement("button");
      button.className = "ghost option-button";
      const count = archiveCounts[type] ?? 0;
      button.textContent = `${type} (${count})`;
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
    if (recipe?.reward?.type === "archive_hand" && elements.handArchiveOverlay) {
      openHandArchiveOverlay();
      return;
    }
    if (recipe?.reward?.type === "archive" && elements.archiveTutorOverlay) {
      openArchiveTutorOverlay();
      return;
    }
    finalizeTrade();
  }

  function cancelChoiceCost() {
    resetPending();
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
      button.textContent = `${type} (${archiveCounts[type] ?? 0})`;
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
      if (pendingPoolSelection.distinct && selected.length >= pendingPoolSelection.max) {
        return;
      }
      selected.push(choice);
    }
    if (elements.poolCostOptions) {
      Array.from(elements.poolCostOptions.children).forEach((child) => {
        child.classList.toggle("active", selected.includes(child.dataset.choice));
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
    if (recipe?.reward?.type === "archive_hand" && elements.handArchiveOverlay) {
      openHandArchiveOverlay();
      return;
    }
    if (recipe?.reward?.type === "archive" && elements.archiveTutorOverlay) {
      openArchiveTutorOverlay();
      return;
    }
    finalizeTrade();
  }

  function cancelPoolCost() {
    resetPending();
    if (elements.poolCostOverlay) elements.poolCostOverlay.hidden = true;
  }

  function openHandArchiveOverlay() {
    if (!pendingTrade || !elements.handArchiveOptions || !elements.handArchiveOverlay) return;
    const recipe = state.ruleset.tradeRecipes?.[pendingTrade.recipeId];
    if (!recipe?.reward || recipe.reward.type !== "archive_hand") return;
    const player = getLocalPlayer();
    const displayOrder = state.ruleset.displayOrder ?? ["bronze", "silver", "gold"];
    const handCounts = countCards(player.hand, displayOrder);
    const allowed = recipe.reward.allowed ?? [];
    pendingHandArchive = {
      allowed,
      counts: handCounts,
      selected: {},
      min: recipe.reward.min ?? 1,
      max: recipe.reward.max ?? recipe.reward.min ?? 1,
    };
    elements.handArchiveOptions.innerHTML = "";
    allowed.forEach((type) => {
      const row = document.createElement("div");
      row.className = "hand-archive-row";
      row.dataset.type = type;

      const label = document.createElement("div");
      const chip = document.createElement("span");
      chip.className = `chip ${type}`;
      chip.textContent = type;
      const meta = document.createElement("span");
      meta.className = "hand-archive-meta";
      meta.textContent = `hand x ${handCounts[type] ?? 0}`;
      label.appendChild(chip);
      label.appendChild(meta);

      const controls = document.createElement("div");
      controls.className = "hand-archive-controls";
      const minus = document.createElement("button");
      minus.className = "ghost option-button hand-archive-minus";
      minus.textContent = "-";
      minus.addEventListener("click", () => adjustHandArchive(type, -1));
      const count = document.createElement("span");
      count.className = "hand-archive-count";
      count.textContent = "0";
      const plus = document.createElement("button");
      plus.className = "ghost option-button hand-archive-plus";
      plus.textContent = "+";
      plus.addEventListener("click", () => adjustHandArchive(type, 1));
      controls.appendChild(minus);
      controls.appendChild(count);
      controls.appendChild(plus);

      row.appendChild(label);
      row.appendChild(controls);
      elements.handArchiveOptions.appendChild(row);
    });
    updateHandArchiveUI();
    elements.handArchiveOverlay.hidden = false;
  }

  function adjustHandArchive(type, delta) {
    if (!pendingHandArchive) return;
    const selected = pendingHandArchive.selected[type] ?? 0;
    const available = pendingHandArchive.counts[type] ?? 0;
    const total = getHandArchiveTotal();
    if (delta > 0) {
      if (total >= pendingHandArchive.max) return;
      if (selected >= available) return;
      pendingHandArchive.selected[type] = selected + 1;
    } else if (delta < 0) {
      if (selected <= 0) return;
      const next = selected - 1;
      if (next <= 0) {
        delete pendingHandArchive.selected[type];
      } else {
        pendingHandArchive.selected[type] = next;
      }
    }
    updateHandArchiveUI();
  }

  function getHandArchiveTotal() {
    if (!pendingHandArchive) return 0;
    return Object.values(pendingHandArchive.selected).reduce((sum, value) => sum + value, 0);
  }

  function updateHandArchiveUI() {
    if (!pendingHandArchive) return;
    const total = getHandArchiveTotal();
    const min = pendingHandArchive.min;
    const max = pendingHandArchive.max;
    const range = min === max ? `${min}` : `${min}-${max}`;
    if (elements.handArchiveMessage) {
      elements.handArchiveMessage.textContent = `Select ${range} card(s) from your hand to archive. Selected: ${total}.`;
    }
    if (elements.handArchiveConfirm) {
      elements.handArchiveConfirm.disabled = !(total >= min && total <= max);
    }
    if (elements.handArchiveOptions) {
      Array.from(elements.handArchiveOptions.children).forEach((row) => {
        const type = row.dataset.type;
        const selected = pendingHandArchive.selected[type] ?? 0;
        const available = pendingHandArchive.counts[type] ?? 0;
        const count = row.querySelector(".hand-archive-count");
        const minus = row.querySelector(".hand-archive-minus");
        const plus = row.querySelector(".hand-archive-plus");
        if (count) count.textContent = `${selected}`;
        if (minus) minus.disabled = selected === 0;
        if (plus) plus.disabled = selected >= available || total >= max;
      });
    }
  }

  function confirmHandArchive() {
    if (!pendingTrade || !pendingHandArchive) return;
    const total = getHandArchiveTotal();
    if (total < pendingHandArchive.min || total > pendingHandArchive.max) return;
    pendingTrade.handArchive = { ...pendingHandArchive.selected };
    if (elements.handArchiveOverlay) elements.handArchiveOverlay.hidden = true;
    pendingHandArchive = null;
    finalizeTrade();
  }

  function cancelHandArchive() {
    resetPending();
    if (elements.handArchiveOverlay) elements.handArchiveOverlay.hidden = true;
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
    resetPending();
    if (elements.archiveTutorOverlay) elements.archiveTutorOverlay.hidden = true;
  }

  return {
    trade,
    confirmWoodSubstitution,
    cancelWoodSubstitution,
    confirmGemTutor,
    cancelGemTutor,
    confirmChoiceCost,
    cancelChoiceCost,
    confirmPoolCost,
    cancelPoolCost,
    confirmHandArchive,
    cancelHandArchive,
    confirmArchiveTutor,
    cancelArchiveTutor,
    resetPending,
    hideOverlays,
  };
}
