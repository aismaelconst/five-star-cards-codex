# Five Star Cards Codebase Guide

This document describes how the Five Star Cards codebase is structured, how the main subsystems interact, and how the game rules flow through state, rendering, and online play.

## Entry Points

- `index.html` defines the UI structure and loads the client bundle via `<script type="module" src="app.js"></script>`.
- `app.js` bootstraps the client: creates initial state, binds DOM elements, wires event handlers, and shows the mode picker.
- `server/index.js` is the combined static file server + WebSocket server used for online multiplayer.

## Directory Map

- `src/game/` contains game rules, state, lifecycle, CPU logic, and online helpers.
- `src/ui/` contains rendering, event wiring, and interaction handlers (trade flow helpers live under `src/ui/handlers/`).
- `src/online/` contains the WebSocket client wrapper used by the browser.
- `src/shared/` contains cross-cutting utilities (shuffle, card counting, IDs).
- `assets/` contains SVG card art used by the UI.
- `tests/` contains Vitest suites covering game logic, UI events, and online flows.

## Core Data Model

Card shape (created in `src/game/cards.js`):
- `id` (unique per card)
- `type` (e.g. `bronze`, `silver`, `gold`, `wood`, `ruby`, `platinum`)
- `tier` (same as type or mapped via ruleset)
- `draw` (draw count when archived)

Player state (created in `src/game/state.js`):
- `deck`, `hand`, `active`, `archive`, `discard`
- `id`, `name`

Game state (created in `src/game/state.js`):
- `players` array
- `ruleset`, `format` (`core`, `expanded`, `ancient`, `mystic`)
- `mode` (`offline`, `cpu`, `online`)
- `currentPlayer`, `tradesThisTurn`, `turnCount`
- `phase` (`main`, `confirm`, `between`)
- `pendingArchive` (staged archive summary during confirm)
- `winner`
- `online` metadata (room, role, connection)
- `cpu` metadata (difficulty)
- `turnEffects` turn modifiers:
  - `currentPlayBonusByPlayer`
  - `currentPlayPenaltyByPlayer`
  - `nextTurnPlayPenaltyByPlayer`
  - `usedTradeRecipesByPlayer` (once-per-turn recipe tracking)

## Rulesets & Deck Construction

Rulesets live in `src/game/ruleset.js`.

- `baseRuleset` defines the core game: bronze/silver/gold cards, simple trade recipes, and win condition (5 gold in archive).
- `expandedRuleset` extends core with `wood`, `ruby`, `emerald`, `sapphire`, and `platinum`, plus more trades and wood substitution rules.
- `ancientRuleset` extends core with `turquoise`, `lapis_lazuli`, `carnelian`, `ingot`, and `sterling`.
- `ancientRuleset` adds a pool-cost trade (`trade_ancients_archive`) that archives a chosen non-gold card directly from deck.
- `mysticRuleset` extends core with `pearl`, `obsidian`, `amethyst`, `ash`, and `ember`.
- `mysticRuleset` adds one-card effect trades (`reward: { type: "effect", id }`) and uses `oncePerTurn: true` per recipe.
- `shelvedCardTypes` keeps non-active card defs (`electrum`, `copper`) in code for future reuse.
- `mintedRuleset` is still defined in `ruleset.js` as shelved content, but it is no longer selectable via game format state/UI/server allow-lists.
- Decks are created in `src/game/cards.js` using `ruleset.deckCounts` and shuffled in `src/game/state.js` via `shuffle()`.

## Rules Engine

The core rules live in `src/game/rules.js`.

Action types:
- `TRADE`, `PLAY_CARD`, `PLAY_CARD_BY_TYPE`, `RETURN_CARD`, `RETURN_ALL`, `END_TURN`, `CONFIRM_ARCHIVE`, `CANCEL_ARCHIVE`, `START_TURN`

Key behaviors:
- `applyAction()` is the single entry for mutating state in response to actions.
- Trades are validated by `canTradeWithOptions()` and executed by `performTrade()`. Trades can consume archive cards, grant cards from the deck (tutor + shuffle), draw cards, and increment `tradesThisTurn`.
- Trade payload supports optional `targetType` for effect trades that choose an opponent target type (e.g., mystic amethyst).
- Wood substitution is supported (expanded rules only) using `getWoodSubstitutionOptions()` and `buildCostWithWood()`.
- Platinum trade (`trade_platinum`) “digs” by popping cards from the deck until a non bronze/silver is found, discarding the rest.
- Trade recipes can include `choiceCost` (additional cost type), `poolCost` (distinct selections from a pool), `rewardOptions` (restricted tutor targets), and `reward` variants (`cards`, `draw`, `archive`, `archive_cards`, `archive_hand`, `effect`).
- Efficiency cards (`ingot`, `sterling`, `ledger`) can satisfy bronze/silver trade costs with an optional conversion step inside `getTradeCost()` and `canInitiateTrade()`, controlled by the `useEfficiency` trade payload flag.
- `oncePerTurn` recipes are enforced through `turnEffects.usedTradeRecipesByPlayer`.
- Dynamic play limits are enforced by `getPlayerPlayLimit()` and used by `playCard()`.
- Mystic effect handlers in `performTrade()`:
  - `pearl_extra_play`: +1 current turn play cap
  - `obsidian_next_turn_penalty`: queue opponent next-turn -1 play (non-stacking)
  - `amethyst_archive_to_deck`: targeted opponent archive card -> opponent deck + shuffle
  - `ash_random_hand_to_deck`: random opponent hand card -> opponent deck + shuffle
  - `ember_random_discard_to_deck`: up to 5 random opponent discard cards -> opponent deck + one shuffle
- Playing a card moves it from hand to active; returning moves active cards back to hand.
- `prepareArchive()` stages active cards into `pendingArchive` and switches phase to `confirm`.
- `finalizeArchive()` moves pending cards to archive, draws cards based on total `draw`, checks win condition, advances turn, applies queued turn penalties, resets one-turn bonuses/flags, and sets phase to `between`.

Phase model:
- `main`: player can trade and play cards.
- `confirm`: archive confirmation overlay is shown before the archive is finalized.
- `between`: transition state before the next player starts their turn.

## Lifecycle Helpers

Defined in `src/game/lifecycle.js`.

- `startGame()` draws the starting hand (default 5 cards) only once.
- `normalizeOnlinePhase()` converts `between` to `main` for online play so that players can act immediately after receiving a server update.

## CPU Opponent

CPU logic is in `src/game/cpu.js`.

- Uses weighted heuristics for trades and plays based on difficulty (`easy`, `medium`, `hard`).
- Generates a list of trades (respecting `maxTrades`) and card plays (respecting `maxPlays`).
- In mystic format, CPU applies deterministic effect heuristics (e.g., Pearl when hand exceeds cap, Amethyst targeting `gold` first).
- Executes a full turn using the same `applyAction()` pipeline as humans, and returns a summary for UI display.

## Multiplayer Utilities

Defined in `src/game/multiplayer.js`.

- `sanitizeStateForPlayer()` hides the opponent’s hand by replacing cards with `unknown` placeholders.
- `isPlayersTurn()` and `isMyTurn()` gate client actions.
- `getPlayerIndexById()` maps a server player id to a state index.

## UI Rendering

Rendering lives in `src/ui/render.js`.

- `renderApp()` is the main renderer and is called after most state changes.
- The board now renders a tabletop play surface with feedback HUD:
  - Deck and discard table widgets with visual stacks and counts.
  - Compact gold race tracks for both players (`goldRacePlayer`, `goldRaceOpponent`) rendered as filled/unfilled star pips.
  - Opponent summary title + archive mini-stacks and hand count now sits in the play header area.
  - Archive zone is centered in the table lane between deck/discard, with local archive mini-stacks (one stack per type with count > 0) and the Explore Trades entry point.
  - Active Cards zone sits above Hand in the lower stack to reflect the play flow (`Hand -> Active -> Archive`).
  - Turn replay panel (`turnReplayPanel`) that can display full card visuals for end-turn archive summaries.
  - Feedback caption lane (`feedbackCaption`) is archive-centered for phase text like archiving/drawing.
- Sidebar content has been moved to modals:
  - `howToPlayOverlay` opened from `openHowToPlay` in the top control bar.
  - `tradesOverlay` opened from `openTradesModal` near the Archive zone.
- It selects a player perspective depending on mode:
  - Offline: `state.currentPlayer`.
  - CPU: the human player is always index 0.
  - Online: the player matching `state.online.playerId`.
- The hand is rendered as individual cards for 10 or fewer cards; otherwise it collapses into pile counts per card type.
- The "How To Play" panel is refreshed per format, showing only relevant expansion rules and legend chips.
- Trade buttons are enabled only when the phase is `main`, it is the local player’s turn, and `canInitiateTrade()` is true.
- `openTradesModal` receives a `has-trades` class when at least one trade is currently initiable for the local player, enabling a red-dot affordance in the Archive header.
- Mystic-only trade buttons are rendered/enabled only in `mystic` format.
- Trade info shows dynamic play usage (`Plays used: activeCount/playCap`) so Pearl/Obsidian effects are visible.
- Archive mini-stacks can be inspected through `archiveInspectOverlay` (`state.ui.archiveInspect` drives visibility).
- Gold archive stacks are emphasized (`gold-focus`) and become urgent at 4+ (`gold-urgent`).
- `showConfirmOverlay()` renders a summary of pending archive cards and draw count.

Card tooltips are generated in `src/ui/card-tooltips.js` and include draw rules, trade recipes, and special notes (wood substitution, gold win condition).

## UI Events & Interaction Flow

Event wiring is centralized in `src/ui/events.js` and binds UI controls to handler functions.

The handler orchestration lives in `src/ui/handlers.js`.
Trade selection overlays and pool-cost handling are implemented in `src/ui/handlers/trade-flow.js`, with shared formatting helpers in `src/ui/handlers/trade-utils.js`.
Online lobby/WebSocket handling lives in `src/ui/handlers/online-flow.js`, CPU turn summaries in `src/ui/handlers/cpu-flow.js`, and format button labeling/toggling in `src/ui/handlers/format-utils.js`.
Trade success toast formatting is centralized in `src/ui/handlers/trade-utils.js` (`formatTradeToast`), including tutor/draw/archive/archive-from-hand/effect reward variants.
Motion/replay feedback is managed by `src/ui/feedback/feedback-controller.js` with helper modules:
- `src/ui/feedback/state-diff.js` captures visible pre/post snapshots and computes movement descriptors.
- `src/ui/feedback/animation-queue.js` runs flight animations sequentially.
- `src/ui/feedback/replay-builder.js` converts archive event counts/cards into replay panel entries + summary text.
- `src/ui/feedback/sequence-builder.js` builds deterministic step sequences (caption + movement) for archive/draw cadence.

Key responsibilities:
- Mode selection (offline, CPU) and format selection (core/gilded gems/ancient/mystic).
- Online mode is currently feature-flagged off in `src/ui/handlers.js` (`ONLINE_MODE_ENABLED = false`), which disables the mode button and blocks entry into lobby overlays.
- Theme selection (classic vs. pixel) with persistence in local storage.
- Motion mode selection (`auto`, `full`, `reduced`) with persistence in local storage and `prefers-reduced-motion` support.
- Modal controls for board helpers (`openHowToPlay`/`closeHowToPlay`, `openTradesModal`/`closeTradesModal`).
- Calling `startGame()` and initializing CPU or online state.
- Managing overlays (confirm archive, turn overlay, wood substitution, gem tutor, choice cost, pool cost, archive tutor, archive inspect, CPU summary).
- Converting UI actions into `applyAction()` calls or online `action` messages.
- Showing short action toasts for local card movement and successful local/online self trade effects.
- Triggering replay panel display for archive confirmations/opponent archive events and queueing card-flight animations after local and online state updates.
- Running archive confirmation as a staged sequence: active → archive first, then deck → hand draw steps, with caption updates and zone pulse fallback for reduced motion.

Trade overlays:
- If a trade can use wood, the wood overlay is shown first.
- If efficiency cards are relevant for the requested bronze/silver trade and present in archive, an efficiency overlay is shown; labels are format-aware (e.g., Ancient shows only ingot/sterling, no ledger).
- If the trade requires an additional cost, the choice cost overlay is shown.
- If the trade requires a pool selection (`poolCost`), the pool cost overlay is shown.
- If the trade reward is `any`, the gem tutor overlay is shown to pick a target type.
- If the trade reward is `archive`, the archive tutor overlay is shown to pick a non-gold target type.
- If a mystic amethyst effect trade is selected, the archive tutor overlay is reused in opponent-target mode to pick an opponent archive card type (`targetType`).
- After the overlays resolve, the trade is finalized and applied.

Shelved content:
- `electrum` and `copper` remain in code (`shelvedCardTypes`) but are not part of active formats.
- Legacy trade paths (`trade_electrum_draw`, `trade_mint`, `trade_hallmark`) are not exposed in the current UI or format selection.

CPU flow:
- `maybeRunCpuTurn()` runs after the human completes their archive in CPU mode.
- The CPU summary overlay now includes replay-style full card visuals for archived cards.
- The CPU avoids playing its entire hand if that would result in a zero-draw turn with an empty hand.

## Online Client

The browser WebSocket wrapper in `src/online/client.js`:
- `connect()` opens a WebSocket and drains any queued messages.
- `send()` sends JSON payloads or queues them if the socket is not ready.
- `close()` closes the connection and clears the socket.

## Online Server

`server/index.js` now exposes testable server factory utilities and still serves static files + WebSocket gameplay in runtime.

Server responsibilities:
- Serve `index.html`, `app.js`, `styles.css`, and assets.
- Manage rooms in memory with a two-player limit.
- Start games once both players are ready.
- Apply actions using the same `applyAction()` rules as the client.
- Broadcast sanitized state updates to each player after every action.
- Validate trade payloads on the server via `canTradeWithOptions()` before applying actions.
- Track per-room `lastEvent` so clients can render opponent and self trade/archive summaries.

Exported server helpers:
- `createGameServer(options)` builds the HTTP + WebSocket server with injectable dependencies (`http`, `ws`, logger, rule helpers) for deterministic unit tests.
- `createStaticRequestHandler({ rootDir, fsImpl })` is the static asset responder used by the HTTP server.
- `resolveRequestedFormat(format)` centralizes format allow-listing (`core`, `expanded`, `ancient`, `mystic`).
- `DEFAULT_PORT` / `DEFAULT_ROOT_DIR` are exported constants for startup wiring.

Runtime startup behavior:
- The module only auto-starts when executed directly (`node server/index.js`).
- Importing `server/index.js` in tests no longer binds a network port automatically.

Key message types:
- `create_room`, `join_room`, `ready_up`
- `state_update` (sanitized state per player)
- `lobby_update` (room roster + ready state)
- `game_start`, `game_over`
- `action` (client requests to mutate state)

The server also tracks `lastEvent` (trade/archive summaries) so clients can display opponent activity toasts.
For mystic effects this includes `effectId`, `targetType`, `movedTypes`, `movedCount`, and `playLimit` when relevant.

## End-to-End Flow

Offline or CPU:
- UI click → handler → `applyAction()` → `renderApp()`.
- End turn triggers `prepareArchive()` and the confirm overlay.
- Confirm archive triggers `finalizeArchive()` and either the next player overlay or the CPU turn.

Online:
- UI click → handler → `sendOrApply()` sends `action` to server.
- Server applies action → broadcasts `state_update` with sanitized state.
- Client `handleServerMessage()` updates state via `applyServerState()` → `renderApp()`.

## Tests

Vitest tests live in `tests/` and cover core rule logic, UI handlers, and online behavior. Use `npm test` to run the suite.
