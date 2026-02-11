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
      cpuMode: makeButton("cpuMode"),
      onlineMode: makeButton("onlineMode"),
      formatCore: makeButton("formatCore"),
      formatExpanded: makeButton("formatExpanded"),
      formatUltra: makeButton("formatUltra"),
      cpuEasy: makeButton("cpuEasy"),
      cpuMedium: makeButton("cpuMedium"),
      cpuHard: makeButton("cpuHard"),
      hostFormatCore: makeButton("hostFormatCore"),
      hostFormatExpanded: makeButton("hostFormatExpanded"),
      hostFormatUltra: makeButton("hostFormatUltra"),
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
      tradeGems: makeButton("tradeGems"),
      tradePlatinum: makeButton("tradePlatinum"),
      tradeCopperTin: makeButton("tradeCopperTin"),
      tradeCopperZinc: makeButton("tradeCopperZinc"),
      tradeBrass: makeButton("tradeBrass"),
      endTurn: makeButton("endTurn"),
      undoPlays: makeButton("undoPlays"),
      restartGame: makeButton("restartGame"),
      restartGameModal: makeButton("restartGameModal"),
      confirmArchive: makeButton("confirmArchive"),
      cancelArchive: makeButton("cancelArchive"),
      startTurn: makeButton("startTurn"),
      cpuTurnConfirm: makeButton("cpuTurnConfirm"),
      woodConfirm: makeButton("woodConfirm"),
      woodCancel: makeButton("woodCancel"),
      gemTutorConfirm: makeButton("gemTutorConfirm"),
      gemTutorCancel: makeButton("gemTutorCancel"),
      choiceCostConfirm: makeButton("choiceCostConfirm"),
      choiceCostCancel: makeButton("choiceCostCancel"),
      copperTutorConfirm: makeButton("copperTutorConfirm"),
      copperTutorCancel: makeButton("copperTutorCancel"),
    };

    const handlers = {
      selectOfflineMode: vi.fn(),
      selectCpuMode: vi.fn(),
      selectOnlineMode: vi.fn(),
      selectCoreFormat: vi.fn(),
      selectExpandedFormat: vi.fn(),
      selectUltraFormat: vi.fn(),
      selectCpuEasy: vi.fn(),
      selectCpuMedium: vi.fn(),
      selectCpuHard: vi.fn(),
      selectHostFormatCore: vi.fn(),
      selectHostFormatExpanded: vi.fn(),
      selectHostFormatUltra: vi.fn(),
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
      closeCpuSummary: vi.fn(),
      confirmWoodSubstitution: vi.fn(),
      cancelWoodSubstitution: vi.fn(),
      confirmGemTutor: vi.fn(),
      cancelGemTutor: vi.fn(),
      confirmChoiceCost: vi.fn(),
      cancelChoiceCost: vi.fn(),
      confirmCopperTutor: vi.fn(),
      cancelCopperTutor: vi.fn(),
    };

    wireEvents(elements, handlers);

    elements.offlineMode.click();
    elements.cpuMode.click();
    elements.onlineMode.click();
    elements.formatCore.click();
    elements.formatExpanded.click();
    elements.formatUltra.click();
    elements.cpuEasy.click();
    elements.cpuMedium.click();
    elements.cpuHard.click();
    elements.hostFormatCore.click();
    elements.hostFormatExpanded.click();
    elements.hostFormatUltra.click();
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
    elements.tradeGems.click();
    elements.tradePlatinum.click();
    elements.tradeCopperTin.click();
    elements.tradeCopperZinc.click();
    elements.tradeBrass.click();
    elements.endTurn.click();
    elements.undoPlays.click();
    elements.restartGame.click();
    elements.restartGameModal.click();
    elements.confirmArchive.click();
    elements.cancelArchive.click();
    elements.startTurn.click();
    elements.cpuTurnConfirm.click();
    elements.woodConfirm.click();
    elements.woodCancel.click();
    elements.gemTutorConfirm.click();
    elements.gemTutorCancel.click();
    elements.choiceCostConfirm.click();
    elements.choiceCostCancel.click();
    elements.copperTutorConfirm.click();
    elements.copperTutorCancel.click();

    expect(handlers.selectOfflineMode).toHaveBeenCalled();
    expect(handlers.selectCpuMode).toHaveBeenCalled();
    expect(handlers.selectOnlineMode).toHaveBeenCalled();
    expect(handlers.selectCoreFormat).toHaveBeenCalled();
    expect(handlers.selectExpandedFormat).toHaveBeenCalled();
    expect(handlers.selectUltraFormat).toHaveBeenCalled();
    expect(handlers.selectCpuEasy).toHaveBeenCalled();
    expect(handlers.selectCpuMedium).toHaveBeenCalled();
    expect(handlers.selectCpuHard).toHaveBeenCalled();
    expect(handlers.selectHostFormatCore).toHaveBeenCalled();
    expect(handlers.selectHostFormatExpanded).toHaveBeenCalled();
    expect(handlers.selectHostFormatUltra).toHaveBeenCalled();
    expect(handlers.chooseCreate).toHaveBeenCalled();
    expect(handlers.chooseJoin).toHaveBeenCalled();
    expect(handlers.backToChoice).toHaveBeenCalled();
    expect(handlers.createRoom).toHaveBeenCalled();
    expect(handlers.joinRoom).toHaveBeenCalled();
    expect(handlers.readyUp).toHaveBeenCalled();
    expect(handlers.copyRoomCode).toHaveBeenCalled();
    expect(handlers.trade).toHaveBeenCalledWith("trade_bronze");
    expect(handlers.trade).toHaveBeenCalledWith("trade_silver");
    expect(handlers.trade).toHaveBeenCalledWith("trade_gem_set");
    expect(handlers.trade).toHaveBeenCalledWith("trade_platinum");
    expect(handlers.trade).toHaveBeenCalledWith("trade_copper_tin");
    expect(handlers.trade).toHaveBeenCalledWith("trade_copper_zinc");
    expect(handlers.trade).toHaveBeenCalledWith("trade_brass_draw");
    expect(handlers.endTurn).toHaveBeenCalled();
    expect(handlers.returnAllCards).toHaveBeenCalled();
    expect(handlers.resetGame).toHaveBeenCalledTimes(2);
    expect(handlers.confirmArchive).toHaveBeenCalled();
    expect(handlers.cancelArchive).toHaveBeenCalled();
    expect(handlers.startTurn).toHaveBeenCalled();
    expect(handlers.closeCpuSummary).toHaveBeenCalled();
    expect(handlers.confirmWoodSubstitution).toHaveBeenCalled();
    expect(handlers.cancelWoodSubstitution).toHaveBeenCalled();
    expect(handlers.confirmGemTutor).toHaveBeenCalled();
    expect(handlers.cancelGemTutor).toHaveBeenCalled();
    expect(handlers.confirmChoiceCost).toHaveBeenCalled();
    expect(handlers.cancelChoiceCost).toHaveBeenCalled();
    expect(handlers.confirmCopperTutor).toHaveBeenCalled();
    expect(handlers.cancelCopperTutor).toHaveBeenCalled();
  });
});
