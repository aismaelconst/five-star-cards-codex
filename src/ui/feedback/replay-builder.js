import { countCards, getCardType } from "../../shared/utils.js";

function titleCase(value) {
  if (!value) return "";
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function expandCountsToEntries(counts, displayOrder) {
  const order = Array.isArray(displayOrder) && displayOrder.length > 0
    ? displayOrder
    : Object.keys(counts ?? {});
  const entries = [];
  order.forEach((type) => {
    const value = counts?.[type] ?? 0;
    for (let i = 0; i < value; i += 1) {
      entries.push(type);
    }
  });
  return entries;
}

export function buildArchiveReplay({ counts, drawCount = 0, actorName = "Opponent", displayOrder }) {
  const safeCounts = counts ?? {};
  const entries = expandCountsToEntries(safeCounts, displayOrder);
  const total = entries.length;
  return {
    title: `${actorName} Archive`,
    meta: `Archived ${total} card(s) • Drew ${drawCount} card(s).`,
    entries,
    counts: safeCounts,
    drawCount,
    total,
  };
}

export function buildArchiveReplayFromCards({ cards, drawCount = 0, actorName = "Player", displayOrder }) {
  const counts = countCards(cards ?? [], displayOrder);
  return buildArchiveReplay({ counts, drawCount, actorName, displayOrder });
}

export function formatReplaySummary(replay) {
  if (!replay) return "";
  const counts = replay.entries.reduce((acc, type) => {
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([type, amount]) => `${amount} ${titleCase(type)}`)
    .join(", ");
}

export function normalizeReplayCards(cards) {
  return (cards ?? []).map((card) => getCardType(card));
}
