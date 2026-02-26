import { describe, it, expect } from "vitest";
import { captureVisibleSnapshot, computeMovementDescriptors } from "../src/ui/feedback/state-diff.js";

describe("feedback state diff", () => {
  it("captures visible local zones", () => {
    const state = {
      mode: "offline",
      currentPlayer: 0,
      ruleset: { displayOrder: ["bronze", "silver", "gold"] },
      players: [
        {
          id: "p1",
          deck: ["bronze", "silver"],
          hand: ["bronze"],
          active: [],
          archive: ["gold"],
          discard: [],
        },
        { id: "p2", deck: [], hand: ["gold"], active: [], archive: [], discard: [] },
      ],
    };

    const snapshot = captureVisibleSnapshot(state);

    expect(snapshot.local.deck.bronze).toBe(1);
    expect(snapshot.local.archive.gold).toBe(1);
    expect(snapshot.opponent.handCount).toBe(1);
  });

  it("computes deterministic movement descriptors", () => {
    const before = {
      local: {
        deck: { bronze: 3, silver: 1, gold: 0 },
        hand: { bronze: 1, silver: 0, gold: 0 },
        active: { bronze: 0, silver: 0, gold: 0 },
        archive: { bronze: 5, silver: 0, gold: 0 },
        discard: { bronze: 0, silver: 0, gold: 0 },
      },
    };
    const after = {
      local: {
        deck: { bronze: 2, silver: 1, gold: 0 },
        hand: { bronze: 2, silver: 0, gold: 0 },
        active: { bronze: 0, silver: 0, gold: 0 },
        archive: { bronze: 4, silver: 0, gold: 0 },
        discard: { bronze: 1, silver: 0, gold: 0 },
      },
    };

    const descriptors = computeMovementDescriptors(before, after);

    expect(descriptors).toEqual([
      {
        type: "bronze",
        count: 1,
        fromZone: "archive",
        toZone: "discard",
        kind: "trade_cost",
        visibility: "local",
      },
      {
        type: "bronze",
        count: 1,
        fromZone: "deck",
        toZone: "hand",
        kind: "draw",
        visibility: "local",
      },
    ]);
  });

  it("captures archive movement from active cards", () => {
    const before = {
      local: {
        deck: { bronze: 3, silver: 1, gold: 0 },
        hand: { bronze: 1, silver: 0, gold: 0 },
        active: { bronze: 2, silver: 0, gold: 0 },
        archive: { bronze: 1, silver: 0, gold: 0 },
        discard: { bronze: 0, silver: 0, gold: 0 },
      },
    };
    const after = {
      local: {
        deck: { bronze: 2, silver: 1, gold: 0 },
        hand: { bronze: 2, silver: 0, gold: 0 },
        active: { bronze: 0, silver: 0, gold: 0 },
        archive: { bronze: 3, silver: 0, gold: 0 },
        discard: { bronze: 0, silver: 0, gold: 0 },
      },
    };

    const descriptors = computeMovementDescriptors(before, after);

    expect(descriptors).toEqual([
      {
        type: "bronze",
        count: 2,
        fromZone: "active",
        toZone: "archive",
        kind: "archive",
        visibility: "local",
      },
      {
        type: "bronze",
        count: 1,
        fromZone: "deck",
        toZone: "hand",
        kind: "draw",
        visibility: "local",
      },
    ]);
  });

  it("captures deck to archive tutor movement", () => {
    const before = {
      local: {
        deck: { bronze: 4, silver: 1, gold: 0 },
        hand: { bronze: 1, silver: 0, gold: 0 },
        active: { bronze: 0, silver: 0, gold: 0 },
        archive: { bronze: 2, silver: 0, gold: 0 },
        discard: { bronze: 0, silver: 0, gold: 0 },
      },
    };
    const after = {
      local: {
        deck: { bronze: 3, silver: 1, gold: 0 },
        hand: { bronze: 1, silver: 0, gold: 0 },
        active: { bronze: 0, silver: 0, gold: 0 },
        archive: { bronze: 3, silver: 0, gold: 0 },
        discard: { bronze: 0, silver: 0, gold: 0 },
      },
    };

    const descriptors = computeMovementDescriptors(before, after);

    expect(descriptors).toEqual([
      {
        type: "bronze",
        count: 1,
        fromZone: "deck",
        toZone: "archive",
        kind: "archive_reward",
        visibility: "local",
      },
    ]);
  });
});
