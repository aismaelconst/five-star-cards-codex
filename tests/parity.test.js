import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/game/state.js";
import { startGame } from "../src/game/lifecycle.js";
import { ActionTypes, applyAction } from "../src/game/rules.js";

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function getSummary(state) {
  return state.players.map((player) => ({
    hand: player.hand.length,
    active: player.active.length,
    archive: player.archive.length,
    discard: player.discard.length,
  }));
}

describe("mode parity", () => {
  it("offline and online start with the same hand sizes", () => {
    const offline = createInitialState({ mode: "offline" });
    const online = createInitialState({ mode: "online" });

    startGame(offline);
    startGame(online);

    expect(getSummary(offline)).toEqual(getSummary(online));
  });

  it("actions update state consistently", () => {
    const offline = createInitialState({ mode: "offline" });
    const online = createInitialState({ mode: "online" });

    startGame(offline);
    startGame(online);

    applyAction(offline, { type: ActionTypes.PLAY_CARD, payload: { index: 0 } });
    applyAction(online, { type: ActionTypes.PLAY_CARD, payload: { index: 0 } });

    applyAction(offline, { type: ActionTypes.END_TURN });
    applyAction(online, { type: ActionTypes.END_TURN });

    const offlineSnapshot = cloneState(offline);
    const onlineSnapshot = cloneState(online);

    expect(getSummary(offlineSnapshot)).toEqual(getSummary(onlineSnapshot));
  });
});
