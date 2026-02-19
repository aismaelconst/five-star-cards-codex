import { describe, expect, it } from "vitest";
import {
  formatPlatinumMessage,
  formatPoolCostLine,
  formatPoolLabel,
  formatTradeToast,
  resolvePoolTypes,
} from "../src/ui/handlers/trade-utils.js";

describe("trade-utils", () => {
  it("formats platinum messages with and without reward", () => {
    const withReward = formatPlatinumMessage("Platinum dig", {
      useWood: true,
      substituteType: "silver",
      digDiscardedCount: 2,
      rewardType: "gold",
    });
    const withoutReward = formatPlatinumMessage("Platinum dig", {
      useWood: false,
      digDiscardedCount: 0,
    });

    expect(withReward).toContain("wood replaced silver");
    expect(withReward).toContain("Discarded 2 bronze/silver");
    expect(withReward).toContain("Found gold");
    expect(withoutReward).toContain("Deck exhausted");
  });

  it("formats gem and fallback trade toasts", () => {
    const gemToast = formatTradeToast("trade_gem_set", { reward: "any" }, { rewardType: "ruby" });
    const genericToast = formatTradeToast("trade_unknown", undefined, {});

    expect(gemToast).toContain("gained Ruby");
    expect(genericToast).toBe("Trade complete.");
  });

  it("formats archive-hand trade toasts", () => {
    const recipe = { reward: { type: "archive_hand" } };
    const withCards = formatTradeToast("trade_electrum_draw", recipe, {
      handArchive: { bronze: 2, lapis_lazuli: 1 },
      useWood: true,
      substituteType: "bronze",
    });
    const empty = formatTradeToast("trade_electrum_draw", recipe, {});

    expect(withCards).toContain("archived 2 Bronze, 1 Lapis Lazuli from hand");
    expect(withCards).toContain("wood replaced bronze");
    expect(empty).toContain("archived cards from hand");
  });

  it("formats archive and archive-cards trade toasts", () => {
    const archiveToast = formatTradeToast(
      "trade_ancients_archive",
      { reward: { type: "archive" } },
      { rewardType: "mint" }
    );
    const archiveCardsFromEvent = formatTradeToast(
      "trade_hallmark",
      { reward: { type: "archive_cards", cards: ["ingot"] } },
      { rewardCards: ["mint", "sterling"] }
    );
    const archiveCardsFromRecipe = formatTradeToast(
      "trade_hallmark",
      { reward: { type: "archive_cards", cards: ["ingot", "mint"] } },
      {}
    );
    const archiveCardsEmpty = formatTradeToast(
      "trade_hallmark",
      { reward: { type: "archive_cards", cards: [] } },
      {}
    );

    expect(archiveToast).toContain("archived Mint from deck");
    expect(archiveCardsFromEvent).toContain("archived Mint, Sterling");
    expect(archiveCardsFromRecipe).toContain("archived Ingot, Mint");
    expect(archiveCardsEmpty).toContain("archived cards");
  });

  it("formats cards, draw, string and any rewards", () => {
    const cardsToast = formatTradeToast(
      "trade_x",
      { reward: { type: "cards", card: "silver", count: 2 } },
      { rewardCount: 1 }
    );
    const drawToast = formatTradeToast(
      "trade_x",
      { reward: { type: "draw", count: 3 } },
      { drawCount: 2 }
    );
    const drawFallback = formatTradeToast("trade_x", { reward: { type: "draw", count: 3 } }, {});
    const stringReward = formatTradeToast("trade_bronze", { reward: "silver" }, {});
    const stringOverride = formatTradeToast("trade_bronze", { reward: "silver" }, { rewardType: "gold" });
    const anyReward = formatTradeToast("trade_any", { reward: "any" }, {});

    expect(cardsToast).toContain("gained 1 Silver");
    expect(drawToast).toContain("drew 2 card(s)");
    expect(drawFallback).toContain("drew 3 card(s)");
    expect(stringReward).toContain("gained Silver");
    expect(stringOverride).toContain("gained Gold");
    expect(anyReward).toContain("tutored a card");
  });

  it("formats pool labels and resolves pool types", () => {
    const displayOrder = ["bronze", "silver", "gold", "turquoise", "carnelian", "electrum"];

    expect(formatPoolLabel("ancient", displayOrder)).toBe("ancients");
    expect(formatPoolLabel("non_gold_non_electrum", displayOrder)).toBe("non-gold/non-electrum");
    expect(formatPoolLabel(["bronze", "silver"], displayOrder)).toBe("bronze/silver");
    expect(formatPoolLabel("unknown", displayOrder)).toBe("cards");
    expect(formatPoolLabel("unknown", null)).toBe("cards");

    expect(resolvePoolTypes(["bronze", "ruby"], displayOrder)).toEqual(["bronze"]);
    expect(resolvePoolTypes("ancient", displayOrder)).toEqual(["turquoise", "carnelian"]);
    expect(resolvePoolTypes("non_gold_non_electrum", displayOrder)).toEqual([
      "bronze",
      "silver",
      "turquoise",
      "carnelian",
    ]);
    expect(resolvePoolTypes("other", displayOrder)).toEqual([]);
    expect(resolvePoolTypes(null, displayOrder)).toEqual([]);
  });

  it("formats pool cost lines for selected and unselected states", () => {
    const noPool = formatPoolCostLine({}, { poolTypes: null }, ["bronze", "silver"]);
    const selected = formatPoolCostLine(
      { poolCost: { min: 2, max: 2, distinct: true, pool: "ancient" } },
      { poolTypes: ["turquoise", "carnelian"] },
      ["turquoise", "carnelian"]
    );
    const ranged = formatPoolCostLine(
      { poolCost: { min: 1, max: 4, distinct: true, pool: "non_gold_non_electrum" } },
      { poolTypes: [] },
      ["bronze", "silver", "gold"]
    );
    const fixed = formatPoolCostLine(
      { poolCost: { min: 2, distinct: false, pool: ["bronze", "silver"] } },
      { poolTypes: [] },
      ["bronze", "silver", "gold"]
    );

    expect(noPool).toBeNull();
    expect(selected).toBe("turquoise, carnelian");
    expect(ranged).toBe("1-4 distinct non-gold/non-electrum");
    expect(fixed).toBe("2 bronze/silver");
  });
});
