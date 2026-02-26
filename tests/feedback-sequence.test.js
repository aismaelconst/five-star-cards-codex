import { describe, expect, it } from "vitest";
import { buildArchiveDrawSequence, buildDescriptorSequence } from "../src/ui/feedback/sequence-builder.js";

describe("feedback sequence builder", () => {
  it("orders generic descriptors deterministically", () => {
    const sequence = buildDescriptorSequence([
      {
        type: "silver",
        count: 1,
        fromZone: "deck",
        toZone: "hand",
        kind: "draw",
        visibility: "local",
      },
      {
        type: "bronze",
        count: 2,
        fromZone: "archive",
        toZone: "discard",
        kind: "trade_cost",
        visibility: "local",
      },
    ]);

    expect(sequence).toHaveLength(2);
    expect(sequence[0].descriptor.kind).toBe("trade_cost");
    expect(sequence[1].descriptor.kind).toBe("draw");
  });

  it("builds archive then draw sequence with captions", () => {
    const sequence = buildArchiveDrawSequence({
      playedCards: ["bronze", "silver"],
      drawCount: 3,
      displayOrder: ["bronze", "silver", "gold"],
      beforeSnapshot: {
        local: {
          deck: { bronze: 1, silver: 1, gold: 0 },
          hand: { bronze: 0, silver: 0, gold: 0 },
          active: { bronze: 1, silver: 1, gold: 0 },
          archive: { bronze: 0, silver: 0, gold: 0 },
          discard: { bronze: 0, silver: 0, gold: 0 },
        },
      },
      afterSnapshot: {
        local: {
          deck: { bronze: 0, silver: 0, gold: 0 },
          hand: { bronze: 1, silver: 1, gold: 0 },
          active: { bronze: 0, silver: 0, gold: 0 },
          archive: { bronze: 1, silver: 1, gold: 0 },
          discard: { bronze: 0, silver: 0, gold: 0 },
        },
      },
    });

    expect(sequence[0]).toEqual(
      expect.objectContaining({
        type: "caption",
        text: "Archiving 2 card(s)...",
      })
    );
    const drawCaptionIndex = sequence.findIndex(
      (entry) => entry.type === "caption" && entry.text.includes("Drawing 3")
    );
    expect(drawCaptionIndex).toBeGreaterThan(0);
    const firstDrawMove = sequence.findIndex(
      (entry) => entry.type === "move" && entry.descriptor.kind === "draw"
    );
    expect(firstDrawMove).toBeGreaterThan(drawCaptionIndex);
  });
});
