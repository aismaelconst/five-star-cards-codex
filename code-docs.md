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
- `ruleset`, `format` (`core`, `expanded`, `ancient`, `ancient_expanded`)
- `mode` (`offline`, `cpu`, `online`)
- `currentPlayer`, `tradesThisTurn`, `turnCount`
- `phase` (`main`, `confirm`, `between`)
- `pendingArchive` (staged archive summary during confirm)
- `winner`
- `online` metadata (room, role, connection)
- `cpu` metadata (difficulty)

## Rulesets & Deck Construction

Rulesets live in `src/game/ruleset.js`.

- `baseRuleset` defines the core game: bronze/silver/gold cards, simple trade recipes, and win condition (5 gold in archive).
- `expandedRuleset` extends core with `wood`, `ruby`, `emerald`, `sapphire`, and `platinum`, plus more trades and wood substitution rules.
- `ancientRuleset` extends core with `turquoise`, `lapis_lazuli`, `carnelian`, and `electrum`, plus new pool-based trade recipes.
- `ancientExpandedRuleset` extends expanded with the ancients cards and the same ancients trade recipes.
- Decks are created in `src/game/cards.js` using `ruleset.deckCounts` and shuffled in `src/game/state.js` via `shuffle()`.

## Rules Engine

The core rules live in `src/game/rules.js`.

Action types:
- `TRADE`, `PLAY_CARD`, `PLAY_CARD_BY_TYPE`, `RETURN_CARD`, `RETURN_ALL`, `END_TURN`, `CONFIRM_ARCHIVE`, `CANCEL_ARCHIVE`, `START_TURN`

Key behaviors:
- `applyAction()` is the single entry for mutating state in response to actions.
- Trades are validated by `canTradeWithOptions()` and executed by `performTrade()`. Trades can consume archive cards, grant cards from the deck (tutor + shuffle), draw cards, and increment `tradesThisTurn`.
- Wood substitution is supported (expanded rules only) using `getWoodSubstitutionOptions()` and `buildCostWithWood()`.
- Platinum trade (`trade_platinum`) “digs” by popping cards from the deck until a non bronze/silver is found, discarding the rest.
- Trade recipes can include `choiceCost` (additional cost type), `poolCost` (distinct selections from a pool), and `reward` variants (`cards`, `draw`, `archive`).
- Playing a card moves it from hand to active; returning moves active cards back to hand.
- `prepareArchive()` stages active cards into `pendingArchive` and switches phase to `confirm`.
- `finalizeArchive()` moves pending cards to archive, draws cards based on total `draw`, checks win condition, advances turn, and sets phase to `between`.

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
- Executes a full turn using the same `applyAction()` pipeline as humans, and returns a summary for UI display.

## Multiplayer Utilities

Defined in `src/game/multiplayer.js`.

- `sanitizeStateForPlayer()` hides the opponent’s hand by replacing cards with `unknown` placeholders.
- `isPlayersTurn()` and `isMyTurn()` gate client actions.
- `getPlayerIndexById()` maps a server player id to a state index.

## UI Rendering

Rendering lives in `src/ui/render.js`.

- `renderApp()` is the main renderer and is called after most state changes.
- It selects a player perspective depending on mode:
  - Offline: `state.currentPlayer`.
  - CPU: the human player is always index 0.
  - Online: the player matching `state.online.playerId`.
- The hand is rendered as individual cards for 10 or fewer cards; otherwise it collapses into pile counts per card type.
- Trade buttons are enabled only when the phase is `main`, it is the local player’s turn, and `canInitiateTrade()` is true.
- `showConfirmOverlay()` renders a summary of pending archive cards and draw count.

Card tooltips are generated in `src/ui/card-tooltips.js` and include draw rules, trade recipes, and special notes (wood substitution, gold win condition).

## UI Events & Interaction Flow

Event wiring is centralized in `src/ui/events.js` and binds UI controls to handler functions.

The handler orchestration lives in `src/ui/handlers.js`.
Trade selection overlays and pool-cost handling are implemented in `src/ui/handlers/trade-flow.js`, with shared formatting helpers in `src/ui/handlers/trade-utils.js`.

Key responsibilities:
- Mode selection (offline, CPU, online) and format selection (core/gemstone+platinum/ancient/ancient+gemstone+platinum).
- Calling `startGame()` and initializing CPU or online state.
- Managing overlays (confirm archive, turn overlay, wood substitution, gem tutor, choice cost, pool cost, archive tutor, CPU summary).
- Converting UI actions into `applyAction()` calls or online `action` messages.

Trade overlays:
- If a trade can use wood, the wood overlay is shown first.
- If the trade requires an additional cost, the choice cost overlay is shown.
- If the trade requires a pool selection (`poolCost`), the pool cost overlay is shown.
- If the trade reward is `any`, the gem tutor overlay is shown to pick a target type.
- If the trade reward is `archive`, the archive tutor overlay is shown to pick a non-gold target type.
- After the overlays resolve, the trade is finalized and applied.

CPU flow:
- `maybeRunCpuTurn()` runs after the human completes their archive in CPU mode.
- The CPU summary overlay is shown if enabled.

## Online Client

The browser WebSocket wrapper in `src/online/client.js`:
- `connect()` opens a WebSocket and drains any queued messages.
- `send()` sends JSON payloads or queues them if the socket is not ready.
- `close()` closes the connection and clears the socket.

## Online Server

`server/index.js` serves static files and hosts WebSocket gameplay.

Server responsibilities:
- Serve `index.html`, `app.js`, `styles.css`, and assets.
- Manage rooms in memory with a two-player limit.
- Start games once both players are ready.
- Apply actions using the same `applyAction()` rules as the client.
- Broadcast sanitized state updates to each player after every action.
- Validate trade payloads on the server via `canTradeWithOptions()` before applying actions.

Key message types:
- `create_room`, `join_room`, `ready_up`
- `state_update` (sanitized state per player)
- `lobby_update` (room roster + ready state)
- `game_start`, `game_over`
- `action` (client requests to mutate state)

The server also tracks `lastEvent` (trade/archive summaries) so clients can display opponent activity toasts.

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
