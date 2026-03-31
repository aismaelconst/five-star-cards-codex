import { describe, it, expect } from "vitest";
import { getCardTooltip } from "../src/ui/card-tooltips.js";
import {
  baseRuleset,
  expandedRuleset,
  ancientRuleset,
  mysticRuleset,
  foundryRuleset,
  mintedRuleset,
  shelvedCardTypes,
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

  it("does not expose shelved electrum in ancient format", () => {
    const tooltip = getCardTooltip("electrum", ancientRuleset);
    expect(tooltip).toBeNull();
  });

  it("keeps tooltip copy for shelved copper/electrum card types", () => {
    const shelvedRuleset = {
      displayOrder: ["electrum", "copper"],
      cardTypes: { ...shelvedCardTypes },
      tradeRecipes: {},
    };
    const tooltip = getCardTooltip("copper", shelvedRuleset);
    expect(tooltip).toContain("Copper");
    expect(tooltip).toContain("2-card trades");
    expect(tooltip).toContain("tutor a copper");
    const electrumTooltip = getCardTooltip("electrum", shelvedRuleset);
    expect(electrumTooltip).toContain("Electrum");
  });

  it("formats lapis lazuli name", () => {
    const tooltip = getCardTooltip("lapis_lazuli", ancientRuleset);
    expect(tooltip).toContain("Lapis Lazuli");
  });

  it("includes foundry dig, tutor, and substitution notes", () => {
    const prospectorTooltip = getCardTooltip("prospector", foundryRuleset);
    expect(prospectorTooltip).toContain("dig until non bronze");
    const alloyTooltip = getCardTooltip("alloy", foundryRuleset);
    expect(alloyTooltip).toContain("1 bronze or 1 silver");
    const assayerTooltip = getCardTooltip("assayer", foundryRuleset);
    expect(assayerTooltip).toContain("tutor prospector/alloy/smelter/refiner");
  });

  it("includes minted substitution notes", () => {
    const tooltip = getCardTooltip("ingot", mintedRuleset);
    expect(tooltip).toContain("Ingot");
    expect(tooltip).toContain("3 bronze");
  });

  it("includes mint and hallmark trades", () => {
    const mintTooltip = getCardTooltip("mint", mintedRuleset);
    expect(mintTooltip).toContain("tutor ingot/sterling/ledger");
    const hallmarkTooltip = getCardTooltip("hallmark", mintedRuleset);
    expect(hallmarkTooltip).toContain("archive ingot/sterling/mint");
  });

  it("includes mystic effect text and once-per-turn note", () => {
    const pearlTooltip = getCardTooltip("pearl", mysticRuleset);
    expect(pearlTooltip).toContain("gain +1 play this turn");
    expect(pearlTooltip).toContain("once per turn");
    const emberTooltip = getCardTooltip("ember", mysticRuleset);
    expect(emberTooltip).toContain("opponent cannot make trades next turn");
  });
});
