export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function countCards(cards) {
  return {
    bronze: cards.filter((card) => getCardType(card) === "bronze").length,
    silver: cards.filter((card) => getCardType(card) === "silver").length,
    gold: cards.filter((card) => getCardType(card) === "gold").length,
  };
}

export function getCardType(card) {
  return typeof card === "string" ? card : card.type;
}

export function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}
