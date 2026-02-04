export const baseRuleset = {
  maxPlays: 5,
  maxTrades: 5,
  winCondition: {
    goldInArchive: 5,
  },
  cardTypes: {
    bronze: {
      tier: "bronze",
      draw: 1,
      tradeUp: {
        to: "silver",
        cost: 5,
      },
    },
    silver: {
      tier: "silver",
      draw: 2,
      tradeUp: {
        to: "gold",
        cost: 5,
      },
    },
    gold: {
      tier: "gold",
      draw: 3,
    },
  },
  deckCounts: {
    bronze: 125,
    silver: 25,
    gold: 5,
  },
};
