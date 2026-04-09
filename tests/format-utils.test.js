import { describe, it, expect } from "vitest";
import { formatLabel, updateCpuFormatButtons, updateFormatButtons } from "../src/ui/handlers/format-utils.js";

describe("format-utils", () => {
  it("formats labels for formats", () => {
    expect(formatLabel("expanded")).toBe("GILDED GEMS");
    expect(formatLabel("ancient")).toBe("ANCIENT");
    expect(formatLabel("mystic")).toBe("MYSTIC");
    expect(formatLabel("foundry")).toBe("FOUNDRY");
    expect(formatLabel("core")).toBe("CORE");
  });

  it("updates format button states", () => {
    const makeButton = () => document.createElement("button");
    const elements = {
      formatCore: makeButton(),
      formatExpanded: makeButton(),
      formatAncient: makeButton(),
      formatMystic: makeButton(),
      formatFoundry: makeButton(),
      hostFormatCore: makeButton(),
      hostFormatExpanded: makeButton(),
      hostFormatAncient: makeButton(),
      hostFormatMystic: makeButton(),
      hostFormatFoundry: makeButton(),
    };
    const state = { format: "foundry" };

    updateFormatButtons(state, elements);

    expect(elements.formatFoundry.classList.contains("active")).toBe(true);
    expect(elements.formatCore.classList.contains("active")).toBe(false);
    expect(elements.hostFormatFoundry.classList.contains("active")).toBe(true);
  });

  it("updates cpu format button states without disabling mirrors", () => {
    const makeButton = () => document.createElement("button");
    const elements = {
      cpuFormatCore: makeButton(),
      cpuFormatExpanded: makeButton(),
      cpuFormatAncient: makeButton(),
      cpuFormatMystic: makeButton(),
      cpuFormatFoundry: makeButton(),
      cpuFormatRandom: makeButton(),
    };
    const state = {
      format: "core",
      cpu: { opponentFormatSelection: "core", opponentFormat: null },
    };

    updateCpuFormatButtons(state, elements);

    expect(elements.cpuFormatCore.classList.contains("active")).toBe(true);
    expect(elements.cpuFormatCore.disabled).toBe(false);

    state.cpu.opponentFormatSelection = "random_any";
    updateCpuFormatButtons(state, elements);

    expect(elements.cpuFormatRandom.classList.contains("active")).toBe(true);
  });
});
