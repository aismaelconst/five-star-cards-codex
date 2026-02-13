# Five Star Cards – Business & Launch Plan

## 1) Technical Plan (Go Live)

### Goals
- Two players anywhere can play in real time.
- Games are secure and authoritative.
- Unlocks/progression persist across sessions.

### Minimum Live Architecture
- **Frontend**: static hosting (Vercel / Netlify / Cloudflare Pages)
- **Backend**: Node.js WebSocket server (authoritative game state)
- **Database**: Postgres (accounts, unlocks, stats, match history)
- **CDN**: for assets (card art, UI)
- **HTTPS/WSS**: secure transport for all sessions

### Core Engineering Requirements
1. **Authoritative Server**
   - All actions validated server-side (trades, plays, turn order).
   - Server computes shuffles, draws, and win condition.
   - Client sends intent only.

2. **Real-Time Networking**
   - WebSockets (WSS) for low latency and updates.

3. **Matchmaking / Lobbies**
   - Invite codes first.
   - Expand later to ranked & casual queues.

4. **Persistence**
   - User accounts, unlocks, match history stored server-side.

5. **Observability**
   - Logs for debugging and replay.
   - Error tracking (Sentry or equivalent).
   - Basic metrics (disconnect rates, latency).

### Security & Anti-Cheat
- **Code cannot be hidden in browsers**.
- Prevent cheating by **server authority**:
  - Server validates every move.
  - Server controls randomization (shuffle/draw).
  - Server masks opponent hand.
  - Server determines winners.
- Optional: action logs + replay for dispute resolution.

---

## 2) Product & Format Vision

### Formats
- **Core**: fixed 155 cards.
- **Expanded**: fixed 180 cards = Core + 5 copies of 5 chosen non-core cards.

### Progression
- Players start with Core.
- First unlock is **Gilded Gems** as a full set (to allow immediate Expanded play).
- Afterwards, individual cards unlock gradually.
- Expanded pool includes all non-core cards as they are unlocked.

---

## 3) Marketing Plan

### Positioning
- Simple, fast, tactical card game.
- Easy rules, deep decisions.
- Quick matches (2–5 minutes).

### Target Audience
- Fans of fast strategy (Love Letter / Jaipur style pacing).
- Players who enjoy deckbuilding without complexity.

### Go-To-Market
1. Launch playable web demo.
2. Create short gameplay clips (TikTok/YouTube Shorts).
3. Build community (Discord, playtests).
4. Expand to Steam/mobile if retention holds.

---

## 4) Monetization (Non-Pay-to-Win)

### Recommended
- **Cosmetics**: card backs, table skins, animations.
- **Battle-pass style unlocks** (cosmetic + convenience only).
- **One-time premium unlock** (skip grind, same cards).
- **Ads after matches only** (never during turns).

### Avoid
- Pay-to-win upgrades.
- Ads during turns.

---

## 5) Next Milestones (High-Level)

1. **MVP Online**: authoritative server + invite lobby.
2. **Account System**: login + persistence.
3. **Unlock Progression**: Core -> Gems -> individual unlocks.
4. **Deck Builder**: select 5 non-core cards for Expanded.
5. **Public Launch**: web demo + marketing push.
