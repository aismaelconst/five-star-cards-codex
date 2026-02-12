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

const ANCIENT_DISPLAY_ORDER = [
  "bronze",
  "silver",
  "gold",
  "turquoise",
  "lapis_lazuli",
  "carnelian",
  "electrum",
];

const ANCIENT_EXPANDED_DISPLAY_ORDER = [
  "bronze",
  "silver",
  "gold",
  "wood",
  "ruby",
  "emerald",
  "sapphire",
  "platinum",
  "turquoise",
  "lapis_lazuli",
  "carnelian",
  "electrum",
];

function getNonGoldAllowed(displayOrder) {
  return displayOrder.filter((type) => type !== "gold");
}

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

export const ancientRuleset = {
  ...baseRuleset,
  displayOrder: ANCIENT_DISPLAY_ORDER,
  tradeRecipes: {
    ...baseRuleset.tradeRecipes,
    trade_ancients_archive: {
      poolCost: { min: 2, max: 2, distinct: true, pool: "ancient" },
      reward: { type: "archive" },
    },
    trade_electrum_draw: {
      cost: { electrum: 1, bronze: 1, silver: 1 },
      reward: {
        type: "archive_hand",
        min: 1,
        max: 5,
        allowed: getNonGoldAllowed(ANCIENT_DISPLAY_ORDER),
      },
    },
  },
  cardTypes: {
    ...baseRuleset.cardTypes,
    turquoise: {
      tier: "turquoise",
      draw: 0,
    },
    lapis_lazuli: {
      tier: "lapis_lazuli",
      draw: 0,
    },
    carnelian: {
      tier: "carnelian",
      draw: 0,
    },
    electrum: {
      tier: "electrum",
      draw: 0,
    },
  },
  deckCounts: {
    ...baseRuleset.deckCounts,
    turquoise: 5,
    lapis_lazuli: 5,
    carnelian: 5,
    electrum: 5,
  },
};

export const ancientExpandedRuleset = {
  ...expandedRuleset,
  displayOrder: ANCIENT_EXPANDED_DISPLAY_ORDER,
  tradeRecipes: {
    ...expandedRuleset.tradeRecipes,
    trade_ancients_archive: {
      poolCost: { min: 2, max: 2, distinct: true, pool: "ancient" },
      reward: { type: "archive" },
    },
    trade_electrum_draw: {
      cost: { electrum: 1, bronze: 1, silver: 1 },
      reward: {
        type: "archive_hand",
        min: 1,
        max: 5,
        allowed: getNonGoldAllowed(ANCIENT_EXPANDED_DISPLAY_ORDER),
      },
    },
  },
  cardTypes: {
    ...expandedRuleset.cardTypes,
    turquoise: {
      tier: "turquoise",
      draw: 0,
    },
    lapis_lazuli: {
      tier: "lapis_lazuli",
      draw: 0,
    },
    carnelian: {
      tier: "carnelian",
      draw: 0,
    },
    electrum: {
      tier: "electrum",
      draw: 0,
    },
  },
  deckCounts: {
    ...expandedRuleset.deckCounts,
    turquoise: 5,
    lapis_lazuli: 5,
    carnelian: 5,
    electrum: 5,
  },
};
