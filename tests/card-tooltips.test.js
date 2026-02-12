import { describe, it, expect } from "vitest";
import { getCardTooltip } from "../src/ui/card-tooltips.js";
import {
  baseRuleset,
  expandedRuleset,
  ancientRuleset,
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

  it("includes ancients archive trade", () => {
    const tooltip = getCardTooltip("turquoise", ancientRuleset);
    expect(tooltip).toContain("Turquoise");
    expect(tooltip).toContain("Trade: 2 distinct ancients");
    expect(tooltip).toContain("archive 1 non-gold");
  });

  it("includes electrum hand archive trade", () => {
    const tooltip = getCardTooltip("electrum", ancientRuleset);
    expect(tooltip).toContain("Electrum");
    expect(tooltip).toContain("archive 1-5 bronze/silver");
  });

  it("formats lapis lazuli name", () => {
    const tooltip = getCardTooltip("lapis_lazuli", ancientRuleset);
    expect(tooltip).toContain("Lapis Lazuli");
  });
});
