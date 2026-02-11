import { describe, it, expect } from "vitest";
import { getCardTooltip } from "../src/ui/card-tooltips.js";
import {
  baseRuleset,
  expandedRuleset,
  ultraExpandedRuleset,
} from "../src/game/ruleset.js";

describe("card tooltips", () => {
  it("includes bronze end-of-turn and trade text", () => {
    const tooltip = getCardTooltip("bronze", baseRuleset);
    expect(tooltip).toContain("Bronze");
    expect(tooltip).toContain("End of turn: Draw 1");
    expect(tooltip).toContain("Trade: 5 bronze");
  });

  it("includes wood substitution note", () => {
    const tooltip = getCardTooltip("wood", expandedRuleset);
    expect(tooltip).toContain("No draw");
    expect(tooltip).toContain("replace one required card");
  });

  it("includes platinum dig description", () => {
    const tooltip = getCardTooltip("platinum", expandedRuleset);
    expect(tooltip).toContain("dig until non bronze/silver");
    expect(tooltip).toContain("discard bronze/silver");
  });

  it("includes copper expansion effects", () => {
    const tooltip = getCardTooltip("copper", ultraExpandedRuleset);
    expect(tooltip).toContain("Tutor 1 tin or zinc");
    expect(tooltip).toContain("Trade: 1 copper + 1 tin");
  });
});
