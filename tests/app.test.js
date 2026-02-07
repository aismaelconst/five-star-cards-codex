import { describe, it, expect } from "vitest";

function setupDom() {
  document.body.innerHTML = `
    <div id="turnIndicator"></div>
    <div id="turnCounter"></div>
    <div id="opponentSummary"></div>
    <div id="opponentAlert"></div>
    <div id="archiveCounts"></div>
    <div id="handCounts"></div>
    <div id="archivePile"></div>
    <div id="activeCards"></div>
    <div id="handCards"></div>
    <div id="tradeInfo"></div>
    <div id="deckInfo"></div>
    <div id="discardInfo"></div>
    <button id="tradeBronze"></button>
    <button id="tradeSilver"></button>
    <button id="tradeGems"></button>
    <button id="tradePlatinum"></button>
    <button id="endTurn"></button>
    <button id="undoPlays"></button>
    <div id="winnerPanel"></div>
    <div id="winnerText"></div>
    <button id="restartGame"></button>
    <div id="debugInfo"></div>
    <div id="winnerOverlay"></div>
    <div id="winnerModalText"></div>
    <div id="winnerModalMessage"></div>
    <button id="restartGameModal"></button>
    <div id="confirmOverlay"></div>
    <div id="confirmSummary"></div>
    <div id="confirmCards"></div>
    <button id="cancelArchive"></button>
    <button id="confirmArchive"></button>
    <div id="turnOverlay"></div>
    <div id="overlayTitle"></div>
    <button id="startTurn"></button>
    <div id="modeOverlay"></div>
    <button id="offlineMode"></button>
    <button id="onlineMode"></button>
    <div id="formatOverlay"></div>
    <button id="formatCore"></button>
    <button id="formatExpanded"></button>
    <div id="onlineChoiceOverlay"></div>
    <div id="hostOverlay"></div>
    <div id="guestOverlay"></div>
    <button id="hostFormatCore"></button>
    <button id="hostFormatExpanded"></button>
    <input id="playerNameInput" />
    <input id="roomCodeInput" />
    <button id="createRoom"></button>
    <button id="chooseCreate"></button>
    <button id="chooseJoin"></button>
    <button id="backToChoiceHost"></button>
    <button id="backToChoiceGuest"></button>
    <button id="joinRoom"></button>
    <button id="readyButton"></button>
    <button id="readyButtonGuest"></button>
    <input id="guestNameInput" />
    <input id="guestRoomCodeInput" />
    <button id="copyRoomCode"></button>
    <div id="hostStatus"></div>
    <div id="guestStatus"></div>
    <div id="woodOverlay"></div>
    <div id="woodSubOptions"></div>
    <button id="woodConfirm"></button>
    <button id="woodCancel"></button>
    <div id="gemTutorOverlay"></div>
    <div id="gemTutorOptions"></div>
    <button id="gemTutorConfirm"></button>
    <button id="gemTutorCancel"></button>
  `;
}

describe("app bootstrap", () => {
  it("initializes without throwing", async () => {
    setupDom();
    await import("../app.js");

    document.getElementById("offlineMode").click();
    document.getElementById("formatCore").click();

    expect(document.getElementById("turnIndicator").textContent).toContain("Player");
    expect(document.getElementById("turnCounter").textContent).toContain("Turn");
  });
});
