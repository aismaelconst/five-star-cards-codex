export function formatPlatinumMessage(prefix, event) {
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

export function formatPoolLabel(pool, displayOrder) {
  if (pool === "ancient") return "ancients";
  if (pool === "non_gold_non_electrum") return "non-gold/non-electrum";
  if (Array.isArray(pool)) return pool.join("/");
  if (Array.isArray(displayOrder)) return "cards";
  return "cards";
}

export function resolvePoolTypes(pool, displayOrder) {
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

export function formatPoolCostLine(recipe, trade, displayOrder) {
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
