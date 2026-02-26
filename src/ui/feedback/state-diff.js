import { countCards } from "../../shared/utils.js";

function resolveLocalPlayerIndex(state, localPlayerId) {
  if (!state?.players || state.players.length === 0) return -1;
  if (localPlayerId) {
    const found = state.players.findIndex((player) => player.id === localPlayerId);
    if (found !== -1) return found;
  }
  if (state.mode === "cpu") return 0;
  if (state.mode === "online" && state.online?.playerId) {
    const found = state.players.findIndex((player) => player.id === state.online.playerId);
    if (found !== -1) return found;
  }
  return state.currentPlayer ?? 0;
}

function buildZoneCounts(cards, displayOrder) {
  return countCards(cards ?? [], displayOrder);
}

function getZoneCount(snapshot, zone, type) {
  return snapshot?.local?.[zone]?.[type] ?? 0;
}

function collectTypes(before, after) {
  const types = new Set();
  [before, after].forEach((snapshot) => {
    ["deck", "hand", "active", "archive", "discard"].forEach((zone) => {
      Object.keys(snapshot?.local?.[zone] ?? {}).forEach((type) => types.add(type));
    });
  });
  return Array.from(types);
}

export function captureVisibleSnapshot(state, options = {}) {
  const displayOrder = state?.ruleset?.displayOrder ?? ["bronze", "silver", "gold"];
  const localPlayerIndex = resolveLocalPlayerIndex(state, options.localPlayerId);
  if (localPlayerIndex === -1) return null;
  const opponentIndex = localPlayerIndex === 0 ? 1 : 0;
  const localPlayer = state.players[localPlayerIndex] ?? null;
  const opponentPlayer = state.players[opponentIndex] ?? null;
  if (!localPlayer) return null;

  return {
    localPlayerId: localPlayer.id,
    displayOrder,
    local: {
      deck: buildZoneCounts(localPlayer.deck, displayOrder),
      hand: buildZoneCounts(localPlayer.hand, displayOrder),
      active: buildZoneCounts(localPlayer.active, displayOrder),
      archive: buildZoneCounts(localPlayer.archive, displayOrder),
      discard: buildZoneCounts(localPlayer.discard, displayOrder),
    },
    opponent: {
      archive: buildZoneCounts(opponentPlayer?.archive, displayOrder),
      discard: buildZoneCounts(opponentPlayer?.discard, displayOrder),
      handCount: opponentPlayer?.hand?.length ?? 0,
    },
  };
}

export function computeMovementDescriptors(before, after) {
  if (!before || !after) return [];

  const pairs = [
    { fromZone: "archive", toZone: "discard", kind: "trade_cost" },
    { fromZone: "active", toZone: "archive", kind: "archive" },
    { fromZone: "deck", toZone: "hand", kind: "draw" },
    { fromZone: "deck", toZone: "archive", kind: "archive_reward" },
  ];
  const kindOrder = {
    trade_cost: 1,
    archive_reward: 2,
    archive: 3,
    draw: 4,
  };

  const descriptors = [];
  const types = collectTypes(before, after);
  const zones = ["deck", "hand", "active", "archive", "discard"];
  types.forEach((type) => {
    const sourceByZone = {};
    const targetByZone = {};
    zones.forEach((zone) => {
      sourceByZone[zone] = Math.max(0, getZoneCount(before, zone, type) - getZoneCount(after, zone, type));
      targetByZone[zone] = Math.max(0, getZoneCount(after, zone, type) - getZoneCount(before, zone, type));
    });
    pairs.forEach(({ fromZone, toZone, kind }) => {
      const count = Math.min(sourceByZone[fromZone] ?? 0, targetByZone[toZone] ?? 0);
      if (count <= 0) return;
      sourceByZone[fromZone] -= count;
      targetByZone[toZone] -= count;
      descriptors.push({
        type,
        count,
        fromZone,
        toZone,
        kind,
        visibility: "local",
      });
    });
  });

  descriptors.sort((a, b) => {
    if (kindOrder[a.kind] !== kindOrder[b.kind]) {
      return kindOrder[a.kind] - kindOrder[b.kind];
    }
    if (a.fromZone !== b.fromZone) return a.fromZone.localeCompare(b.fromZone);
    if (a.toZone !== b.toZone) return a.toZone.localeCompare(b.toZone);
    return a.type.localeCompare(b.type);
  });

  return descriptors;
}
