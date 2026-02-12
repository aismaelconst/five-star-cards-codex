import { describe, it, expect, vi } from "vitest";
import { createOnlineFlow } from "../src/ui/handlers/online-flow.js";

describe("online-flow", () => {
  it("selectOnlineMode toggles overlays and resets statuses", () => {
    const state = {
      mode: null,
      format: null,
      online: { role: null },
    };
    const elements = {
      modeOverlay: Object.assign(document.createElement("div"), { hidden: false }),
      formatOverlay: Object.assign(document.createElement("div"), { hidden: false }),
      cpuOverlay: Object.assign(document.createElement("div"), { hidden: false }),
      onlineChoiceOverlay: Object.assign(document.createElement("div"), { hidden: true }),
      hostOverlay: Object.assign(document.createElement("div"), { hidden: false }),
      guestOverlay: Object.assign(document.createElement("div"), { hidden: false }),
      hostStatus: document.createElement("div"),
      guestStatus: document.createElement("div"),
      readyButton: Object.assign(document.createElement("button"), { disabled: false }),
      readyButtonGuest: Object.assign(document.createElement("button"), { disabled: false }),
    };

    const onlineFlow = createOnlineFlow({
      state,
      elements,
      clientFactory: vi.fn(),
      socketUrl: "ws://test",
      render: vi.fn(),
      showConfirmOverlay: vi.fn(),
      isMyTurn: vi.fn(),
      formatLabel: vi.fn(),
      updateFormatButtons: vi.fn(),
      formatPoolCostLine: vi.fn(),
      formatPlatinumMessage: vi.fn(),
      onWinner: vi.fn(),
      showActionToast: vi.fn(),
      returnToModeSelect: vi.fn(),
    });

    onlineFlow.selectOnlineMode();

    expect(state.mode).toBe("online");
    expect(elements.modeOverlay.hidden).toBe(true);
    expect(elements.onlineChoiceOverlay.hidden).toBe(false);
    expect(elements.hostOverlay.hidden).toBe(true);
    expect(elements.guestOverlay.hidden).toBe(true);
    expect(elements.readyButton.disabled).toBe(true);
    expect(elements.readyButtonGuest.disabled).toBe(true);
    expect(elements.hostStatus.textContent).toBe("");
    expect(elements.guestStatus.textContent).toBe("");
  });
});
