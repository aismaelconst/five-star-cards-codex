import {
  ActionTypes,
  canInitiateTrade,
  canTradeWithOptions,
  getChoiceCostOptions,
  getWoodSubstitutionOptions,
} from "../../game/rules.js";
import { countCards } from "../../shared/utils.js";
import { getPlayerRuleset } from "../../game/state.js";
import {
  formatPoolLabel,
  formatTradeToast,
  resolvePoolTypes,
} from "./trade-utils.js";

export function createTradeFlow(options) {
  const {
    state,
    elements,
    sendOrApply,
    getLocalPlayer,
    renderApp,
    showActionToast,
    runFeedback,
  } =
    options;
  let pendingTrade = null;
  let pendingWoodChoice = null;
  let pendingEfficiencyChoice = null;
  let pendingGemChoice = null;
  let pendingChoiceSelection = null;
  let pendingPoolSelection = null;
  let pendingArchiveTutorChoice = null;
  let pendingArchiveTutorMode = null;
  let pendingHandArchive = null;

  function getPlayerIndex(player) {
    const playerIndex = state.players.findIndex(
      (entry) => entry === player || entry?.id === player?.id
    );
    return playerIndex === -1 ? state.currentPlayer : playerIndex;
  }

  function getLocalRuleset() {
    return getPlayerRuleset(state, getPlayerIndex(getLocalPlayer()));
  }

  function getOpponentPlayer(player = getLocalPlayer()) {
    return (
      state.players.find((entry) => entry.id !== player.id) ??
      state.players[getPlayerIndex(player) === 0 ? 1 : 0]
    );
  }

  function getOpponentRuleset(player = getLocalPlayer()) {
    return getPlayerRuleset(state, getPlayerIndex(getOpponentPlayer(player)));
  }

  function getEfficiencyTypesForRecipe(recipe) {
    if (!recipe?.cost) return [];
    const candidates = new Set();
    if ((recipe.cost.bronze ?? 0) > 0) {
      candidates.add("ingot");
      candidates.add("ledger");
      candidates.add("alloy");
    }
    if ((recipe.cost.silver ?? 0) > 0) {
      candidates.add("sterling");
      candidates.add("ledger");
      candidates.add("alloy");
    }
    const localRuleset = getLocalRuleset();
    return Array.from(candidates).filter((type) => Boolean(localRuleset.cardTypes?.[type]));
  }

  function resetPending() {
    pendingTrade = null;
    pendingWoodChoice = null;
    pendingEfficiencyChoice = null;
    pendingGemChoice = null;
    pendingChoiceSelection = null;
    pendingPoolSelection = null;
    pendingArchiveTutorChoice = null;
    pendingArchiveTutorMode = null;
    pendingHandArchive = null;
  }

  function hideOverlays() {
    if (elements.woodOverlay) elements.woodOverlay.hidden = true;
    if (elements.efficiencyOverlay) elements.efficiencyOverlay.hidden = true;
    if (elements.gemTutorOverlay) elements.gemTutorOverlay.hidden = true;
    if (elements.choiceCostOverlay) elements.choiceCostOverlay.hidden = true;
    if (elements.poolCostOverlay) elements.poolCostOverlay.hidden = true;
    if (elements.archiveTutorOverlay) elements.archiveTutorOverlay.hidden = true;
    if (elements.handArchiveOverlay) elements.handArchiveOverlay.hidden = true;
  }

  function hideTradesModal() {
    if (elements.tradesOverlay) {
      elements.tradesOverlay.hidden = true;
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
      useEfficiency: false,
      rewardType: null,
      choiceType: null,
      poolTypes: null,
      handArchive: null,
      targetType: null,
    };
    hideTradesModal();
    const woodOptions = getWoodSubstitutionOptions(state, player, recipeId);
    const localRuleset = getLocalRuleset();
    const recipe = localRuleset.tradeRecipes?.[recipeId];
    const baseCost = recipe?.cost ?? {};
    const archiveCounts = countCards(player.archive);
    const canPayBase =
      recipe &&
      Object.entries(baseCost).every(
        ([type, amount]) => (archiveCounts[type] ?? 0) >= amount
      );
    const efficiencyTypes = getEfficiencyTypesForRecipe(recipe);
    if (recipe && shouldOfferEfficiencyChoice(efficiencyTypes, archiveCounts)) {
      openEfficiencyOverlay(canPayBase, efficiencyTypes);
      return null;
    }
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
      openGemTutorOverlay(recipe);
      return null;
    }
    if (recipe?.reward?.type === "archive_hand" && elements.handArchiveOverlay) {
      openHandArchiveOverlay();
      return null;
    }
    if (recipe?.reward?.type === "archive" && elements.archiveTutorOverlay) {
      openArchiveTutorOverlay("deck_archive");
      return null;
    }
    if (recipe?.reward?.type === "effect" && recipe.reward.id === "amethyst_archive_to_deck") {
      openArchiveTutorOverlay("opponent_archive");
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
      useEfficiency: pendingTrade.useEfficiency,
      rewardType: pendingTrade.rewardType,
      choiceType: pendingTrade.choiceType,
      poolTypes: pendingTrade.poolTypes,
      handArchive: pendingTrade.handArchive,
      targetType: pendingTrade.targetType,
    };
    const result = sendOrApply({ type: ActionTypes.TRADE, payload });
    resetPending();
    if (state.mode !== "online" && result?.event?.success) {
      const recipe = getLocalRuleset().tradeRecipes?.[payload.recipeId];
      const tradeEvent = {
        ...payload,
        ...(result.event.detail ?? {}),
      };
      showActionToast(formatTradeToast(payload.recipeId, recipe, tradeEvent));
    }
    if (state.mode !== "online") {
      renderApp();
      if (typeof runFeedback === "function") {
        runFeedback();
      }
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

  function shouldOfferEfficiencyChoice(efficiencyTypes, archiveCounts) {
    if (!Array.isArray(efficiencyTypes) || efficiencyTypes.length === 0) return false;
    return efficiencyTypes.some((type) => (archiveCounts[type] ?? 0) > 0);
  }

  function openEfficiencyOverlay(canPayBase, efficiencyTypes) {
    if (!elements.efficiencyOverlay || !elements.efficiencyOptions) return;
    pendingEfficiencyChoice = null;
    elements.efficiencyOptions.innerHTML = "";
    const player = getLocalPlayer();
    const regularAllowed = canTradeWithOptions(state, player, pendingTrade.recipeId, {
      useWood: pendingTrade.useWood,
      substituteType: pendingTrade.substituteType,
      useEfficiency: false,
    });
    const efficiencyAllowed = canTradeWithOptions(state, player, pendingTrade.recipeId, {
      useWood: pendingTrade.useWood,
      substituteType: pendingTrade.substituteType,
      useEfficiency: true,
    });
    const choices = [
      { id: "regular", label: "Use regular cards", enabled: regularAllowed || canPayBase },
      {
        id: "efficiency",
        label: `Use ${efficiencyTypes.join("/")}`,
        enabled: efficiencyAllowed,
      },
    ];
    choices.forEach((choice) => {
      const button = document.createElement("button");
      button.className = "ghost option-button";
      button.textContent = choice.label;
      button.dataset.choice = choice.id;
      button.disabled = !choice.enabled;
      if (choice.enabled) {
        button.addEventListener("click", () => selectEfficiencyChoice(choice.id));
      }
      elements.efficiencyOptions.appendChild(button);
    });
    if (elements.efficiencyConfirm) elements.efficiencyConfirm.disabled = true;
    if (elements.efficiencyMessage) {
      elements.efficiencyMessage.textContent =
        "Choose whether to use efficiency cards for this trade.";
    }
    elements.efficiencyOverlay.hidden = false;
  }

  function selectEfficiencyChoice(choice) {
    pendingEfficiencyChoice = choice;
    if (elements.efficiencyOptions) {
      Array.from(elements.efficiencyOptions.children).forEach((child) => {
        child.classList.toggle("active", child.dataset.choice === choice);
      });
    }
    if (elements.efficiencyConfirm) elements.efficiencyConfirm.disabled = false;
  }

  function confirmEfficiencyChoice() {
    if (!pendingTrade || !pendingEfficiencyChoice) return;
    pendingTrade.useEfficiency = pendingEfficiencyChoice === "efficiency";
    if (elements.efficiencyOverlay) elements.efficiencyOverlay.hidden = true;
    pendingEfficiencyChoice = null;
    const player = getLocalPlayer();
    const recipe = getLocalRuleset().tradeRecipes?.[pendingTrade.recipeId];
    const baseCost = recipe?.cost ?? {};
    const archiveCounts = countCards(player.archive);
    const canPayBase =
      recipe &&
      Object.entries(baseCost).every(
        ([type, amount]) => (archiveCounts[type] ?? 0) >= amount
      );
    const woodOptions = getWoodSubstitutionOptions(state, player, pendingTrade.recipeId);
    if (woodOptions.length > 0 && elements.woodOverlay) {
      openWoodOverlay(woodOptions, canPayBase);
      return;
    }
    if (recipe?.choiceCost) {
      openChoiceCostOverlay();
      return;
    }
    if (recipe?.poolCost) {
      openPoolCostOverlay();
      return;
    }
    if (recipe?.reward === "any" && elements.gemTutorOverlay) {
      openGemTutorOverlay(recipe);
      return;
    }
    if (recipe?.reward?.type === "archive_hand" && elements.handArchiveOverlay) {
      openHandArchiveOverlay();
      return;
    }
    if (recipe?.reward?.type === "archive" && elements.archiveTutorOverlay) {
      openArchiveTutorOverlay("deck_archive");
      return;
    }
    if (recipe?.reward?.type === "effect" && recipe.reward.id === "amethyst_archive_to_deck") {
      openArchiveTutorOverlay("opponent_archive");
      return;
    }
    finalizeTrade();
  }

  function cancelEfficiencyChoice() {
    resetPending();
    if (elements.efficiencyOverlay) elements.efficiencyOverlay.hidden = true;
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
    const recipe = getLocalRuleset().tradeRecipes?.[pendingTrade.recipeId];
    if (recipe?.choiceCost) {
      openChoiceCostOverlay();
      return;
    }
    if (recipe?.poolCost) {
      openPoolCostOverlay();
      return;
    }
    if (recipe?.reward === "any" && elements.gemTutorOverlay) {
      openGemTutorOverlay(recipe);
      return;
    }
    if (recipe?.reward?.type === "archive_hand" && elements.handArchiveOverlay) {
      openHandArchiveOverlay();
      return;
    }
    if (recipe?.reward?.type === "archive" && elements.archiveTutorOverlay) {
      openArchiveTutorOverlay("deck_archive");
      return;
    }
    if (recipe?.reward?.type === "effect" && recipe.reward.id === "amethyst_archive_to_deck") {
      openArchiveTutorOverlay("opponent_archive");
      return;
    }
    finalizeTrade();
  }

  function cancelWoodSubstitution() {
    resetPending();
    if (elements.woodOverlay) elements.woodOverlay.hidden = true;
  }

  function openGemTutorOverlay(recipe) {
    if (!elements.gemTutorOptions || !elements.gemTutorOverlay) return;
    const player = getLocalPlayer();
    const displayOrder = getLocalRuleset().displayOrder ?? ["bronze", "silver", "gold"];
    const allowed =
      Array.isArray(recipe?.rewardOptions) && recipe.rewardOptions.length > 0
        ? recipe.rewardOptions.filter((type) => displayOrder.includes(type))
        : displayOrder;
    const deckCounts = countCards(player.deck, displayOrder);
    pendingGemChoice = null;
    elements.gemTutorOptions.innerHTML = "";
    allowed.forEach((type) => {
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
    const recipe = getLocalRuleset().tradeRecipes?.[pendingTrade.recipeId];
    const archiveCounts = countCards(player.archive);
    const options = getChoiceCostOptions(state, player, pendingTrade.recipeId, {
      useWood: pendingTrade.useWood,
      substituteType: pendingTrade.substituteType,
      useEfficiency: pendingTrade.useEfficiency,
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
      let message = "Choose the additional cost card.";
      if (recipe?.choiceCost?.pool === "non_gem_non_wood") {
        message = "Choose the additional non-gem, non-wood cost card.";
      } else if (recipe?.choiceCost?.pool === "non_gold") {
        message = "Choose the additional non-gold cost card.";
      }
      elements.choiceCostMessage.textContent = message;
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
    const recipe = getLocalRuleset().tradeRecipes?.[pendingTrade.recipeId];
    if (recipe?.poolCost) {
      openPoolCostOverlay();
      return;
    }
    if (recipe?.reward === "any" && elements.gemTutorOverlay) {
      openGemTutorOverlay(recipe);
      return;
    }
    if (recipe?.reward?.type === "archive_hand" && elements.handArchiveOverlay) {
      openHandArchiveOverlay();
      return;
    }
    if (recipe?.reward?.type === "archive" && elements.archiveTutorOverlay) {
      openArchiveTutorOverlay("deck_archive");
      return;
    }
    if (recipe?.reward?.type === "effect" && recipe.reward.id === "amethyst_archive_to_deck") {
      openArchiveTutorOverlay("opponent_archive");
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
    const recipe = getLocalRuleset().tradeRecipes?.[pendingTrade.recipeId];
    if (!recipe?.poolCost) return;
    const player = getLocalPlayer();
    const displayOrder = getLocalRuleset().displayOrder ?? ["bronze", "silver", "gold"];
    const archiveCounts = countCards(player.archive, displayOrder);
    const options = resolvePoolTypes(recipe.poolCost.pool, displayOrder);
    const hasCopper = (archiveCounts.copper ?? 0) > 0;
    const baseMin = recipe.poolCost.min ?? 0;
    const baseMax = recipe.poolCost.max ?? baseMin;
    const allowCopper =
      hasCopper && baseMin === 2 && baseMax === 2 && recipe.poolCost.distinct;
    pendingPoolSelection = {
      selected: [],
      min: allowCopper ? 1 : baseMin,
      max: baseMax,
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
      const copperNote = allowCopper ? " (Copper can fill one slot)" : "";
      elements.poolCostMessage.textContent = `Select ${range} ${distinct}${label}.${copperNote}`;
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
    const recipe = getLocalRuleset().tradeRecipes?.[pendingTrade.recipeId];
    if (recipe?.reward === "any" && elements.gemTutorOverlay) {
      openGemTutorOverlay(recipe);
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
    const recipe = getLocalRuleset().tradeRecipes?.[pendingTrade.recipeId];
    if (!recipe?.reward || recipe.reward.type !== "archive_hand") return;
    const player = getLocalPlayer();
    const displayOrder = getLocalRuleset().displayOrder ?? ["bronze", "silver", "gold"];
    const handCounts = countCards(player.hand, displayOrder);
    const allowed = (recipe.reward.allowed ?? []).filter(
      (type) => (handCounts[type] ?? 0) > 0
    );
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

  function openArchiveTutorOverlay(mode = "deck_archive") {
    if (!elements.archiveTutorOptions || !elements.archiveTutorOverlay) return;
    const player = getLocalPlayer();
    const opponent = getOpponentPlayer(player);
    const localDisplayOrder = getLocalRuleset().displayOrder ?? ["bronze", "silver", "gold"];
    const opponentDisplayOrder =
      getOpponentRuleset(player).displayOrder ?? ["bronze", "silver", "gold"];
    const displayOrder = mode === "opponent_archive" ? opponentDisplayOrder : localDisplayOrder;
    const sourceCounts =
      mode === "opponent_archive"
        ? countCards(opponent?.archive ?? [], displayOrder)
        : countCards(player.deck, displayOrder);
    pendingArchiveTutorChoice = null;
    pendingArchiveTutorMode = mode;
    elements.archiveTutorOptions.innerHTML = "";
    displayOrder.forEach((type) => {
      if (mode !== "opponent_archive" && type === "gold") return;
      const button = document.createElement("button");
      button.className = "ghost option-button";
      button.textContent = `${type} (${sourceCounts[type] ?? 0})`;
      button.dataset.choice = type;
      if ((sourceCounts[type] ?? 0) === 0) {
        button.disabled = true;
      } else {
        button.addEventListener("click", () => selectArchiveTutorChoice(type));
      }
      elements.archiveTutorOptions.appendChild(button);
    });
    if (elements.archiveTutorMessage) {
      elements.archiveTutorMessage.textContent =
        mode === "opponent_archive"
          ? "Select an opponent archive card type to shuffle into their deck."
          : "Select a non-gold card from your deck to archive.";
    }
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
    if (pendingArchiveTutorMode === "opponent_archive") {
      pendingTrade.targetType = pendingArchiveTutorChoice;
    } else {
      pendingTrade.rewardType = pendingArchiveTutorChoice;
    }
    if (elements.archiveTutorOverlay) elements.archiveTutorOverlay.hidden = true;
    pendingArchiveTutorChoice = null;
    pendingArchiveTutorMode = null;
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
    confirmEfficiencyChoice,
    cancelEfficiencyChoice,
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
