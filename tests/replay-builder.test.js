import { describe, it, expect } from "vitest";
import {
  buildArchiveReplay,
  buildArchiveReplayFromCards,
  formatReplaySummary,
  normalizeReplayCards,
} from "../src/ui/feedback/replay-builder.js";

describe("replay builder", () => {
  it("builds archive replay payload from counts", () => {
    const replay = buildArchiveReplay({
      actorName: "Opponent",
      counts: { bronze: 2, silver: 1, gold: 0 },
      drawCount: 3,
      displayOrder: ["bronze", "silver", "gold"],
    });

    expect(replay.title).toBe("Opponent Archive");
    expect(replay.total).toBe(3);
    expect(replay.entries).toEqual(["bronze", "bronze", "silver"]);
    expect(replay.meta).toContain("Drew 3");
  });

  it("builds replay from card array", () => {
    const replay = buildArchiveReplayFromCards({
      actorName: "Player",
      cards: ["gold", "bronze", "gold"],
      drawCount: 2,
      displayOrder: ["bronze", "silver", "gold"],
    });

    expect(replay.total).toBe(3);
    expect(replay.entries).toEqual(["bronze", "gold", "gold"]);
  });

  it("formats replay summary and normalizes card types", () => {
    const replay = {
      entries: ["lapis_lazuli", "lapis_lazuli", "gold"],
    };
    expect(formatReplaySummary(replay)).toBe("2 Lapis Lazuli, 1 Gold");

    const cards = normalizeReplayCards(["bronze", { type: "silver" }]);
    expect(cards).toEqual(["bronze", "silver"]);
  });
});
