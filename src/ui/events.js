export function wireEvents(elements, handlers) {
  elements.offlineMode.addEventListener("click", handlers.selectOfflineMode);
  elements.onlineMode.addEventListener("click", handlers.selectOnlineMode);
  elements.chooseCreate.addEventListener("click", handlers.chooseCreate);
  elements.chooseJoin.addEventListener("click", handlers.chooseJoin);
  elements.backToChoiceHost.addEventListener("click", handlers.backToChoice);
  elements.backToChoiceGuest.addEventListener("click", handlers.backToChoice);
  elements.createRoom.addEventListener("click", handlers.createRoom);
  elements.joinRoom.addEventListener("click", handlers.joinRoom);
  elements.readyButton.addEventListener("click", handlers.readyUp);
  elements.readyButtonGuest.addEventListener("click", handlers.readyUp);
  elements.copyRoomCode.addEventListener("click", handlers.copyRoomCode);
  elements.tradeBronze.addEventListener("click", () => handlers.trade("bronze"));
  elements.tradeSilver.addEventListener("click", () => handlers.trade("silver"));
  elements.endTurn.addEventListener("click", handlers.endTurn);
  elements.undoPlays.addEventListener("click", handlers.returnAllCards);
  elements.restartGame.addEventListener("click", handlers.resetGame);
  elements.restartGameModal.addEventListener("click", handlers.resetGame);
  elements.confirmArchive.addEventListener("click", handlers.confirmArchive);
  elements.cancelArchive.addEventListener("click", handlers.cancelArchive);
  elements.startTurn.addEventListener("click", handlers.startTurn);
}
