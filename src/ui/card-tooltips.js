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
  const cost = formatCost(recipe.cost, false);
  return `• Trade: ${cost} → 1 ${recipe.reward}`;
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
