export const baseRuleset = {
  maxPlays: 5,
  maxTrades: 5,
  winCondition: {
    goldInArchive: 5,
  },
  displayOrder: ["bronze", "silver", "gold"],
  tradeRecipes: {
    trade_bronze: {
      cost: { bronze: 5 },
      reward: "silver",
    },
    trade_silver: {
      cost: { silver: 5 },
      reward: "gold",
    },
  },
  woodSubstitution: {
    allow: false,
    minCost: 3,
    maxPerTrade: 1,
  },
  cardTypes: {
    bronze: {
      tier: "bronze",
      draw: 1,
    },
    silver: {
      tier: "silver",
      draw: 2,
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

export const expandedRuleset = {
  ...baseRuleset,
  displayOrder: [
    "bronze",
    "silver",
    "gold",
    "wood",
    "ruby",
    "emerald",
    "sapphire",
    "platinum",
  ],
  tradeRecipes: {
    trade_bronze: {
      cost: { bronze: 5 },
      reward: "silver",
    },
    trade_silver: {
      cost: { silver: 5 },
      reward: "gold",
    },
    trade_gem_set: {
      cost: { ruby: 1, emerald: 1, sapphire: 1 },
      reward: "any",
    },
    trade_platinum: {
      cost: { platinum: 1, bronze: 1, silver: 1 },
      reward: "dig_non_bronze_silver",
    },
  },
  woodSubstitution: {
    allow: true,
    minCost: 3,
    maxPerTrade: 1,
  },
  cardTypes: {
    ...baseRuleset.cardTypes,
    wood: {
      tier: "wood",
      draw: 0,
    },
    ruby: {
      tier: "ruby",
      draw: 0,
    },
    emerald: {
      tier: "emerald",
      draw: 0,
    },
    sapphire: {
      tier: "sapphire",
      draw: 0,
    },
    platinum: {
      tier: "platinum",
      draw: 0,
    },
  },
  deckCounts: {
    ...baseRuleset.deckCounts,
    wood: 5,
    ruby: 5,
    emerald: 5,
    sapphire: 5,
    platinum: 5,
  },
};
