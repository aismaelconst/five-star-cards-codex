import { generateId } from "../shared/utils.js";

export function createCard(type, ruleset) {
  const def = ruleset.cardTypes[type];
  return {
    id: generateId(),
    type,
    tier: def?.tier ?? type,
    draw: def?.draw ?? 0,
  };
}

export function createDeck(ruleset) {
  const deck = [];
  Object.entries(ruleset.deckCounts).forEach(([type, count]) => {
    for (let i = 0; i < count; i += 1) {
      deck.push(createCard(type, ruleset));
    }
  });
  return deck;
}
