import { describe, it, expect } from "vitest";

function setupDom() {
  document.body.innerHTML = `
    <div id="turnIndicator"></div>
    <div id="turnCounter"></div>
    <div id="opponentSummary"></div>
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
    <button id="endTurn"></button>
    <button id="undoPlays"></button>
    <div id="winnerPanel"></div>
    <div id="winnerText"></div>
    <button id="restartGame"></button>
    <div id="winnerOverlay"></div>
    <div id="winnerModalText"></div>
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
    <div id="onlineNote"></div>
    <div id="onlineLobby"></div>
    <input id="playerNameInput" />
    <input id="roomCodeInput" />
    <button id="createRoom"></button>
    <button id="joinRoom"></button>
    <div id="lobbyStatus"></div>
  `;
}

describe("app bootstrap", () => {
  it("initializes without throwing", async () => {
    setupDom();
    await import("../app.js");

    expect(document.getElementById("turnIndicator").textContent).toContain("Player");
    expect(document.getElementById("turnCounter").textContent).toContain("Turn");
  });
});
