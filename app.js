import { createInitialState } from "./src/game/state.js";
import { wireEvents } from "./src/ui/events.js";
import { createHandlers } from "./src/ui/handlers.js";


const state = createInitialState();

const elements = {
  turnIndicator: document.getElementById("turnIndicator"),
  turnCounter: document.getElementById("turnCounter"),
  opponentSummary: document.getElementById("opponentSummary"),
  opponentAlert: document.getElementById("opponentAlert"),
  archiveCounts: document.getElementById("archiveCounts"),
  handCounts: document.getElementById("handCounts"),
  archivePile: document.getElementById("archivePile"),
  activeCards: document.getElementById("activeCards"),
  handCards: document.getElementById("handCards"),
  tradeInfo: document.getElementById("tradeInfo"),
  deckInfo: document.getElementById("deckInfo"),
  discardInfo: document.getElementById("discardInfo"),
  tradeBronze: document.getElementById("tradeBronze"),
  tradeSilver: document.getElementById("tradeSilver"),
  tradeGems: document.getElementById("tradeGems"),
  tradePlatinum: document.getElementById("tradePlatinum"),
  tradeAncientsArchive: document.getElementById("tradeAncientsArchive"),
  tradeElectrumDraw: document.getElementById("tradeElectrumDraw"),
  endTurn: document.getElementById("endTurn"),
  undoPlays: document.getElementById("undoPlays"),
  winnerPanel: document.getElementById("winnerPanel"),
  winnerText: document.getElementById("winnerText"),
  restartGame: document.getElementById("restartGame"),
  debugInfo: document.getElementById("debugInfo"),
  winnerOverlay: document.getElementById("winnerOverlay"),
  winnerModalText: document.getElementById("winnerModalText"),
  winnerModalMessage: document.getElementById("winnerModalMessage"),
  restartGameModal: document.getElementById("restartGameModal"),
  confirmOverlay: document.getElementById("confirmOverlay"),
  confirmSummary: document.getElementById("confirmSummary"),
  confirmCards: document.getElementById("confirmCards"),
  cancelArchive: document.getElementById("cancelArchive"),
  confirmArchive: document.getElementById("confirmArchive"),
  turnOverlay: document.getElementById("turnOverlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  startTurn: document.getElementById("startTurn"),
  cpuTurnOverlay: document.getElementById("cpuTurnOverlay"),
  cpuTurnSummary: document.getElementById("cpuTurnSummary"),
  cpuTurnConfirm: document.getElementById("cpuTurnConfirm"),
  modeOverlay: document.getElementById("modeOverlay"),
  offlineMode: document.getElementById("offlineMode"),
  cpuMode: document.getElementById("cpuMode"),
  onlineMode: document.getElementById("onlineMode"),
  formatOverlay: document.getElementById("formatOverlay"),
  formatCore: document.getElementById("formatCore"),
  formatExpanded: document.getElementById("formatExpanded"),
  formatAncient: document.getElementById("formatAncient"),
  formatAncientExpanded: document.getElementById("formatAncientExpanded"),
  cpuOverlay: document.getElementById("cpuOverlay"),
  cpuEasy: document.getElementById("cpuEasy"),
  cpuMedium: document.getElementById("cpuMedium"),
  cpuHard: document.getElementById("cpuHard"),
  onlineChoiceOverlay: document.getElementById("onlineChoiceOverlay"),
  hostOverlay: document.getElementById("hostOverlay"),
  guestOverlay: document.getElementById("guestOverlay"),
  hostFormatCore: document.getElementById("hostFormatCore"),
  hostFormatExpanded: document.getElementById("hostFormatExpanded"),
  hostFormatAncient: document.getElementById("hostFormatAncient"),
  hostFormatAncientExpanded: document.getElementById("hostFormatAncientExpanded"),
  playerNameInput: document.getElementById("playerNameInput"),
  roomCodeInput: document.getElementById("roomCodeInput"),
  copyRoomCode: document.getElementById("copyRoomCode"),
  createRoom: document.getElementById("createRoom"),
  chooseCreate: document.getElementById("chooseCreate"),
  chooseJoin: document.getElementById("chooseJoin"),
  backToChoiceHost: document.getElementById("backToChoiceHost"),
  backToChoiceGuest: document.getElementById("backToChoiceGuest"),
  joinRoom: document.getElementById("joinRoom"),
  guestNameInput: document.getElementById("guestNameInput"),
  guestRoomCodeInput: document.getElementById("guestRoomCodeInput"),
  readyButton: document.getElementById("readyButton"),
  readyButtonGuest: document.getElementById("readyButtonGuest"),
  hostStatus: document.getElementById("hostStatus"),
  guestStatus: document.getElementById("guestStatus"),
  woodOverlay: document.getElementById("woodOverlay"),
  woodMessage: document.getElementById("woodMessage"),
  woodSubOptions: document.getElementById("woodSubOptions"),
  woodConfirm: document.getElementById("woodConfirm"),
  woodCancel: document.getElementById("woodCancel"),
  gemTutorOverlay: document.getElementById("gemTutorOverlay"),
  gemTutorOptions: document.getElementById("gemTutorOptions"),
  gemTutorConfirm: document.getElementById("gemTutorConfirm"),
  gemTutorCancel: document.getElementById("gemTutorCancel"),
  choiceCostOverlay: document.getElementById("choiceCostOverlay"),
  choiceCostMessage: document.getElementById("choiceCostMessage"),
  choiceCostOptions: document.getElementById("choiceCostOptions"),
  choiceCostConfirm: document.getElementById("choiceCostConfirm"),
  choiceCostCancel: document.getElementById("choiceCostCancel"),
  poolCostOverlay: document.getElementById("poolCostOverlay"),
  poolCostMessage: document.getElementById("poolCostMessage"),
  poolCostOptions: document.getElementById("poolCostOptions"),
  poolCostConfirm: document.getElementById("poolCostConfirm"),
  poolCostCancel: document.getElementById("poolCostCancel"),
  archiveTutorOverlay: document.getElementById("archiveTutorOverlay"),
  archiveTutorOptions: document.getElementById("archiveTutorOptions"),
  archiveTutorConfirm: document.getElementById("archiveTutorConfirm"),
  archiveTutorCancel: document.getElementById("archiveTutorCancel"),
  actionToast: document.getElementById("actionToast"),
  actionToastText: document.getElementById("actionToastText"),
};

function declareWinner(playerIndex) {
  state.winner = playerIndex;
  const name = state.players?.[playerIndex]?.name ?? `Player ${playerIndex + 1}`;
  elements.winnerText.textContent = `${name} wins!`;
  elements.winnerModalText.textContent = `${name} wins!`;
  if (elements.winnerModalMessage) {
    elements.winnerModalMessage.textContent = "Great run. Ready for a rematch?";
  }
  if (elements.restartGameModal) {
    elements.restartGameModal.hidden = false;
  }
  elements.winnerOverlay.hidden = false;
  elements.turnOverlay.hidden = true;
}

const handlers = createHandlers(state, elements, declareWinner);

wireEvents(elements, handlers);
handlers.showModePicker();
