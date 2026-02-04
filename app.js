import { createInitialState } from "./src/game/state.js";
import { wireEvents } from "./src/ui/events.js";
import { createHandlers } from "./src/ui/handlers.js";


const state = createInitialState();

const elements = {
  turnIndicator: document.getElementById("turnIndicator"),
  turnCounter: document.getElementById("turnCounter"),
  opponentSummary: document.getElementById("opponentSummary"),
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
  endTurn: document.getElementById("endTurn"),
  undoPlays: document.getElementById("undoPlays"),
  winnerPanel: document.getElementById("winnerPanel"),
  winnerText: document.getElementById("winnerText"),
  restartGame: document.getElementById("restartGame"),
  winnerOverlay: document.getElementById("winnerOverlay"),
  winnerModalText: document.getElementById("winnerModalText"),
  restartGameModal: document.getElementById("restartGameModal"),
  confirmOverlay: document.getElementById("confirmOverlay"),
  confirmSummary: document.getElementById("confirmSummary"),
  confirmCards: document.getElementById("confirmCards"),
  cancelArchive: document.getElementById("cancelArchive"),
  confirmArchive: document.getElementById("confirmArchive"),
  turnOverlay: document.getElementById("turnOverlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  startTurn: document.getElementById("startTurn"),
  modeOverlay: document.getElementById("modeOverlay"),
  offlineMode: document.getElementById("offlineMode"),
  onlineMode: document.getElementById("onlineMode"),
  onlineChoiceOverlay: document.getElementById("onlineChoiceOverlay"),
  hostOverlay: document.getElementById("hostOverlay"),
  guestOverlay: document.getElementById("guestOverlay"),
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
};

function declareWinner(playerIndex) {
  state.winner = playerIndex;
  elements.winnerText.textContent = `Player ${playerIndex + 1} wins!`;
  elements.winnerModalText.textContent = `Player ${playerIndex + 1} wins!`;
  elements.winnerOverlay.hidden = false;
  elements.turnOverlay.hidden = true;
}

const handlers = createHandlers(state, elements, declareWinner);

wireEvents(elements, handlers);
handlers.showModePicker();
