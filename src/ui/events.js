export function wireEvents(elements, handlers) {
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
