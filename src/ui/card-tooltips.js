function titleCase(type) {
  if (!type) return "";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatCost(cost, capitalize = false) {
  return Object.entries(cost)
    .map(([type, amount]) => `${amount} ${capitalize ? titleCase(type) : type}`)
    .join(" + ");
}

function formatTradeBullet(recipe, type) {
  if (!recipe) return null;
  if (!recipe.cost || !recipe.cost[type]) return null;

  if (recipe.reward === "any") {
    return "• Trade: Ruby + Emerald + Sapphire → tutor any card";
  }
  if (recipe.reward === "dig_non_bronze_silver") {
    return "• Trade: Platinum + Bronze + Silver → dig until non bronze/silver; discard bronze/silver; add first non bronze/silver";
  }
  let cost = formatCost(recipe.cost, false);
  if (recipe.choiceCost) {
    const poolLabel =
      recipe.choiceCost.pool === "non_gem_non_wood" ? "non-gem/non-wood" : "choice";
    cost = `${cost} + ${recipe.choiceCost.count} ${poolLabel}`;
  }
  let reward = recipe.reward;
  if (recipe.reward?.type === "cards") {
    reward = `${recipe.reward.count} ${recipe.reward.card}`;
  } else if (recipe.reward?.type === "draw") {
    reward = `draw ${recipe.reward.count}`;
  } else if (typeof recipe.reward === "string") {
    reward = `1 ${recipe.reward}`;
  }
  return `• Trade: ${cost} → ${reward}`;
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

  if (type === "copper") {
    lines.push("• End of turn: Tutor 1 tin or zinc (before draws).");
  }
  if (type === "tin" || type === "zinc") {
    lines.push("• End of turn: Tutor 1 copper (before draws).");
  }

  const recipes = ruleset?.tradeRecipes ?? {};
  Object.values(recipes).forEach((recipe) => {
    const bullet = formatTradeBullet(recipe, type);
    if (bullet) lines.push(bullet);
  });

  if (type === "wood") {
    lines.push("• Can replace one required card in trades costing 3+ (max 1 per trade).");
  }
  if (type === "gold") {
    lines.push("• Counts toward win condition (5 gold in archive).");
  }

  return lines.join("\n");
}
