export function wireEvents(elements, handlers) {
  elements.offlineMode.addEventListener("click", handlers.selectOfflineMode);
  elements.onlineMode.addEventListener("click", handlers.selectOnlineMode);
  if (elements.formatCore) {
    elements.formatCore.addEventListener("click", handlers.selectCoreFormat);
  }
  if (elements.formatExpanded) {
    elements.formatExpanded.addEventListener("click", handlers.selectExpandedFormat);
  }
  if (elements.hostFormatCore) {
    elements.hostFormatCore.addEventListener("click", handlers.selectHostFormatCore);
  }
  if (elements.hostFormatExpanded) {
    elements.hostFormatExpanded.addEventListener("click", handlers.selectHostFormatExpanded);
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
  elements.endTurn.addEventListener("click", handlers.endTurn);
  elements.undoPlays.addEventListener("click", handlers.returnAllCards);
  elements.restartGame.addEventListener("click", handlers.resetGame);
  elements.restartGameModal.addEventListener("click", handlers.resetGame);
  elements.confirmArchive.addEventListener("click", handlers.confirmArchive);
  elements.cancelArchive.addEventListener("click", handlers.cancelArchive);
  elements.startTurn.addEventListener("click", handlers.startTurn);
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
}
