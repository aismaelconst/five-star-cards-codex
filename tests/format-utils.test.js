import { describe, it, expect } from "vitest";
import { formatLabel, updateFormatButtons } from "../src/ui/handlers/format-utils.js";

describe("format-utils", () => {
  it("formats labels for formats", () => {
    expect(formatLabel("expanded")).toBe("GEMSTONE + PLATINUM");
    expect(formatLabel("ancient")).toBe("ANCIENT");
    expect(formatLabel("ancient_expanded")).toBe("ANCIENT + GEMSTONE + PLATINUM");
    expect(formatLabel("core")).toBe("CORE");
  });

  it("updates format button states", () => {
    const makeButton = () => document.createElement("button");
    const elements = {
      formatCore: makeButton(),
      formatExpanded: makeButton(),
      formatAncient: makeButton(),
      formatAncientExpanded: makeButton(),
      hostFormatCore: makeButton(),
      hostFormatExpanded: makeButton(),
      hostFormatAncient: makeButton(),
      hostFormatAncientExpanded: makeButton(),
    };
    const state = { format: "ancient" };

    updateFormatButtons(state, elements);

    expect(elements.formatAncient.classList.contains("active")).toBe(true);
    expect(elements.formatCore.classList.contains("active")).toBe(false);
    expect(elements.hostFormatAncient.classList.contains("active")).toBe(true);
  });
});
