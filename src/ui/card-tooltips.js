function titleCase(type) {
  if (!type) return "";
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatCost(cost, capitalize = false) {
  return Object.entries(cost)
    .map(([type, amount]) => `${amount} ${capitalize ? titleCase(type) : type}`)
    .join(" + ");
}

function formatTradeBullet(recipe, type, ruleset) {
  if (!recipe) return null;
  const hasBaseCost = recipe.cost && Object.keys(recipe.cost).length > 0;
  if (hasBaseCost && !recipe.cost[type]) return null;
  if (!hasBaseCost && recipe.poolCost) {
    const displayOrder = ruleset?.displayOrder ?? [];
    const poolTypes = resolvePoolTypes(recipe.poolCost.pool, displayOrder);
    if (!poolTypes.includes(type)) return null;
  }

  if (recipe.reward === "any") {
    return "• Trade: Ruby + Emerald + Sapphire → tutor any card";
  }
  if (recipe.reward === "dig_non_bronze_silver") {
    return "• Trade: Platinum + Bronze + Silver → dig until non bronze/silver; discard bronze/silver; add first non bronze/silver";
  }
  const parts = [];
  if (recipe.cost && Object.keys(recipe.cost).length > 0) {
    parts.push(formatCost(recipe.cost, false));
  }
  if (recipe.choiceCost) {
    let poolLabel = "choice";
    if (recipe.choiceCost.pool === "non_gem_non_wood") {
      poolLabel = "non-gem/non-wood";
    } else if (recipe.choiceCost.pool === "non_gold") {
      poolLabel = "non-gold";
    }
    parts.push(`${recipe.choiceCost.count} ${poolLabel}`);
  }
  if (recipe.poolCost) {
    parts.push(formatPoolCost(recipe.poolCost));
  }
  const cost = parts.join(" + ");
  let reward = recipe.reward;
  if (recipe.reward?.type === "cards") {
    reward = `${recipe.reward.count} ${recipe.reward.card}`;
  } else if (recipe.reward?.type === "draw") {
    if (typeof recipe.reward.count === "number") {
      reward = `draw ${recipe.reward.count}`;
    } else {
      reward = "draw cards equal to cards traded";
    }
  } else if (recipe.reward?.type === "archive_hand") {
    const min = recipe.reward.min ?? 1;
    const max = recipe.reward.max ?? min;
    const range = min === max ? `${min}` : `${min}-${max}`;
    const allowed = recipe.reward.allowed ?? [];
    let label = "cards";
    if (allowed.length > 0) {
      const displayOrder = ruleset?.displayOrder ?? [];
      const nonGold = displayOrder.filter((type) => type !== "gold");
      const allowedSet = new Set(allowed);
      const isAllNonGold =
        nonGold.length > 0 && nonGold.every((type) => allowedSet.has(type));
      label = isAllNonGold ? "non-gold cards" : allowed.join("/");
    }
    reward = `archive ${range} ${label} from hand`;
  } else if (recipe.reward?.type === "archive") {
    reward = "archive 1 non-gold from deck";
  } else if (typeof recipe.reward === "string") {
    reward = `1 ${recipe.reward}`;
  }
  return `• Trade: ${cost} → ${reward}`;
}

function resolvePoolTypes(pool, displayOrder) {
  if (!pool) return [];
  if (Array.isArray(pool)) return pool;
  if (pool === "ancient") {
    return ["turquoise", "lapis_lazuli", "carnelian"];
  }
  if (pool === "non_gold_non_electrum") {
    return (displayOrder ?? []).filter((type) => type !== "gold" && type !== "electrum");
  }
  return [];
}

function formatPoolCost(poolCost) {
  if (!poolCost) return "";
  const min = poolCost.min ?? 0;
  const max = poolCost.max ?? min;
  const range = min === max ? `${min}` : `${min}-${max}`;
  const distinct = poolCost.distinct ? "distinct " : "";
  let label = "cards";
  if (poolCost.pool === "ancient") label = "ancients";
  if (poolCost.pool === "non_gold_non_electrum") label = "non-gold/non-electrum";
  return `${range} ${distinct}${label}`;
}

export function getCardTooltip(type, ruleset) {
  if (!type || type === "unknown") return null;
  const def = ruleset?.cardTypes?.[type];
  if (!def) return null;

  const lines = [];
  lines.push(titleCase(type));
  if (def.draw > 0) {
    lines.push(`• End of turn: Draw ${def.draw}`);
  } else {
    lines.push("• End of turn: No draw");
  }

  const recipes = ruleset?.tradeRecipes ?? {};
  Object.values(recipes).forEach((recipe) => {
    const bullet = formatTradeBullet(recipe, type, ruleset);
    if (bullet) lines.push(bullet);
  });

  if (type === "wood") {
    lines.push("• Can replace one required card in trades costing 3+ (max 1 per trade).");
  }
  if (type === "copper") {
    lines.push("• Can replace one required card in 2-card trades.");
    lines.push("• When traded, tutor a copper to hand (shuffle).");
  }
  if (type === "gold") {
    lines.push("• Counts toward win condition (5 gold in archive).");
  }

  return lines.join("\n");
}
