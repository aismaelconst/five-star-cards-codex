import { countCards } from "../../shared/utils.js";
import { computeMovementDescriptors } from "./state-diff.js";

const KIND_PRIORITY = {
  trade_cost: 1,
  archive_reward: 2,
  archive: 3,
  draw: 4,
};

function sortByPriority(descriptors) {
  return [...descriptors].sort((a, b) => {
    const left = KIND_PRIORITY[a.kind] ?? 99;
    const right = KIND_PRIORITY[b.kind] ?? 99;
    if (left !== right) return left - right;
    if (a.fromZone !== b.fromZone) return a.fromZone.localeCompare(b.fromZone);
    if (a.toZone !== b.toZone) return a.toZone.localeCompare(b.toZone);
    return a.type.localeCompare(b.type);
  });
}

function totalCount(descriptors) {
  return descriptors.reduce((sum, descriptor) => sum + (descriptor.count ?? 0), 0);
}

export function buildDescriptorSequence(descriptors = []) {
  return sortByPriority(descriptors).map((descriptor) => ({
    type: "move",
    descriptor,
  }));
}

export function buildArchiveDrawSequence({
  playedCards = [],
  drawCount = 0,
  displayOrder,
  beforeSnapshot,
  afterSnapshot,
}) {
  const archiveCounts = countCards(playedCards, displayOrder);
  const archiveDescriptors = Object.entries(archiveCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      type,
      count,
      fromZone: "active",
      toZone: "archive",
      kind: "archive",
      visibility: "local",
    }));

  const movement = computeMovementDescriptors(beforeSnapshot, afterSnapshot);
  const drawDescriptors = movement.filter((descriptor) => descriptor.kind === "draw");
  const orderedDraw = sortByPriority(drawDescriptors);
  const resolvedDraw = drawCount > 0 ? drawCount : totalCount(orderedDraw);

  const sequence = [];
  if (archiveDescriptors.length > 0) {
    sequence.push({
      type: "caption",
      text: `Archiving ${playedCards.length} card(s)...`,
      zone: "archive",
    });
    sequence.push(...buildDescriptorSequence(archiveDescriptors));
  }

  if (resolvedDraw > 0) {
    sequence.push({
      type: "caption",
      text: `Drawing ${resolvedDraw} card(s)...`,
      zone: "hand",
    });
    sequence.push(...buildDescriptorSequence(orderedDraw));
  } else {
    sequence.push({
      type: "caption",
      text: "No cards drawn.",
      zone: "hand",
    });
  }

  return sequence;
}
