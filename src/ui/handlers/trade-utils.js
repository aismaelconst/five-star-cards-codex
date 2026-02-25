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

function titleCase(type) {
  if (!type) return "";
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatWoodNote(event) {
  if (!event?.useWood || !event?.substituteType) return "";
  return ` (wood replaced ${event.substituteType})`;
}

export function formatTradeToast(recipeId, recipe, event = {}) {
  if (recipeId === "trade_platinum") {
    return formatPlatinumMessage("Platinum dig", event);
  }
  const woodNote = formatWoodNote(event);
  if (recipeId === "trade_gem_set") {
    const target = event.rewardType ? titleCase(event.rewardType) : "no card";
    return `Gem tutor${woodNote}: gained ${target}.`;
  }

  const reward = recipe?.reward;
  if (reward?.type === "archive_hand") {
    const entries = Object.entries(event.handArchive ?? {}).filter(([, amount]) => amount > 0);
    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
    const detail = entries
      .map(([type, amount]) => `${amount} ${titleCase(type)}`)
      .join(", ");
    if (total > 0) {
      return `Trade complete${woodNote}: archived ${detail} from hand.`;
    }
    return `Trade complete${woodNote}: archived cards from hand.`;
  }
  if (reward?.type === "archive") {
    const archived = event.rewardType ? titleCase(event.rewardType) : "a card";
    return `Trade complete${woodNote}: archived ${archived} from deck.`;
  }
  if (reward?.type === "archive_cards") {
    const cards =
      Array.isArray(event.rewardCards) && event.rewardCards.length > 0
        ? event.rewardCards
        : recipe.reward.cards ?? [];
    const list = cards.map((type) => titleCase(type)).join(", ");
    return list
      ? `Trade complete${woodNote}: archived ${list}.`
      : `Trade complete${woodNote}: archived cards.`;
  }
  if (reward?.type === "cards") {
    const count = event.rewardCount ?? reward.count ?? 0;
    return `Trade complete${woodNote}: gained ${count} ${titleCase(reward.card)}.`;
  }
  if (reward?.type === "effect") {
    if (reward.id === "pearl_extra_play") {
      const playLimit = event.playLimit ? ` (play limit ${event.playLimit})` : "";
      return `Trade complete${woodNote}: +1 play this turn${playLimit}.`;
    }
    if (reward.id === "obsidian_next_turn_penalty") {
      return `Trade complete${woodNote}: opponent plays 1 less card next turn.`;
    }
    if (reward.id === "amethyst_archive_to_deck") {
      const target = event.targetType ? titleCase(event.targetType) : "1 card";
      return `Trade complete${woodNote}: shuffled opponent archive ${target} into deck.`;
    }
    if (reward.id === "ash_random_hand_to_deck") {
      const moved = Array.isArray(event.movedTypes) ? event.movedTypes : [];
      const label = moved.length > 0 ? titleCase(moved[0]) : "a random card";
      return `Trade complete${woodNote}: shuffled opponent hand ${label} into deck.`;
    }
    if (reward.id === "ember_random_discard_to_deck") {
      const moved = Array.isArray(event.movedTypes) ? event.movedTypes : [];
      const list = moved.map((type) => titleCase(type)).join(", ");
      if (list) {
        return `Trade complete${woodNote}: shuffled opponent discard ${list} into deck.`;
      }
      return `Trade complete${woodNote}: shuffled opponent discard cards into deck.`;
    }
    return `Trade complete${woodNote}: activated ${reward.id}.`;
  }
  if (reward?.type === "draw") {
    const count = event.drawCount ?? reward.count ?? 0;
    return `Trade complete${woodNote}: drew ${count} card(s).`;
  }
  if (reward === "any") {
    const rewardType = event.rewardType ? titleCase(event.rewardType) : "a card";
    return `Trade complete${woodNote}: tutored ${rewardType}.`;
  }
  if (typeof reward === "string") {
    const rewardType = event.rewardType ?? reward;
    return `Trade complete${woodNote}: gained ${titleCase(rewardType)}.`;
  }

  return `Trade complete${woodNote}.`;
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
