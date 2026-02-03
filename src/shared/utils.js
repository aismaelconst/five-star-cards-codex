export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createDeck() {
  const deck = [];
  for (let i = 0; i < 5; i += 1) deck.push("gold");
  for (let i = 0; i < 25; i += 1) deck.push("silver");
  for (let i = 0; i < 125; i += 1) deck.push("bronze");
  return shuffle(deck);
}

export function countCards(cards) {
  return {
    bronze: cards.filter((card) => card === "bronze").length,
    silver: cards.filter((card) => card === "silver").length,
    gold: cards.filter((card) => card === "gold").length,
  };
}
