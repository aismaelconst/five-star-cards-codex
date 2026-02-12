export function updateWinnerOverlay(state, elements, playerIndex) {
  const name = state.players?.[playerIndex]?.name ?? `Player ${playerIndex + 1}`;
  const deckRemaining = state.players?.[playerIndex]?.deck?.length ?? 0;
  const turnCount = state.turnCount ?? 0;

  if (elements.winnerText) elements.winnerText.textContent = `${name} wins!`;
  if (elements.winnerModalText) elements.winnerModalText.textContent = `${name} wins!`;
  if (elements.winnerModalMessage) {
    elements.winnerModalMessage.textContent = "Great run. Ready for a rematch?";
  }
  if (elements.winnerStats) {
    elements.winnerStats.innerHTML = `<span>Deck left: ${deckRemaining}</span><span>Turn: ${turnCount}</span>`;
  }
  if (elements.restartGameModal) elements.restartGameModal.hidden = false;
  if (elements.winnerOverlay) elements.winnerOverlay.hidden = false;
}
