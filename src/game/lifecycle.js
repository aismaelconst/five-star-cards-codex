import { drawCards } from "./rules.js";

export function startGame(state, options = {}) {
  const handSize = options.handSize ?? 5;
  const alreadyStarted = state.players.some((player) => player.hand.length > 0);
  if (alreadyStarted) return false;
  state.players.forEach((player) => drawCards(player, handSize));
  return true;
}

export function normalizeOnlinePhase(state) {
  if (state.mode !== "online") return false;
  if (state.phase !== "between") return false;
  state.phase = "main";
  return true;
}
