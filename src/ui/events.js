export function wireEvents(elements, handlers) {
  elements.offlineMode.addEventListener("click", handlers.selectOfflineMode);
  if (elements.cpuMode) {
    elements.cpuMode.addEventListener("click", handlers.selectCpuMode);
  }
  elements.onlineMode.addEventListener("click", handlers.selectOnlineMode);
  if (elements.formatCore) {
    elements.formatCore.addEventListener("click", handlers.selectCoreFormat);
  }
  if (elements.formatExpanded) {
    elements.formatExpanded.addEventListener("click", handlers.selectExpandedFormat);
  }
  if (elements.formatAncient) {
    elements.formatAncient.addEventListener("click", handlers.selectAncientFormat);
  }
  if (elements.formatAncientExpanded) {
    elements.formatAncientExpanded.addEventListener("click", handlers.selectAncientExpandedFormat);
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
  if (elements.hostFormatAncientExpanded) {
    elements.hostFormatAncientExpanded.addEventListener(
      "click",
      handlers.selectHostFormatAncientExpanded
    );
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
  if (elements.tradeElectrumDraw) {
    elements.tradeElectrumDraw.addEventListener(
      "click",
      () => handlers.trade("trade_electrum_draw")
    );
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
}
