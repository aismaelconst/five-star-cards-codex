# Five Star Cards

A light, fast card game about building toward five gold stars.

## Formats

Choose one format before starting the game:

- **Core (155 cards)**
  - 125 bronze, 25 silver, 5 gold
- **Gilded Gems (180 cards)**
  - Core + 5 each: wood, ruby, emerald, sapphire, platinum
- **Ancient (180 cards)**
  - Core + 5 each: turquoise, lapis lazuli, carnelian, ingot, sterling
- **Mystic (180 cards)**
  - Core + 5 each: pearl, obsidian, amethyst, ash, ember

All non-core cards have **draw 0** (they do not draw cards at end of turn).

Note: `electrum`, `copper`, `ledger`, `mint`, and `hallmark` are currently shelved and not part of selectable formats.

## Zones

Each player has: **Hand**, **Active Cards**, **Archive**, and **Discard**.

## Setup

1. Shuffle your deck.
2. Draw 5 cards into your hand.
3. Decide who goes first by any fair method.

## Turn Structure

A player’s turn has three parts:

1. **Trading (optional)**
2. **Play Cards (optional)**
3. **Archive & Draw (mandatory)**

You may trade **before and/or after** playing cards. You may **not** trade after the Archive step.

## 1. Trading (Optional)

- You may trade **up to 5 times per turn**.
- Trades use cards from your **Archive** (not your Hand).
- Traded cards go to **Discard**.
- Trades that tutor a card from the deck **shuffle the deck** after the tutor.

### Core Trades (all formats)

- **5 bronze → tutor 1 silver**
- **5 silver → tutor 1 gold**

### Gilded Gems Trades (Gilded Gems)

- **Ruby + Emerald + Sapphire → tutor any card**
  - Choose any card type from your deck and put it into your hand.
- **Platinum + Bronze + Silver → dig**
  - Reveal cards from the top of your deck until you hit a **non‑bronze/silver** card.
  - Discard the revealed bronze/silver cards, add the first non‑bronze/silver card to your hand.

**Wood substitution (Gilded Gems only)**
- Wood can replace **one required card** in a trade whose base cost is **3+ cards**.
- Max **one wood per trade**.
- Wood **cannot** replace platinum in the platinum trade.

### Ancients Trades (Ancient)

- **Any two distinct ancients (turquoise, lapis lazuli, carnelian) → archive 1 non‑gold from deck**
  - Choose a non‑gold card from your deck and place it directly into your Archive, then shuffle.
- **Ingot**
  - Counts as **3 bronze** when paying trade costs from the Archive.
- **Sterling**
  - Counts as **2 silver** when paying trade costs from the Archive.
- You may choose whether to apply these efficiency counts or pay with regular bronze/silver.

### Mystic Trades (Mystic)

Each mystic trade costs **only itself** from Archive and is usable **once per player turn per recipe**.

- **Pearl → +1 play this turn**
- **Obsidian → opponent plays 1 fewer card on their next turn** (non-stacking)
- **Amethyst → choose 1 opponent archive card type, move one to opponent deck, then shuffle**
- **Ash → move 1 random opponent hand card to opponent deck, then shuffle**
- **Ember → opponent cannot make trades on their next turn**

Targeting / reveal rules:
- If a target-based effect has no valid target, the trade is unavailable.
- Gold can be targeted by mystic disruption effects.
- Randomly moved card type(s) are revealed to both players.

## 2. Play Cards (Optional)

You may play **up to 5 cards** from your hand into your **Active Cards** area. You may play fewer than 5.

Play-cap modifiers can change this in Mystic games:
- Pearl can raise your current-turn cap to 6.
- Obsidian can reduce the opponent’s next-turn cap by 1.
- Minimum playable cap is always 1 when you have at least one card in hand.

## 3. Archive & Draw (Mandatory)

At the end of your turn:

1. Move all cards from **Active Cards** to your **Archive**.
2. Draw cards based on what you just played (now archived):
   - **Bronze: 1**
   - **Silver: 2**
   - **Gold: 3**
   - **All other cards: 0**

## Winning the Game

You **win immediately** when your Archive contains **5 gold**, even if this happens mid‑turn.

## UX Notes (No Rules Changes)

- The UI shows a compact **Gold race** tracker for both players using filled/unfilled star pips, with stronger urgency styling at **4/5**.
- The table board shows **visual deck/discard stacks** (face-down card back for deck, live top-card look for discard).
- Archive is shown as **mini-card stacks by type** for both players (not chips), with count badges.
- You can tap/click an archive mini-stack to open an **inspect modal** with larger card visuals and totals.
- **How To Play** is now opened as a modal from the top control bar.
- **Explore Trades** is opened as a modal from the Archive section, with an availability dot when at least one trade is currently possible.
- The table now follows a clearer vertical flow: **Hand -> Active Cards -> Archive**.
- Archive is centered between Deck and Discard, and phase captions (for example **Archiving...**, **Drawing...**) are shown there.
- End-of-turn archive actions can show a **turn replay panel** with full card visuals and draw totals.
- End-turn feedback now uses explicit phase captions (for example **Archiving...** then **Drawing...**) to clarify card movement timing.
- Card movement feedback (draw, tutor, archive, trade cost/reward) may animate between zones depending on motion settings.
- Motion can be set to **Auto / Full / Reduced**. Reduced mode minimizes animation only; gameplay is unchanged.
- For gold-planning strategy, see `draw-probability-guide.md`.

---

## Quick Reference

Turn Order:

- Trade (up to 5 times, Archive only)
- Play (up to 5 cards)
- Archive & Draw

Core Trades:

- 5 bronze → 1 silver (tutor, shuffle)
- 5 silver → 1 gold (tutor, shuffle)

Gilded Gems Trades:

- Ruby + Emerald + Sapphire → tutor any card (shuffle)
- Platinum + Bronze + Silver → dig for non‑bronze/silver

Ancients Trades:

- 2 distinct ancients → archive 1 non‑gold from deck (shuffle)
- Ingot: counts as 3 bronze in archive trades
- Sterling: counts as 2 silver in archive trades

Mystic Trades (once per turn per recipe):

- Pearl → +1 play this turn
- Obsidian → opponent -1 play next turn
- Amethyst → shuffle 1 chosen opponent archive card into deck
- Ash → shuffle 1 random opponent hand card into deck
- Ember → opponent cannot make trades next turn
