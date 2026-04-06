export function wireEvents(elements, handlers) {
  if (elements.themeClassic) {
    elements.themeClassic.addEventListener("click", handlers.selectClassicTheme);
  }
  if (elements.themePixel) {
    elements.themePixel.addEventListener("click", handlers.selectPixelTheme);
  }
  if (elements.motionToggle) {
    elements.motionToggle.addEventListener("click", handlers.toggleMotionMode);
  }
  if (elements.openHowToPlay) {
    elements.openHowToPlay.addEventListener("click", handlers.openHowToPlay);
  }
  if (elements.closeHowToPlay) {
    elements.closeHowToPlay.addEventListener("click", handlers.closeHowToPlay);
  }
  if (elements.openTradesModal) {
    elements.openTradesModal.addEventListener("click", handlers.openTradesModal);
  }
  if (elements.closeTradesModal) {
    elements.closeTradesModal.addEventListener("click", handlers.closeTradesModal);
  }
  elements.offlineMode.addEventListener("click", handlers.selectOfflineMode);
  if (elements.cpuMode) {
    elements.cpuMode.addEventListener("click", handlers.selectCpuMode);
  }
  if (elements.formatCore) {
    elements.formatCore.addEventListener("click", handlers.selectCoreFormat);
  }
  if (elements.formatExpanded) {
    elements.formatExpanded.addEventListener("click", handlers.selectExpandedFormat);
  }
  if (elements.formatAncient) {
    elements.formatAncient.addEventListener("click", handlers.selectAncientFormat);
  }
  if (elements.formatMystic) {
    elements.formatMystic.addEventListener("click", handlers.selectMysticFormat);
  }
  if (elements.formatFoundry) {
    elements.formatFoundry.addEventListener("click", handlers.selectFoundryFormat);
  }
  if (elements.cpuFormatCore) {
    elements.cpuFormatCore.addEventListener("click", handlers.selectCpuFormatCore);
  }
  if (elements.cpuFormatExpanded) {
    elements.cpuFormatExpanded.addEventListener("click", handlers.selectCpuFormatExpanded);
  }
  if (elements.cpuFormatAncient) {
    elements.cpuFormatAncient.addEventListener("click", handlers.selectCpuFormatAncient);
  }
  if (elements.cpuFormatMystic) {
    elements.cpuFormatMystic.addEventListener("click", handlers.selectCpuFormatMystic);
  }
  if (elements.cpuFormatFoundry) {
    elements.cpuFormatFoundry.addEventListener("click", handlers.selectCpuFormatFoundry);
  }
  if (elements.cpuFormatRandom) {
    elements.cpuFormatRandom.addEventListener("click", handlers.selectCpuFormatRandom);
  }
  if (elements.cpuEasy) {
    elements.cpuEasy.addEventListener("click", handlers.selectCpuEasy);
  }
  if (elements.cpuMedium) {
    elements.cpuMedium.addEventListener("click", handlers.selectCpuMedium);
  }
  if (elements.cpuHard) {
    elements.cpuHard.addEventListener("click", handlers.selectCpuHard);
  }
  if (elements.hostFormatCore) {
    elements.hostFormatCore.addEventListener("click", handlers.selectHostFormatCore);
  }
  if (elements.hostFormatExpanded) {
    elements.hostFormatExpanded.addEventListener("click", handlers.selectHostFormatExpanded);
  }
  if (elements.hostFormatAncient) {
    elements.hostFormatAncient.addEventListener("click", handlers.selectHostFormatAncient);
  }
  if (elements.hostFormatMystic) {
    elements.hostFormatMystic.addEventListener("click", handlers.selectHostFormatMystic);
  }
  if (elements.hostFormatFoundry) {
    elements.hostFormatFoundry.addEventListener("click", handlers.selectHostFormatFoundry);
  }
  elements.chooseCreate.addEventListener("click", handlers.chooseCreate);
  elements.chooseJoin.addEventListener("click", handlers.chooseJoin);
  elements.backToChoiceHost.addEventListener("click", handlers.backToChoice);
  elements.backToChoiceGuest.addEventListener("click", handlers.backToChoice);
  elements.createRoom.addEventListener("click", handlers.createRoom);
  elements.joinRoom.addEventListener("click", handlers.joinRoom);
  elements.readyButton.addEventListener("click", handlers.readyUp);
  elements.readyButtonGuest.addEventListener("click", handlers.readyUp);
  elements.copyRoomCode.addEventListener("click", handlers.copyRoomCode);
  elements.tradeBronze.addEventListener("click", () => handlers.trade("trade_bronze"));
  elements.tradeSilver.addEventListener("click", () => handlers.trade("trade_silver"));
  if (elements.tradeProspector) {
    elements.tradeProspector.addEventListener("click", () => handlers.trade("trade_prospector"));
  }
  if (elements.tradeAssayer) {
    elements.tradeAssayer.addEventListener("click", () => handlers.trade("trade_assayer"));
  }
  if (elements.tradeSmelter) {
    elements.tradeSmelter.addEventListener("click", () => handlers.trade("trade_smelter"));
  }
  if (elements.tradeRefiner) {
    elements.tradeRefiner.addEventListener("click", () => handlers.trade("trade_refiner"));
  }
  if (elements.tradeGems) {
    elements.tradeGems.addEventListener("click", () => handlers.trade("trade_gem_set"));
  }
  if (elements.tradePlatinum) {
    elements.tradePlatinum.addEventListener("click", () => handlers.trade("trade_platinum"));
  }
  if (elements.tradeAncientsArchive) {
    elements.tradeAncientsArchive.addEventListener(
      "click",
      () => handlers.trade("trade_ancients_archive")
    );
  }
  if (elements.tradePearl) {
    elements.tradePearl.addEventListener("click", () => handlers.trade("trade_pearl"));
  }
  if (elements.tradeObsidian) {
    elements.tradeObsidian.addEventListener("click", () => handlers.trade("trade_obsidian"));
  }
  if (elements.tradeAmethyst) {
    elements.tradeAmethyst.addEventListener("click", () => handlers.trade("trade_amethyst"));
  }
  if (elements.tradeAsh) {
    elements.tradeAsh.addEventListener("click", () => handlers.trade("trade_ash"));
  }
  if (elements.tradeEmber) {
    elements.tradeEmber.addEventListener("click", () => handlers.trade("trade_ember"));
  }
  elements.endTurn.addEventListener("click", handlers.endTurn);
  elements.undoPlays.addEventListener("click", handlers.returnAllCards);
  elements.restartGame.addEventListener("click", handlers.resetGame);
  elements.restartGameModal.addEventListener("click", handlers.resetGame);
  elements.confirmArchive.addEventListener("click", handlers.confirmArchive);
  elements.cancelArchive.addEventListener("click", handlers.cancelArchive);
  elements.startTurn.addEventListener("click", handlers.startTurn);
  if (elements.cpuTurnConfirm) {
    elements.cpuTurnConfirm.addEventListener("click", handlers.closeCpuSummary);
  }
  if (elements.woodConfirm) {
    elements.woodConfirm.addEventListener("click", handlers.confirmWoodSubstitution);
  }
  if (elements.woodCancel) {
    elements.woodCancel.addEventListener("click", handlers.cancelWoodSubstitution);
  }
  if (elements.efficiencyConfirm) {
    elements.efficiencyConfirm.addEventListener("click", handlers.confirmEfficiencyChoice);
  }
  if (elements.efficiencyCancel) {
    elements.efficiencyCancel.addEventListener("click", handlers.cancelEfficiencyChoice);
  }
  if (elements.gemTutorConfirm) {
    elements.gemTutorConfirm.addEventListener("click", handlers.confirmGemTutor);
  }
  if (elements.gemTutorCancel) {
    elements.gemTutorCancel.addEventListener("click", handlers.cancelGemTutor);
  }
  if (elements.choiceCostConfirm) {
    elements.choiceCostConfirm.addEventListener("click", handlers.confirmChoiceCost);
  }
  if (elements.choiceCostCancel) {
    elements.choiceCostCancel.addEventListener("click", handlers.cancelChoiceCost);
  }
  if (elements.poolCostConfirm) {
    elements.poolCostConfirm.addEventListener("click", handlers.confirmPoolCost);
  }
  if (elements.poolCostCancel) {
    elements.poolCostCancel.addEventListener("click", handlers.cancelPoolCost);
  }
  if (elements.archiveTutorConfirm) {
    elements.archiveTutorConfirm.addEventListener("click", handlers.confirmArchiveTutor);
  }
  if (elements.archiveTutorCancel) {
    elements.archiveTutorCancel.addEventListener("click", handlers.cancelArchiveTutor);
  }
  if (elements.handArchiveConfirm) {
    elements.handArchiveConfirm.addEventListener("click", handlers.confirmHandArchive);
  }
  if (elements.handArchiveCancel) {
    elements.handArchiveCancel.addEventListener("click", handlers.cancelHandArchive);
  }
  if (elements.turnReplayClose) {
    elements.turnReplayClose.addEventListener("click", handlers.closeTurnReplay);
  }
  if (elements.archiveInspectClose) {
    elements.archiveInspectClose.addEventListener("click", handlers.closeArchiveInspect);
  }
}
