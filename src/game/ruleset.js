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
  "ingot",
  "sterling",
];
const MINTED_DISPLAY_ORDER = [
  "bronze",
  "silver",
  "gold",
  "ingot",
  "sterling",
  "ledger",
  "mint",
  "hallmark",
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
    ingot: {
      tier: "ingot",
      draw: 0,
    },
    sterling: {
      tier: "sterling",
      draw: 0,
    },
  },
  deckCounts: {
    ...baseRuleset.deckCounts,
    turquoise: 5,
    lapis_lazuli: 5,
    carnelian: 5,
    ingot: 5,
    sterling: 5,
  },
};

// Kept in code for future use, but not currently part of any selectable format.
export const shelvedCardTypes = {
  electrum: {
    tier: "electrum",
    draw: 0,
  },
  copper: {
    tier: "copper",
    draw: 0,
  },
};

export const mintedRuleset = {
  ...baseRuleset,
  displayOrder: MINTED_DISPLAY_ORDER,
  tradeRecipes: {
    ...baseRuleset.tradeRecipes,
    trade_mint: {
      cost: { mint: 1 },
      choiceCost: { count: 1, pool: "non_gold" },
      reward: "any",
      rewardOptions: ["ingot", "sterling", "ledger"],
    },
    trade_hallmark: {
      cost: { hallmark: 1, bronze: 1, silver: 1 },
      reward: { type: "archive_cards", cards: ["ingot", "sterling", "mint"] },
    },
  },
  cardTypes: {
    ...baseRuleset.cardTypes,
    ingot: {
      tier: "ingot",
      draw: 0,
    },
    sterling: {
      tier: "sterling",
      draw: 0,
    },
    ledger: {
      tier: "ledger",
      draw: 0,
    },
    mint: {
      tier: "mint",
      draw: 0,
    },
    hallmark: {
      tier: "hallmark",
      draw: 0,
    },
  },
  deckCounts: {
    ...baseRuleset.deckCounts,
    ingot: 5,
    sterling: 5,
    ledger: 5,
    mint: 5,
    hallmark: 5,
  },
};
