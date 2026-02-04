import { getCardType } from "../shared/utils.js";

export function getPlayerIndexById(state, playerId) {
  return state.players.findIndex((player) => player.id === playerId);
}

export function sanitizeStateForPlayer(state, playerId) {
  const view =
    typeof structuredClone === "function"
      ? structuredClone(state)
      : JSON.parse(JSON.stringify(state));
  view.players = view.players.map((player) => {
    if (player.id === playerId) return player;
    return {
      ...player,
      hand: Array.from({ length: player.hand.length }, () => ({
        id: "hidden",
        type: "unknown",
        tier: "unknown",
        draw: 0,
      })),
    };
  });
  return view;
}

export function isPlayersTurn(state, playerId) {
  const current = state.players[state.currentPlayer];
  return current?.id === playerId;
}

export function isMyTurn(state) {
  if (!state.online?.playerId) return false;
  return isPlayersTurn(state, state.online.playerId);
}

export function countHandByType(hand) {
  return hand.reduce(
    (acc, card) => {
      const type = getCardType(card);
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    },
    { bronze: 0, silver: 0, gold: 0 }
  );
}
