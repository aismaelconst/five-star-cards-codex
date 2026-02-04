import { describe, it, expect, vi } from "vitest";
import { createHandlers } from "../src/ui/handlers.js";
import { createInitialState } from "../src/game/state.js";

vi.mock("../src/ui/render.js", () => ({
  renderApp: vi.fn(),
  showConfirmOverlay: vi.fn(),
  showTurnOverlay: vi.fn(),
}));

function makeElements() {
  return {
    confirmOverlay: document.createElement("div"),
    turnOverlay: document.createElement("div"),
    winnerPanel: document.createElement("div"),
    winnerOverlay: document.createElement("div"),
    confirmSummary: document.createElement("div"),
    confirmCards: document.createElement("div"),
    modeOverlay: document.createElement("div"),
    onlineChoiceOverlay: document.createElement("div"),
    hostOverlay: document.createElement("div"),
    guestOverlay: document.createElement("div"),
    playerNameInput: Object.assign(document.createElement("input"), { value: "" }),
    roomCodeInput: Object.assign(document.createElement("input"), { value: "" }),
    guestNameInput: Object.assign(document.createElement("input"), { value: "" }),
    guestRoomCodeInput: Object.assign(document.createElement("input"), { value: "" }),
    readyButton: document.createElement("button"),
    readyButtonGuest: document.createElement("button"),
    chooseCreate: document.createElement("button"),
    chooseJoin: document.createElement("button"),
    hostStatus: document.createElement("div"),
    guestStatus: document.createElement("div"),
    backToChoiceHost: document.createElement("button"),
    backToChoiceGuest: document.createElement("button"),
    copyRoomCode: document.createElement("button"),
  };
}

describe("online server authority", () => {
  it("does not mutate local state in online mode", () => {
    const state = createInitialState({ mode: "online" });
    const elements = makeElements();
    let sendSpy;

    const handlers = createHandlers(state, elements, vi.fn(), {
      clientFactory: () => ({
        connect: vi.fn(),
        send: (payload) => {
          sendSpy = payload;
          return true;
        },
      }),
    });

    state.online.roomId = "ROOM";
    state.online.playerId = "P1";
    state.online.role = "host";
    state.players[0].hand = ["bronze"];

    handlers.playCard(0);

    expect(state.players[0].hand.length).toBe(1);
    expect(sendSpy?.type).toBe("action");
  });
});
