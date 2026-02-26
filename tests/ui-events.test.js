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
      themeClassic: makeButton("themeClassic"),
      themePixel: makeButton("themePixel"),
      motionToggle: makeButton("motionToggle"),
      formatCore: makeButton("formatCore"),
      formatExpanded: makeButton("formatExpanded"),
      formatAncient: makeButton("formatAncient"),
      formatMystic: makeButton("formatMystic"),
      cpuEasy: makeButton("cpuEasy"),
      cpuMedium: makeButton("cpuMedium"),
      cpuHard: makeButton("cpuHard"),
      hostFormatCore: makeButton("hostFormatCore"),
      hostFormatExpanded: makeButton("hostFormatExpanded"),
      hostFormatAncient: makeButton("hostFormatAncient"),
      hostFormatMystic: makeButton("hostFormatMystic"),
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
      tradeAncientsArchive: makeButton("tradeAncientsArchive"),
      tradePearl: makeButton("tradePearl"),
      tradeObsidian: makeButton("tradeObsidian"),
      tradeAmethyst: makeButton("tradeAmethyst"),
      tradeAsh: makeButton("tradeAsh"),
      tradeEmber: makeButton("tradeEmber"),
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
      efficiencyConfirm: makeButton("efficiencyConfirm"),
      efficiencyCancel: makeButton("efficiencyCancel"),
      gemTutorConfirm: makeButton("gemTutorConfirm"),
      gemTutorCancel: makeButton("gemTutorCancel"),
      choiceCostConfirm: makeButton("choiceCostConfirm"),
      choiceCostCancel: makeButton("choiceCostCancel"),
      poolCostConfirm: makeButton("poolCostConfirm"),
      poolCostCancel: makeButton("poolCostCancel"),
      archiveTutorConfirm: makeButton("archiveTutorConfirm"),
      archiveTutorCancel: makeButton("archiveTutorCancel"),
      handArchiveConfirm: makeButton("handArchiveConfirm"),
      handArchiveCancel: makeButton("handArchiveCancel"),
      turnReplayClose: makeButton("turnReplayClose"),
      archiveInspectClose: makeButton("archiveInspectClose"),
    };

    const handlers = {
      selectOfflineMode: vi.fn(),
      selectCpuMode: vi.fn(),
      selectOnlineMode: vi.fn(),
      selectClassicTheme: vi.fn(),
      selectPixelTheme: vi.fn(),
      toggleMotionMode: vi.fn(),
      selectCoreFormat: vi.fn(),
      selectExpandedFormat: vi.fn(),
      selectAncientFormat: vi.fn(),
      selectMysticFormat: vi.fn(),
      selectCpuEasy: vi.fn(),
      selectCpuMedium: vi.fn(),
      selectCpuHard: vi.fn(),
      selectHostFormatCore: vi.fn(),
      selectHostFormatExpanded: vi.fn(),
      selectHostFormatAncient: vi.fn(),
      selectHostFormatMystic: vi.fn(),
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
      confirmEfficiencyChoice: vi.fn(),
      cancelEfficiencyChoice: vi.fn(),
      confirmGemTutor: vi.fn(),
      cancelGemTutor: vi.fn(),
      confirmChoiceCost: vi.fn(),
      cancelChoiceCost: vi.fn(),
      confirmPoolCost: vi.fn(),
      cancelPoolCost: vi.fn(),
      confirmArchiveTutor: vi.fn(),
      cancelArchiveTutor: vi.fn(),
      confirmHandArchive: vi.fn(),
      cancelHandArchive: vi.fn(),
      closeTurnReplay: vi.fn(),
      closeArchiveInspect: vi.fn(),
    };

    wireEvents(elements, handlers);

    elements.offlineMode.click();
    elements.cpuMode.click();
    elements.onlineMode.click();
    elements.themeClassic.click();
    elements.themePixel.click();
    elements.motionToggle.click();
    elements.formatCore.click();
    elements.formatExpanded.click();
    elements.formatAncient.click();
    elements.formatMystic.click();
    elements.cpuEasy.click();
    elements.cpuMedium.click();
    elements.cpuHard.click();
    elements.hostFormatCore.click();
    elements.hostFormatExpanded.click();
    elements.hostFormatAncient.click();
    elements.hostFormatMystic.click();
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
    elements.tradeAncientsArchive.click();
    elements.tradePearl.click();
    elements.tradeObsidian.click();
    elements.tradeAmethyst.click();
    elements.tradeAsh.click();
    elements.tradeEmber.click();
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
    elements.efficiencyConfirm.click();
    elements.efficiencyCancel.click();
    elements.gemTutorConfirm.click();
    elements.gemTutorCancel.click();
    elements.choiceCostConfirm.click();
    elements.choiceCostCancel.click();
    elements.poolCostConfirm.click();
    elements.poolCostCancel.click();
    elements.archiveTutorConfirm.click();
    elements.archiveTutorCancel.click();
    elements.handArchiveConfirm.click();
    elements.handArchiveCancel.click();
    elements.turnReplayClose.click();
    elements.archiveInspectClose.click();

    expect(handlers.selectOfflineMode).toHaveBeenCalled();
    expect(handlers.selectCpuMode).toHaveBeenCalled();
    expect(handlers.selectOnlineMode).toHaveBeenCalled();
    expect(handlers.selectClassicTheme).toHaveBeenCalled();
    expect(handlers.selectPixelTheme).toHaveBeenCalled();
    expect(handlers.toggleMotionMode).toHaveBeenCalled();
    expect(handlers.selectCoreFormat).toHaveBeenCalled();
    expect(handlers.selectExpandedFormat).toHaveBeenCalled();
    expect(handlers.selectAncientFormat).toHaveBeenCalled();
    expect(handlers.selectMysticFormat).toHaveBeenCalled();
    expect(handlers.selectCpuEasy).toHaveBeenCalled();
    expect(handlers.selectCpuMedium).toHaveBeenCalled();
    expect(handlers.selectCpuHard).toHaveBeenCalled();
    expect(handlers.selectHostFormatCore).toHaveBeenCalled();
    expect(handlers.selectHostFormatExpanded).toHaveBeenCalled();
    expect(handlers.selectHostFormatAncient).toHaveBeenCalled();
    expect(handlers.selectHostFormatMystic).toHaveBeenCalled();
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
    expect(handlers.trade).toHaveBeenCalledWith("trade_ancients_archive");
    expect(handlers.trade).toHaveBeenCalledWith("trade_pearl");
    expect(handlers.trade).toHaveBeenCalledWith("trade_obsidian");
    expect(handlers.trade).toHaveBeenCalledWith("trade_amethyst");
    expect(handlers.trade).toHaveBeenCalledWith("trade_ash");
    expect(handlers.trade).toHaveBeenCalledWith("trade_ember");
    expect(handlers.endTurn).toHaveBeenCalled();
    expect(handlers.returnAllCards).toHaveBeenCalled();
    expect(handlers.resetGame).toHaveBeenCalledTimes(2);
    expect(handlers.confirmArchive).toHaveBeenCalled();
    expect(handlers.cancelArchive).toHaveBeenCalled();
    expect(handlers.startTurn).toHaveBeenCalled();
    expect(handlers.closeCpuSummary).toHaveBeenCalled();
    expect(handlers.confirmWoodSubstitution).toHaveBeenCalled();
    expect(handlers.cancelWoodSubstitution).toHaveBeenCalled();
    expect(handlers.confirmEfficiencyChoice).toHaveBeenCalled();
    expect(handlers.cancelEfficiencyChoice).toHaveBeenCalled();
    expect(handlers.confirmGemTutor).toHaveBeenCalled();
    expect(handlers.cancelGemTutor).toHaveBeenCalled();
    expect(handlers.confirmChoiceCost).toHaveBeenCalled();
    expect(handlers.cancelChoiceCost).toHaveBeenCalled();
    expect(handlers.confirmPoolCost).toHaveBeenCalled();
    expect(handlers.cancelPoolCost).toHaveBeenCalled();
    expect(handlers.confirmArchiveTutor).toHaveBeenCalled();
    expect(handlers.cancelArchiveTutor).toHaveBeenCalled();
    expect(handlers.confirmHandArchive).toHaveBeenCalled();
    expect(handlers.cancelHandArchive).toHaveBeenCalled();
    expect(handlers.closeTurnReplay).toHaveBeenCalled();
    expect(handlers.closeArchiveInspect).toHaveBeenCalled();
  });
});
