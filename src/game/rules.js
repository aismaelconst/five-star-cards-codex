import { countCards, getCardType, shuffle } from "../shared/utils.js";

export const ActionTypes = {
  TRADE: "TRADE",
  PLAY_CARD: "PLAY_CARD",
  PLAY_CARD_BY_TYPE: "PLAY_CARD_BY_TYPE",
  RETURN_CARD: "RETURN_CARD",
  RETURN_ALL: "RETURN_ALL",
  END_TURN: "END_TURN",
  CONFIRM_ARCHIVE: "CONFIRM_ARCHIVE",
  CANCEL_ARCHIVE: "CANCEL_ARCHIVE",
  START_TURN: "START_TURN",
};

function getTradeRecipe(state, recipeId) {
  return state.ruleset.tradeRecipes?.[recipeId] ?? null;
}

function sumCost(cost = {}) {
  return Object.values(cost).reduce((sum, value) => sum + value, 0);
}

function canPayCost(counts, cost = {}) {
  return Object.entries(cost).every(
    ([type, amount]) => (counts[type] ?? 0) >= amount
  );
}

function applyEfficiencySubstitution(counts, cost = {}) {
  const requiredBronze = cost.bronze ?? 0;
  const requiredSilver = cost.silver ?? 0;
  if (requiredBronze === 0 && requiredSilver === 0) return null;
  const maxIngot = counts.ingot ?? 0;
  const maxSterling = counts.sterling ?? 0;
  const maxLedger = counts.ledger ?? 0;
  const maxAlloy = counts.alloy ?? 0;
  let best = null;
  for (let ingot = 0; ingot <= maxIngot; ingot += 1) {
    for (let sterling = 0; sterling <= maxSterling; sterling += 1) {
      for (let ledgerBronze = 0; ledgerBronze <= maxLedger; ledgerBronze += 1) {
        for (
          let ledgerSilver = 0;
          ledgerSilver <= maxLedger - ledgerBronze;
          ledgerSilver += 1
        ) {
          for (let alloyBronze = 0; alloyBronze <= maxAlloy; alloyBronze += 1) {
            for (
              let alloySilver = 0;
              alloySilver <= maxAlloy - alloyBronze;
              alloySilver += 1
            ) {
              const bronzeCovered = ingot * 3 + ledgerBronze + alloyBronze;
              const silverCovered = sterling * 2 + ledgerSilver + alloySilver;
              const remainingBronze = Math.max(0, requiredBronze - bronzeCovered);
              const remainingSilver = Math.max(0, requiredSilver - silverCovered);
              if (remainingBronze > (counts.bronze ?? 0)) continue;
              if (remainingSilver > (counts.silver ?? 0)) continue;
              const ledgerUsed = ledgerBronze + ledgerSilver;
              const alloyUsed = alloyBronze + alloySilver;
              const usedSpecial = ingot + sterling + ledgerUsed + alloyUsed;
              const overpay =
                Math.max(0, bronzeCovered - requiredBronze) +
                Math.max(0, silverCovered - requiredSilver);
              const flexibleUsed = ledgerUsed + alloyUsed;
              const candidate = {
                ingot,
                sterling,
                ledgerUsed,
                alloyUsed,
                remainingBronze,
                remainingSilver,
                usedSpecial,
                overpay,
                flexibleUsed,
              };
              if (!best) {
                best = candidate;
                continue;
              }
              if (candidate.usedSpecial < best.usedSpecial) {
                best = candidate;
                continue;
              }
              if (candidate.usedSpecial === best.usedSpecial) {
                if (candidate.overpay < best.overpay) {
                  best = candidate;
                  continue;
                }
                if (candidate.overpay === best.overpay) {
                  if (candidate.flexibleUsed < best.flexibleUsed) {
                    best = candidate;
                    continue;
                  }
                  if (
                    candidate.flexibleUsed === best.flexibleUsed &&
                    candidate.ledgerUsed < best.ledgerUsed
                  ) {
                    best = candidate;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  if (!best || best.usedSpecial === 0) return null;
  const adjusted = { ...cost };
  if (requiredBronze > 0) {
    adjusted.bronze = best.remainingBronze;
    if (adjusted.bronze <= 0) delete adjusted.bronze;
  }
  if (requiredSilver > 0) {
    adjusted.silver = best.remainingSilver;
    if (adjusted.silver <= 0) delete adjusted.silver;
  }
  if (best.ingot > 0) {
    adjusted.ingot = (adjusted.ingot ?? 0) + best.ingot;
  }
  if (best.sterling > 0) {
    adjusted.sterling = (adjusted.sterling ?? 0) + best.sterling;
  }
  if (best.ledgerUsed > 0) {
    adjusted.ledger = (adjusted.ledger ?? 0) + best.ledgerUsed;
  }
  if (best.alloyUsed > 0) {
    adjusted.alloy = (adjusted.alloy ?? 0) + best.alloyUsed;
  }
  return adjusted;
}

function canPayCostWithEfficiency(counts, cost = {}) {
  if (canPayCost(counts, cost)) return true;
  const adjusted = applyEfficiencySubstitution(counts, cost);
  return adjusted ? canPayCost(counts, adjusted) : false;
}

function buildCostWithWood(cost, substituteType) {
  const adjusted = { ...cost };
  adjusted[substituteType] = Math.max(0, (adjusted[substituteType] ?? 0) - 1);
  adjusted.wood = (adjusted.wood ?? 0) + 1;
  return adjusted;
}

const GEM_TYPES = new Set(["ruby", "emerald", "sapphire"]);
const ANCIENT_TYPES = ["turquoise", "lapis_lazuli", "carnelian"];
const MYSTIC_EFFECT_IDS = new Set([
  "pearl_extra_play",
  "obsidian_next_turn_penalty",
  "amethyst_archive_to_deck",
  "ash_random_hand_to_deck",
  "ember_next_turn_trade_block",
]);

function ensureTurnEffects(state) {
  const playerCount = state.players?.length ?? 2;
  if (!state.turnEffects) {
    state.turnEffects = {
      currentPlayBonusByPlayer: Array.from({ length: playerCount }, () => 0),
      currentPlayPenaltyByPlayer: Array.from({ length: playerCount }, () => 0),
      nextTurnPlayPenaltyByPlayer: Array.from({ length: playerCount }, () => 0),
      currentTradeBlockedByPlayer: Array.from({ length: playerCount }, () => false),
      nextTurnTradeBlockedByPlayer: Array.from({ length: playerCount }, () => false),
      usedTradeRecipesByPlayer: Array.from({ length: playerCount }, () => ({})),
    };
    return state.turnEffects;
  }
  const turnEffects = state.turnEffects;
  const ensureArray = (key, makeDefault) => {
    if (!Array.isArray(turnEffects[key])) {
      turnEffects[key] = Array.from({ length: playerCount }, makeDefault);
      return;
    }
    for (let i = turnEffects[key].length; i < playerCount; i += 1) {
      turnEffects[key].push(makeDefault(i));
    }
  };
  ensureArray("currentPlayBonusByPlayer", () => 0);
  ensureArray("currentPlayPenaltyByPlayer", () => 0);
  ensureArray("nextTurnPlayPenaltyByPlayer", () => 0);
  ensureArray("currentTradeBlockedByPlayer", () => false);
  ensureArray("nextTurnTradeBlockedByPlayer", () => false);
  ensureArray("usedTradeRecipesByPlayer", () => ({}));
  return turnEffects;
}

function getPlayerIndex(state, player) {
  return state.players.findIndex((entry) => entry === player);
}

function getOpponentIndex(playerIndex, playerCount) {
  if (playerCount <= 1) return -1;
  return playerIndex === 0 ? 1 : 0;
}

function getOpponentPlayer(state, player) {
  const playerIndex = getPlayerIndex(state, player);
  if (playerIndex === -1) return null;
  const opponentIndex = getOpponentIndex(playerIndex, state.players.length);
  if (opponentIndex === -1) return null;
  return state.players[opponentIndex];
}

function resolvePoolTypes(ruleset, pool) {
  const displayOrder = ruleset.displayOrder ?? Object.keys(ruleset.cardTypes ?? {});
  if (Array.isArray(pool)) {
    return pool.filter((type) => displayOrder.includes(type));
  }
  if (pool === "ancient") {
    return ANCIENT_TYPES.filter((type) => displayOrder.includes(type));
  }
  if (pool === "non_gold_non_electrum") {
    return displayOrder.filter((type) => type !== "gold" && type !== "electrum");
  }
  return [];
}

function getChoicePoolTypes(ruleset, pool, exclude = []) {
  const displayOrder = ruleset.displayOrder ?? Object.keys(ruleset.cardTypes ?? {});
  let types = displayOrder;
  if (pool === "non_gem_non_wood") {
    types = displayOrder.filter((type) => type !== "wood" && !GEM_TYPES.has(type));
  }
  if (pool === "non_gold") {
    types = displayOrder.filter((type) => type !== "gold");
  }
  if (exclude.length > 0) {
    types = types.filter((type) => !exclude.includes(type));
  }
  return types;
}

function getChoiceCostOptionsForCost(ruleset, recipe, counts, baseCost, useEfficiency) {
  if (!recipe.choiceCost) return [];
  const pool = getChoicePoolTypes(ruleset, recipe.choiceCost.pool, recipe.choiceCost.exclude);
  return pool.filter((type) => {
    const combined = { ...baseCost };
    combined[type] = (combined[type] ?? 0) + recipe.choiceCost.count;
    return useEfficiency
      ? canPayCostWithEfficiency(counts, combined)
      : canPayCost(counts, combined);
  });
}

function buildPoolCostCounts(poolTypes) {
  return poolTypes.reduce((acc, type) => {
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
}

function getPoolCostCounts(state, recipe, options) {
  if (!recipe.poolCost) return { valid: true, counts: {}, poolTypes: [] };
  const poolTypes = Array.isArray(options.poolTypes) ? options.poolTypes : null;
  if (!poolTypes) return { valid: false, counts: {}, poolTypes: [] };
  const min = recipe.poolCost.min ?? poolTypes.length;
  const max = recipe.poolCost.max ?? poolTypes.length;
  if (poolTypes.length < min || poolTypes.length > max) {
    return { valid: false, counts: {}, poolTypes: [] };
  }
  if (recipe.poolCost.distinct) {
    const unique = new Set(poolTypes);
    if (unique.size !== poolTypes.length) {
      return { valid: false, counts: {}, poolTypes: [] };
    }
  }
  const allowed = resolvePoolTypes(state.ruleset, recipe.poolCost.pool);
  if (poolTypes.some((type) => !allowed.includes(type))) {
    return { valid: false, counts: {}, poolTypes: [] };
  }
  return { valid: true, counts: buildPoolCostCounts(poolTypes), poolTypes };
}

function canUseCopperForPool(state, recipe, options, counts) {
  if (!recipe?.poolCost) return false;
  const poolTypes = Array.isArray(options.poolTypes) ? options.poolTypes : null;
  if (!poolTypes || poolTypes.length !== 1) return false;
  const min = recipe.poolCost.min ?? 0;
  const max = recipe.poolCost.max ?? min;
  if (!recipe.poolCost.distinct || min !== 2 || max !== 2) return false;
  if ((counts.copper ?? 0) < 1) return false;
  if ((counts[poolTypes[0]] ?? 0) < 1) return false;
  const allowed = resolvePoolTypes(state.ruleset, recipe.poolCost.pool);
  if (poolTypes.some((type) => !allowed.includes(type))) return false;
  return true;
}

function applyCopperSubstitution(recipeId, counts, cost) {
  if ((counts.copper ?? 0) < 1) return null;
  if (cost.copper) return null;
  if (sumCost(cost) !== 2) return null;
  let missingType = null;
  let deficitTotal = 0;
  Object.entries(cost).forEach(([type, amount]) => {
    const have = counts[type] ?? 0;
    if (amount > have) {
      deficitTotal += amount - have;
      if (!missingType) missingType = type;
    }
  });
  if (deficitTotal !== 1 || !missingType) return null;
  if (recipeId === "trade_electrum_draw" && missingType === "electrum") return null;
  const adjusted = { ...cost };
  adjusted[missingType] = (adjusted[missingType] ?? 0) - 1;
  if (adjusted[missingType] <= 0) {
    delete adjusted[missingType];
  }
  adjusted.copper = 1;
  if (!canPayCost(counts, adjusted)) return null;
  return adjusted;
}

function canSatisfyPoolCost(counts, poolCost, ruleset) {
  if (!poolCost) return true;
  const allowed = resolvePoolTypes(ruleset, poolCost.pool);
  if (allowed.length === 0) return false;
  const min = poolCost.min ?? poolCost.max ?? 0;
  const max = poolCost.max ?? min;
  if (poolCost.distinct) {
    const available = allowed.filter((type) => (counts[type] ?? 0) > 0).length;
    if (available >= min) return true;
    if (min === 2 && max === 2 && (counts.copper ?? 0) > 0 && available >= 1) {
      return true;
    }
    return false;
  }
  const total = allowed.reduce((sum, type) => sum + (counts[type] ?? 0), 0);
  return total >= min;
}

export function getChoiceCostOptions(state, player, recipeId, options = {}) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe?.choiceCost) return [];
  const counts = countCards(player.archive);
  let baseCost = recipe.cost ?? {};
  if (options.useWood) {
    const rules = state.ruleset.woodSubstitution;
    if (!rules?.allow) return [];
    if (sumCost(baseCost) < rules.minCost) return [];
    if ((counts.wood ?? 0) < 1) return [];
    if (!options.substituteType || !baseCost[options.substituteType]) return [];
    if (recipeId === "trade_platinum" && options.substituteType === "platinum") return [];
    baseCost = buildCostWithWood(baseCost, options.substituteType);
  }
  return getChoiceCostOptionsForCost(
    state.ruleset,
    recipe,
    counts,
    baseCost,
    options.useEfficiency
  );
}

function getTradeCost(state, player, recipeId, options = {}) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe) return null;
  const counts = countCards(player.archive);
  const baseCost = recipe.cost ?? {};
  let cost = baseCost;
  if (options.useWood) {
    const rules = state.ruleset.woodSubstitution;
    if (!rules?.allow) return null;
    if (sumCost(baseCost) < rules.minCost) return null;
    if ((counts.wood ?? 0) < 1) return null;
    if (!options.substituteType || !baseCost[options.substituteType]) return null;
    if (recipeId === "trade_platinum" && options.substituteType === "platinum") return null;
    if (recipeId === "trade_electrum_draw" && options.substituteType === "electrum") {
      return null;
    }
    cost = buildCostWithWood(baseCost, options.substituteType);
  }
  if (recipe.choiceCost) {
    if (!options.choiceType) return null;
    const choiceOptions = getChoiceCostOptions(state, player, recipeId, options);
    if (!choiceOptions.includes(options.choiceType)) return null;
    cost = {
      ...cost,
      [options.choiceType]: (cost[options.choiceType] ?? 0) + recipe.choiceCost.count,
    };
  }
  let poolCost = getPoolCostCounts(state, recipe, options);
  let usedCopperForPool = false;
  if (!poolCost.valid && canUseCopperForPool(state, recipe, options, counts)) {
    poolCost = {
      valid: true,
      counts: buildPoolCostCounts(options.poolTypes ?? []),
      poolTypes: options.poolTypes ?? [],
    };
    usedCopperForPool = true;
  }
  if (!poolCost.valid) return null;
  Object.entries(poolCost.counts).forEach(([type, amount]) => {
    cost = {
      ...cost,
      [type]: (cost[type] ?? 0) + amount,
    };
  });
  if (usedCopperForPool) {
    cost.copper = (cost.copper ?? 0) + 1;
  }
  if (!canPayCost(counts, cost) && options.useEfficiency) {
    const efficiencyAdjusted = applyEfficiencySubstitution(counts, cost);
    if (efficiencyAdjusted) {
      cost = efficiencyAdjusted;
    }
  }
  if (!canPayCost(counts, cost)) {
    const substituted = applyCopperSubstitution(recipeId, counts, cost);
    if (!substituted) return null;
    cost = substituted;
  }
  return cost;
}

function hasEffectTargets(state, player, effectId, options = {}) {
  if (!MYSTIC_EFFECT_IDS.has(effectId)) return true;
  const opponent = getOpponentPlayer(state, player);
  if (!opponent) return false;
  if (effectId === "amethyst_archive_to_deck") {
    if (!Array.isArray(opponent.archive) || opponent.archive.length === 0) return false;
    if (options.requireTargetType) {
      if (!options.targetType) return false;
      return opponent.archive.some((card) => getCardType(card) === options.targetType);
    }
    return true;
  }
  if (effectId === "ash_random_hand_to_deck") {
    return Array.isArray(opponent.hand) && opponent.hand.length > 0;
  }
  if (effectId === "ember_random_discard_to_deck") {
    return Array.isArray(opponent.discard) && opponent.discard.length > 0;
  }
  return true;
}

export function getWoodSubstitutionOptions(state, player, recipeId) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe) return [];
  const rules = state.ruleset.woodSubstitution;
  if (!rules?.allow) return [];
  const baseCost = recipe.cost ?? {};
  if (sumCost(baseCost) < rules.minCost) return [];
  const counts = countCards(player.archive);
  if ((counts.wood ?? 0) < 1) return [];
  const options = [];
  Object.entries(baseCost).forEach(([type]) => {
    if (recipeId === "trade_platinum" && type === "platinum") return;
    if (recipeId === "trade_electrum_draw" && type === "electrum") return;
    const adjusted = buildCostWithWood(baseCost, type);
    if (canPayCost(counts, adjusted)) {
      options.push(type);
    }
  });
  return options;
}

export function canInitiateTrade(state, player, recipeId) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe) return false;
  if (state.phase !== "main") return false;
  if (state.tradesThisTurn >= state.ruleset.maxTrades) return false;
  const playerIndex = getPlayerIndex(state, player);
  if (playerIndex === -1) return false;
  {
    const turnEffects = ensureTurnEffects(state);
    if (turnEffects.currentTradeBlockedByPlayer?.[playerIndex]) {
      return false;
    }
  }
  if (recipe.oncePerTurn) {
    const turnEffects = ensureTurnEffects(state);
    if (turnEffects.usedTradeRecipesByPlayer?.[playerIndex]?.[recipeId]) {
      return false;
    }
  }
  const counts = countCards(player.archive);
  const baseCost = recipe.cost ?? {};
  const canPayWithCost = (cost, useEfficiency) => {
    let effectiveCost = cost;
    if (!canPayCost(counts, cost)) {
      if (!useEfficiency) return false;
      const adjusted = applyEfficiencySubstitution(counts, cost);
      if (!adjusted || !canPayCost(counts, adjusted)) return false;
      effectiveCost = adjusted;
    }
    const remaining = { ...counts };
    Object.entries(effectiveCost).forEach(([type, amount]) => {
      remaining[type] = (remaining[type] ?? 0) - amount;
    });
    if (recipe.choiceCost) {
      if (
        getChoiceCostOptionsForCost(state.ruleset, recipe, counts, cost, useEfficiency)
          .length === 0
      ) {
        return false;
      }
    }
    if (recipe.poolCost && !canSatisfyPoolCost(remaining, recipe.poolCost, state.ruleset)) {
      return false;
    }
    return true;
  };
  let canPay = canPayWithCost(baseCost, false);
  if (!canPay) {
    const woodOptions = getWoodSubstitutionOptions(state, player, recipeId);
    for (const substituteType of woodOptions) {
      const adjusted = buildCostWithWood(baseCost, substituteType);
      if (canPayWithCost(adjusted, false)) {
        canPay = true;
        break;
      }
    }
  }
  if (!canPay) {
    if (canPayWithCost(baseCost, true)) {
      canPay = true;
    } else {
      const woodOptions = getWoodSubstitutionOptions(state, player, recipeId);
      for (const substituteType of woodOptions) {
        const adjusted = buildCostWithWood(baseCost, substituteType);
        if (canPayWithCost(adjusted, true)) {
          canPay = true;
          break;
        }
      }
    }
  }
  if (!canPay) return false;
  if (recipe.reward?.type === "effect") {
    return hasEffectTargets(state, player, recipe.reward.id);
  }
  if (recipe.reward === "any") {
    if (Array.isArray(recipe.rewardOptions) && recipe.rewardOptions.length > 0) {
      const deckCounts = countCards(player.deck);
      return recipe.rewardOptions.some((type) => (deckCounts[type] ?? 0) > 0);
    }
    return player.deck.length > 0;
  }
  if (recipe.reward === "dig_non_bronze_silver" || recipe.reward === "dig_non_bronze") {
    return true;
  }
  const deckCounts = countCards(player.deck);
  if (typeof recipe.reward === "string") {
    return (deckCounts[recipe.reward] ?? 0) > 0;
  }
  if (recipe.reward?.type === "cards") {
    return (deckCounts[recipe.reward.card] ?? 0) >= recipe.reward.count;
  }
  if (recipe.reward?.type === "draw") {
    return true;
  }
  if (recipe.reward?.type === "archive_hand") {
    const allowed = recipe.reward.allowed ?? [];
    if (allowed.length === 0) return false;
    const handCounts = countCards(player.hand);
    const eligible = allowed.reduce((sum, type) => sum + (handCounts[type] ?? 0), 0);
    const min = recipe.reward.min ?? 1;
    return eligible >= min;
  }
  if (recipe.reward?.type === "archive") {
    return Object.entries(deckCounts).some(
      ([type, count]) => count > 0 && type !== "gold"
    );
  }
  if (recipe.reward?.type === "archive_cards") {
    const cards = recipe.reward.cards ?? [];
    return cards.some((type) => (deckCounts[type] ?? 0));
  }
  return false;
}

export function getCurrentPlayer(state) {
  return state.players[state.currentPlayer];
}

export function drawCards(player, count) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (player.deck.length === 0) break;
    drawn.push(player.deck.pop());
  }
  player.hand.push(...drawn);
  return drawn;
}

export function canTrade(state, player, recipeId) {
  return canTradeWithOptions(state, player, recipeId, {});
}

export function getPlayerPlayLimit(state, playerIndex) {
  const base = state.ruleset.maxPlays ?? 5;
  const turnEffects = state.turnEffects;
  const bonus = turnEffects?.currentPlayBonusByPlayer?.[playerIndex] ?? 0;
  const penalty = turnEffects?.currentPlayPenaltyByPlayer?.[playerIndex] ?? 0;
  return Math.max(1, base + bonus - penalty);
}

export function canTradeWithOptions(state, player, recipeId, options = {}) {
  const recipe = getTradeRecipe(state, recipeId);
  if (!recipe) return false;
  if (state.phase !== "main") return false;
  if (state.tradesThisTurn >= state.ruleset.maxTrades) return false;
  const playerIndex = getPlayerIndex(state, player);
  if (playerIndex === -1) return false;
  {
    const turnEffects = ensureTurnEffects(state);
    if (turnEffects.currentTradeBlockedByPlayer?.[playerIndex]) {
      return false;
    }
  }
  if (recipe.oncePerTurn) {
    const turnEffects = ensureTurnEffects(state);
    if (turnEffects.usedTradeRecipesByPlayer?.[playerIndex]?.[recipeId]) {
      return false;
    }
  }
  const cost = getTradeCost(state, player, recipeId, options);
  if (!cost) return false;
  if (recipe.reward === "any") {
    if (!options.rewardType) return false;
    if (
      Array.isArray(recipe.rewardOptions) &&
      recipe.rewardOptions.length > 0 &&
      !recipe.rewardOptions.includes(options.rewardType)
    ) {
      return false;
    }
    const deckCounts = countCards(player.deck);
    return (deckCounts[options.rewardType] ?? 0) > 0;
  }
  if (recipe.reward === "dig_non_bronze_silver" || recipe.reward === "dig_non_bronze") {
    return true;
  }
  const deckCounts = countCards(player.deck);
  if (typeof recipe.reward === "string") {
    return (deckCounts[recipe.reward] ?? 0) > 0;
  }
  if (recipe.reward?.type === "cards") {
    return (deckCounts[recipe.reward.card] ?? 0) >= recipe.reward.count;
  }
  if (recipe.reward?.type === "draw") {
    return true;
  }
  if (recipe.reward?.type === "archive_hand") {
    if (!options.handArchive || typeof options.handArchive !== "object") return false;
    const min = recipe.reward.min ?? 0;
    const max = recipe.reward.max ?? min;
    const allowed = recipe.reward.allowed ?? [];
    const handCounts = countCards(player.hand);
    let total = 0;
    for (const [type, amount] of Object.entries(options.handArchive)) {
      if (!allowed.includes(type)) return false;
      if (typeof amount !== "number" || amount <= 0) return false;
      if ((handCounts[type] ?? 0) < amount) return false;
      total += amount;
    }
    if (total < min || total > max) return false;
    return true;
  }
  if (recipe.reward?.type === "archive") {
    if (!options.rewardType || options.rewardType === "gold") return false;
    return (deckCounts[options.rewardType] ?? 0) > 0;
  }
  if (recipe.reward?.type === "archive_cards") {
    const cards = recipe.reward.cards ?? [];
    return cards.some((type) => (deckCounts[type] ?? 0) > 0);
  }
  if (recipe.reward?.type === "effect") {
    if (!recipe.reward.id) return false;
    return hasEffectTargets(state, player, recipe.reward.id, {
      requireTargetType: recipe.reward.id === "amethyst_archive_to_deck",
      targetType: options.targetType,
    });
  }
  return false;
}

function removeCardsFromArchive(player, type, count) {
  let removed = 0;
  player.archive = player.archive.filter((card) => {
    if (getCardType(card) === type && removed < count) {
      removed += 1;
      player.discard.push(card);
      return false;
    }
    return true;
  });
}

function removeCardsFromHand(player, type, count) {
  let removed = 0;
  player.hand = player.hand.filter((card) => {
    if (getCardType(card) === type && removed < count) {
      removed += 1;
      player.archive.push(card);
      return false;
    }
    return true;
  });
}

function removeRandomCards(cards, count) {
  const moved = [];
  const copy = [...cards];
  const total = Math.min(count, copy.length);
  for (let i = 0; i < total; i += 1) {
    const index = Math.floor(Math.random() * copy.length);
    const [card] = copy.splice(index, 1);
    moved.push(card);
  }
  return { remaining: copy, moved };
}

export function performTrade(state, player, recipeId, options = {}) {
  if (!canTradeWithOptions(state, player, recipeId, options)) {
    return { success: false };
  }
  const recipe = getTradeRecipe(state, recipeId);
  const cost = getTradeCost(state, player, recipeId, options);
  if (!cost) {
    return { success: false };
  }
  Object.entries(cost).forEach(([type, amount]) => {
    if (amount > 0) {
      removeCardsFromArchive(player, type, amount);
    }
  });

  const tutorCards = (type, count) => {
    let moved = 0;
    for (let i = 0; i < count; i += 1) {
      const rewardIndex = player.deck.findIndex(
        (card) => getCardType(card) === type
      );
      if (rewardIndex === -1) break;
      const [reward] = player.deck.splice(rewardIndex, 1);
      player.hand.push(reward);
      moved += 1;
    }
    if (moved > 0) {
      player.deck = shuffle(player.deck);
    }
    return moved;
  };

  const playerIndex = getPlayerIndex(state, player);
  if (playerIndex === -1) {
    return { success: false };
  }
  const opponentIndex = getOpponentIndex(playerIndex, state.players.length);
  const opponent = opponentIndex === -1 ? null : state.players[opponentIndex];
  const turnEffects = ensureTurnEffects(state);
  let detail = {};
  if (recipe.reward === "any") {
    if (
      Array.isArray(recipe.rewardOptions) &&
      recipe.rewardOptions.length > 0 &&
      !recipe.rewardOptions.includes(options.rewardType)
    ) {
      return { success: false };
    }
    const rewardIndex = player.deck.findIndex(
      (card) => getCardType(card) === options.rewardType
    );
    if (rewardIndex !== -1) {
      const [reward] = player.deck.splice(rewardIndex, 1);
      player.hand.push(reward);
      player.deck = shuffle(player.deck);
      detail.rewardType = options.rewardType;
    }
  } else if (recipe.reward === "dig_non_bronze_silver" || recipe.reward === "dig_non_bronze") {
    let reward = null;
    let discarded = 0;
    const blockedTypes =
      recipe.reward === "dig_non_bronze_silver"
        ? new Set(["bronze", "silver"])
        : new Set(["bronze"]);
    while (player.deck.length > 0) {
      const card = player.deck.pop();
      if (blockedTypes.has(getCardType(card))) {
        player.discard.push(card);
        discarded += 1;
      } else {
        reward = card;
        break;
      }
    }
    if (reward) {
      player.hand.push(reward);
      detail.rewardType = getCardType(reward);
    }
    detail.digDiscardedCount = discarded;
  } else if (typeof recipe.reward === "string") {
    const rewardIndex = player.deck.findIndex(
      (card) => getCardType(card) === recipe.reward
    );
    if (rewardIndex !== -1) {
      const [reward] = player.deck.splice(rewardIndex, 1);
      player.hand.push(reward);
      player.deck = shuffle(player.deck);
      detail.rewardType = recipe.reward;
    }
  } else if (recipe.reward?.type === "cards") {
    const moved = tutorCards(recipe.reward.card, recipe.reward.count);
    if (moved > 0) {
      detail.rewardType = recipe.reward.card;
      detail.rewardCount = moved;
    }
  } else if (recipe.reward?.type === "draw") {
    const drawCount =
      typeof recipe.reward.count === "number"
        ? recipe.reward.count
        : Array.isArray(options.poolTypes)
          ? options.poolTypes.length
          : 0;
    const drawn = drawCards(player, drawCount);
    detail.drawCount = drawn.length;
  } else if (recipe.reward?.type === "archive") {
    if (options.rewardType && options.rewardType !== "gold") {
      const rewardIndex = player.deck.findIndex(
        (card) => getCardType(card) === options.rewardType
      );
      if (rewardIndex !== -1) {
        const [reward] = player.deck.splice(rewardIndex, 1);
        player.archive.push(reward);
        player.deck = shuffle(player.deck);
        detail.rewardType = options.rewardType;
      }
    }
  } else if (recipe.reward?.type === "archive_cards") {
    const rewardCards = [];
    const cards = recipe.reward.cards ?? [];
    cards.forEach((type) => {
      const rewardIndex = player.deck.findIndex(
        (card) => getCardType(card) === type
      );
      if (rewardIndex !== -1) {
        const [reward] = player.deck.splice(rewardIndex, 1);
        player.archive.push(reward);
        rewardCards.push(type);
      }
    });
    if (rewardCards.length > 0) {
      player.deck = shuffle(player.deck);
      detail.rewardCards = rewardCards;
    }
  } else if (recipe.reward?.type === "archive_hand") {
    const handArchive = options.handArchive ?? {};
    Object.entries(handArchive).forEach(([type, amount]) => {
      if (amount > 0) {
        removeCardsFromHand(player, type, amount);
      }
    });
    detail.handArchive = { ...handArchive };
  } else if (recipe.reward?.type === "effect") {
    detail.effectId = recipe.reward.id;
    if (recipe.reward.id === "pearl_extra_play") {
      turnEffects.currentPlayBonusByPlayer[playerIndex] = 1;
      detail.playLimit = getPlayerPlayLimit(state, playerIndex);
    } else if (recipe.reward.id === "obsidian_next_turn_penalty") {
      if (opponentIndex !== -1) {
        turnEffects.nextTurnPlayPenaltyByPlayer[opponentIndex] = 1;
      }
    } else if (recipe.reward.id === "amethyst_archive_to_deck") {
      const targetType = options.targetType;
      if (targetType && opponent) {
        const targetIndex = opponent.archive.findIndex(
          (card) => getCardType(card) === targetType
        );
        if (targetIndex !== -1) {
          const [movedCard] = opponent.archive.splice(targetIndex, 1);
          opponent.deck.push(movedCard);
          opponent.deck = shuffle(opponent.deck);
          detail.targetType = targetType;
          detail.movedTypes = [targetType];
          detail.movedCount = 1;
        }
      }
    } else if (recipe.reward.id === "ash_random_hand_to_deck") {
      if (opponent && opponent.hand.length > 0) {
        const { remaining, moved } = removeRandomCards(opponent.hand, 1);
        opponent.hand = remaining;
        moved.forEach((card) => opponent.deck.push(card));
        if (moved.length > 0) {
          opponent.deck = shuffle(opponent.deck);
        }
        detail.movedTypes = moved.map((card) => getCardType(card));
        detail.movedCount = moved.length;
      }
    } else if (recipe.reward.id === "ember_next_turn_trade_block") {
      if (opponentIndex !== -1) {
        turnEffects.nextTurnTradeBlockedByPlayer[opponentIndex] = true;
        detail.tradeBlocked = true;
      }
    }
  }

  if ((cost.copper ?? 0) > 0) {
    const rewardIndex = player.deck.findIndex((card) => getCardType(card) === "copper");
    if (rewardIndex !== -1) {
      const [reward] = player.deck.splice(rewardIndex, 1);
      player.hand.push(reward);
      player.deck = shuffle(player.deck);
      detail.copperTutored = true;
    }
  }
  if (recipe.oncePerTurn) {
    turnEffects.usedTradeRecipesByPlayer[playerIndex][recipeId] = true;
  }
  state.tradesThisTurn += 1;
  return { success: true, detail };
}

export function playCard(state, player, index) {
  if (state.phase !== "main") return false;
  const playerIndex = getPlayerIndex(state, player);
  if (playerIndex === -1) return false;
  if (player.active.length >= getPlayerPlayLimit(state, playerIndex)) return false;
  const [card] = player.hand.splice(index, 1);
  if (!card) return false;
  player.active.push(card);
  return true;
}

export function playCardByType(state, player, type) {
  const index = player.hand.findIndex((card) => getCardType(card) === type);
  if (index === -1) return false;
  return playCard(state, player, index);
}

export function returnCard(state, player, index) {
  if (state.phase !== "main") return false;
  const [card] = player.active.splice(index, 1);
  if (!card) return false;
  player.hand.push(card);
  return true;
}

export function returnAllCards(state, player) {
  if (state.phase !== "main") return false;
  if (player.active.length === 0) return false;
  player.hand.push(...player.active);
  player.active = [];
  return true;
}

export function prepareArchive(state) {
  if (state.phase !== "main") return null;
  const player = getCurrentPlayer(state);
  const playedCards = [...player.active];
  const drawCount = playedCards.reduce((sum, card) => sum + (card.draw ?? 0), 0);
  state.pendingArchive = {
    playedCards,
    drawCount,
    playerIndex: state.currentPlayer,
  };
  state.phase = "confirm";
  return state.pendingArchive;
}

export function finalizeArchive(state, options = {}) {
  const pending = state.pendingArchive;
  if (!pending) return { winnerIndex: null };
  const player = state.players[pending.playerIndex];

  player.archive.push(...pending.playedCards);
  player.active = [];

  drawCards(player, pending.drawCount);

  state.pendingArchive = null;

  if (countCards(player.archive).gold >= state.ruleset.winCondition.goldInArchive) {
    state.winner = pending.playerIndex;
    return { winnerIndex: pending.playerIndex };
  }

  const outgoingIndex = pending.playerIndex;
  const incomingIndex = getOpponentIndex(outgoingIndex, state.players.length);
  const turnEffects = ensureTurnEffects(state);
  if (outgoingIndex !== -1) {
    turnEffects.currentPlayBonusByPlayer[outgoingIndex] = 0;
    turnEffects.currentPlayPenaltyByPlayer[outgoingIndex] = 0;
    turnEffects.currentTradeBlockedByPlayer[outgoingIndex] = false;
    turnEffects.usedTradeRecipesByPlayer[outgoingIndex] = {};
  }
  if (incomingIndex !== -1) {
    turnEffects.currentPlayBonusByPlayer[incomingIndex] = 0;
    turnEffects.currentPlayPenaltyByPlayer[incomingIndex] =
      turnEffects.nextTurnPlayPenaltyByPlayer[incomingIndex] ?? 0;
    turnEffects.currentTradeBlockedByPlayer[incomingIndex] =
      turnEffects.nextTurnTradeBlockedByPlayer[incomingIndex] ?? false;
    turnEffects.nextTurnPlayPenaltyByPlayer[incomingIndex] = 0;
    turnEffects.nextTurnTradeBlockedByPlayer[incomingIndex] = false;
    turnEffects.usedTradeRecipesByPlayer[incomingIndex] = {};
  }

  state.tradesThisTurn = 0;
  state.currentPlayer = incomingIndex === -1 ? 0 : incomingIndex;
  state.turnCount += 1;
  state.phase = "between";
  return { winnerIndex: null };
}

export function cancelArchive(state) {
  state.pendingArchive = null;
  state.phase = "main";
}

export function startTurn(state) {
  state.phase = "main";
}

export function applyAction(state, action) {
  const player = getCurrentPlayer(state);
  switch (action.type) {
    case ActionTypes.TRADE:
      return {
        event: {
          type: "trade",
          ...performTrade(state, player, action.payload.recipeId, action.payload),
        },
      };
    case ActionTypes.PLAY_CARD:
      playCard(state, player, action.payload.index);
      return { event: null };
    case ActionTypes.PLAY_CARD_BY_TYPE:
      playCardByType(state, player, action.payload.type);
      return { event: null };
    case ActionTypes.RETURN_CARD:
      returnCard(state, player, action.payload.index);
      return { event: null };
    case ActionTypes.RETURN_ALL:
      returnAllCards(state, player);
      return { event: null };
    case ActionTypes.END_TURN:
      prepareArchive(state);
      return { event: null };
    case ActionTypes.CONFIRM_ARCHIVE:
      return { event: finalizeArchive(state, action.payload ?? {}) };
    case ActionTypes.CANCEL_ARCHIVE:
      cancelArchive(state);
      return { event: null };
    case ActionTypes.START_TURN:
      startTurn(state);
      return { event: null };
    default:
      return { event: null };
  }
}
