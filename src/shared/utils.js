export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function countCards(cards, types = null) {
  const counts = {};
  if (Array.isArray(types)) {
    types.forEach((type) => {
      counts[type] = 0;
    });
  }
  cards.forEach((card) => {
    const type = getCardType(card);
    counts[type] = (counts[type] ?? 0) + 1;
  });
  if (!types) {
    ["bronze", "silver", "gold"].forEach((type) => {
      if (counts[type] === undefined) counts[type] = 0;
    });
  }
  return counts;
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

export function generateRoomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
