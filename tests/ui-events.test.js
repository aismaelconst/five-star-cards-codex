import { describe, it, expect, vi } from "vitest";
import { wireEvents } from "../src/ui/events.js";

function makeButton(id) {
  const btn = document.createElement("button");
  btn.id = id;
  return btn;
}

describe("ui/events", () => {
  it("wires buttons to handlers", () => {
    const elements = {
      offlineMode: makeButton("offlineMode"),
      onlineMode: makeButton("onlineMode"),
      createRoom: makeButton("createRoom"),
      chooseCreate: makeButton("chooseCreate"),
      chooseJoin: makeButton("chooseJoin"),
      backToChoiceHost: makeButton("backToChoiceHost"),
      backToChoiceGuest: makeButton("backToChoiceGuest"),
      joinRoom: makeButton("joinRoom"),
      readyButton: makeButton("readyButton"),
      readyButtonGuest: makeButton("readyButtonGuest"),
      copyRoomCode: makeButton("copyRoomCode"),
      tradeBronze: makeButton("tradeBronze"),
      tradeSilver: makeButton("tradeSilver"),
      endTurn: makeButton("endTurn"),
      undoPlays: makeButton("undoPlays"),
      restartGame: makeButton("restartGame"),
      restartGameModal: makeButton("restartGameModal"),
      confirmArchive: makeButton("confirmArchive"),
      cancelArchive: makeButton("cancelArchive"),
      startTurn: makeButton("startTurn"),
    };

    const handlers = {
      selectOfflineMode: vi.fn(),
      selectOnlineMode: vi.fn(),
      chooseCreate: vi.fn(),
      chooseJoin: vi.fn(),
      backToChoice: vi.fn(),
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      copyRoomCode: vi.fn(),
      readyUp: vi.fn(),
      trade: vi.fn(),
      endTurn: vi.fn(),
      returnAllCards: vi.fn(),
      resetGame: vi.fn(),
      confirmArchive: vi.fn(),
      cancelArchive: vi.fn(),
      startTurn: vi.fn(),
    };

    wireEvents(elements, handlers);

    elements.offlineMode.click();
    elements.onlineMode.click();
    elements.chooseCreate.click();
    elements.chooseJoin.click();
    elements.backToChoiceHost.click();
    elements.backToChoiceGuest.click();
    elements.createRoom.click();
    elements.joinRoom.click();
    elements.readyButton.click();
    elements.readyButtonGuest.click();
    elements.copyRoomCode.click();
    elements.tradeBronze.click();
    elements.tradeSilver.click();
    elements.endTurn.click();
    elements.undoPlays.click();
    elements.restartGame.click();
    elements.restartGameModal.click();
    elements.confirmArchive.click();
    elements.cancelArchive.click();
    elements.startTurn.click();

    expect(handlers.selectOfflineMode).toHaveBeenCalled();
    expect(handlers.selectOnlineMode).toHaveBeenCalled();
    expect(handlers.chooseCreate).toHaveBeenCalled();
    expect(handlers.chooseJoin).toHaveBeenCalled();
    expect(handlers.backToChoice).toHaveBeenCalled();
    expect(handlers.createRoom).toHaveBeenCalled();
    expect(handlers.joinRoom).toHaveBeenCalled();
    expect(handlers.readyUp).toHaveBeenCalled();
    expect(handlers.copyRoomCode).toHaveBeenCalled();
    expect(handlers.trade).toHaveBeenCalledWith("bronze");
    expect(handlers.trade).toHaveBeenCalledWith("silver");
    expect(handlers.endTurn).toHaveBeenCalled();
    expect(handlers.returnAllCards).toHaveBeenCalled();
    expect(handlers.resetGame).toHaveBeenCalledTimes(2);
    expect(handlers.confirmArchive).toHaveBeenCalled();
    expect(handlers.cancelArchive).toHaveBeenCalled();
    expect(handlers.startTurn).toHaveBeenCalled();
  });
});
