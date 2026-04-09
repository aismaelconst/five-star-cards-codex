import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHandlers } from "../src/ui/handlers.js";
import { createInitialState } from "../src/game/state.js";
import { expandedRuleset } from "../src/game/ruleset.js";

import { renderApp } from "../src/ui/render.js";

vi.mock("../src/ui/render.js", () => ({
  renderApp: vi.fn(),
  showConfirmOverlay: vi.fn(),
  showTurnOverlay: vi.fn(),
}));

function makeElements() {
  const actionToast = document.createElement("div");
  actionToast.hidden = true;
  return {
    confirmOverlay: document.createElement("div"),
    turnOverlay: document.createElement("div"),
    cpuTurnOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    cpuTurnSummary: document.createElement("div"),
    cpuTurnConfirm: document.createElement("button"),
    winnerPanel: document.createElement("div"),
    winnerOverlay: document.createElement("div"),
    winnerModalText: document.createElement("div"),
    winnerModalMessage: document.createElement("div"),
    restartGameModal: document.createElement("button"),
    goldRace: document.createElement("div"),
    goldRacePlayer: document.createElement("div"),
    goldRaceOpponent: document.createElement("div"),
    turnReplayPanel: Object.assign(document.createElement("div"), { hidden: true }),
    turnReplayCards: document.createElement("div"),
    turnReplayMeta: document.createElement("div"),
    turnReplayClose: document.createElement("button"),
    archiveInspectOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    archiveInspectTitle: document.createElement("div"),
    archiveInspectMeta: document.createElement("div"),
    archiveInspectCards: document.createElement("div"),
    archiveInspectClose: document.createElement("button"),
    feedbackCaption: document.createElement("div"),
    deckZone: document.createElement("div"),
    discardZone: document.createElement("div"),
    archiveZone: document.createElement("div"),
    activeZone: document.createElement("div"),
    handZone: document.createElement("div"),
    boardDeckStack: document.createElement("div"),
    boardDiscardStack: document.createElement("div"),
    feedbackLayer: document.createElement("div"),
    deckAnchor: document.createElement("span"),
    handAnchor: document.createElement("span"),
    activeAnchor: document.createElement("span"),
    archiveAnchor: document.createElement("span"),
    discardAnchor: document.createElement("span"),
    confirmSummary: document.createElement("div"),
    confirmCards: document.createElement("div"),
    modeOverlay: document.createElement("div"),
    onlineMode: document.createElement("button"),
    cpuFormatOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    cpuFormatCore: document.createElement("button"),
    cpuFormatExpanded: document.createElement("button"),
    cpuFormatAncient: document.createElement("button"),
    cpuFormatMystic: document.createElement("button"),
    cpuFormatFoundry: document.createElement("button"),
    cpuFormatRandom: document.createElement("button"),
    cpuOverlay: document.createElement("div"),
    formatOverlay: document.createElement("div"),
    formatCore: document.createElement("button"),
    formatExpanded: document.createElement("button"),
    formatAncient: document.createElement("button"),
    formatMystic: document.createElement("button"),
    formatFoundry: document.createElement("button"),
    cpuEasy: document.createElement("button"),
    cpuMedium: document.createElement("button"),
    cpuHard: document.createElement("button"),
    onlineChoiceOverlay: document.createElement("div"),
    hostOverlay: document.createElement("div"),
    guestOverlay: document.createElement("div"),
    hostFormatCore: document.createElement("button"),
    hostFormatExpanded: document.createElement("button"),
    hostFormatAncient: document.createElement("button"),
    hostFormatMystic: document.createElement("button"),
    hostFormatFoundry: document.createElement("button"),
    cpuMode: document.createElement("button"),
    openHowToPlay: document.createElement("button"),
    closeHowToPlay: document.createElement("button"),
    motionToggle: document.createElement("button"),
    openTradesModal: document.createElement("button"),
    closeTradesModal: document.createElement("button"),
    howToPlayOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    tradesOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    playerNameInput: Object.assign(document.createElement("input"), { value: "" }),
    roomCodeInput: Object.assign(document.createElement("input"), { value: "" }),
    guestNameInput: Object.assign(document.createElement("input"), { value: "" }),
    guestRoomCodeInput: Object.assign(document.createElement("input"), { value: "" }),
    readyButton: document.createElement("button"),
    readyButtonGuest: document.createElement("button"),
    chooseCreate: document.createElement("button"),
    chooseJoin: document.createElement("button"),
    backToChoiceHost: document.createElement("button"),
    backToChoiceGuest: document.createElement("button"),
    hostStatus: document.createElement("div"),
    guestStatus: document.createElement("div"),
    copyRoomCode: document.createElement("button"),
    opponentAlert: document.createElement("div"),
    woodOverlay: document.createElement("div"),
    woodMessage: document.createElement("div"),
    woodSubOptions: document.createElement("div"),
    woodConfirm: document.createElement("button"),
    woodCancel: document.createElement("button"),
    efficiencyOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    efficiencyMessage: document.createElement("div"),
    efficiencyOptions: document.createElement("div"),
    efficiencyConfirm: document.createElement("button"),
    efficiencyCancel: document.createElement("button"),
    gemTutorOverlay: document.createElement("div"),
    gemTutorOptions: document.createElement("div"),
    gemTutorConfirm: document.createElement("button"),
    gemTutorCancel: document.createElement("button"),
    choiceCostOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    choiceCostMessage: document.createElement("div"),
    choiceCostOptions: document.createElement("div"),
    choiceCostConfirm: document.createElement("button"),
    choiceCostCancel: document.createElement("button"),
    poolCostOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    poolCostMessage: document.createElement("div"),
    poolCostOptions: document.createElement("div"),
    poolCostConfirm: document.createElement("button"),
    poolCostCancel: document.createElement("button"),
    archiveTutorOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    archiveTutorMessage: document.createElement("div"),
    archiveTutorOptions: document.createElement("div"),
    archiveTutorConfirm: document.createElement("button"),
    archiveTutorCancel: document.createElement("button"),
    handArchiveOverlay: Object.assign(document.createElement("div"), { hidden: true }),
    handArchiveMessage: document.createElement("div"),
    handArchiveOptions: document.createElement("div"),
    handArchiveConfirm: document.createElement("button"),
    handArchiveCancel: document.createElement("button"),
    actionToast,
    actionToastText: document.createElement("div"),
  };
}

describe("ui/handlers", () => {
  let state;
  let elements;
  let onWinner;

  beforeEach(() => {
    state = createInitialState();
    elements = makeElements();
    onWinner = vi.fn();
  });

  it("plays a card from hand to active", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.hand = ["bronze"];

    handlers.playCard(0);

    expect(player.active).toEqual(["bronze"]);
    expect(player.hand.length).toBe(0);
  });

  it("plays a card by type from hand to active", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.hand = ["bronze", "silver"];

    handlers.playCardByType("silver");

    expect(player.active).toContain("silver");
    expect(player.hand.length).toBe(1);
  });

  it("shows toast when playing a card offline", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.hand = ["bronze"];

    handlers.playCard(0);

    expect(elements.actionToast.hidden).toBe(false);
    expect(elements.actionToastText.textContent).toContain("Played Bronze");
  });

  it("runs feedback animation wrapper for local actions", () => {
    const animateFromSnapshots = vi.fn();
    const captureSnapshot = vi.fn(() => ({ local: {} }));
    const feedbackFactory = () => ({
      cycleMotionMode: vi.fn(),
      closeReplay: vi.fn(),
      captureSnapshot,
      animateFromSnapshots,
      showArchiveReplayFromCards: vi.fn(),
      showArchiveReplayFromEvent: vi.fn(),
      reset: vi.fn(),
    });
    const handlers = createHandlers(state, elements, onWinner, { feedbackFactory });
    const player = state.players[0];
    player.hand = ["bronze"];

    handlers.playCard(0);

    expect(captureSnapshot).toHaveBeenCalled();
    expect(animateFromSnapshots).toHaveBeenCalled();
  });

  it("opens and closes archive inspect modal state", () => {
    const handlers = createHandlers(state, elements, onWinner);

    handlers.openArchiveInspect("player", "gold", 3);
    expect(state.ui.archiveInspect).toEqual({
      owner: "player",
      type: "gold",
      count: 3,
      visible: true,
    });

    handlers.closeArchiveInspect();
    expect(state.ui.archiveInspect.visible).toBe(false);
    expect(elements.archiveInspectOverlay.hidden).toBe(true);
  });

  it("opens and closes the how-to-play and trades modals", () => {
    const handlers = createHandlers(state, elements, onWinner);

    handlers.openHowToPlay();
    handlers.openTradesModal();
    expect(elements.howToPlayOverlay.hidden).toBe(false);
    expect(elements.tradesOverlay.hidden).toBe(false);

    handlers.closeHowToPlay();
    handlers.closeTradesModal();
    expect(elements.howToPlayOverlay.hidden).toBe(true);
    expect(elements.tradesOverlay.hidden).toBe(true);
  });

  it("returns a card from active to hand", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["bronze"];

    handlers.returnCard(0);

    expect(player.hand).toContain("bronze");
    expect(player.active.length).toBe(0);
  });

  it("returns all cards from active to hand", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["bronze", "silver"];

    handlers.returnAllCards();

    expect(player.hand.length).toBe(2);
    expect(player.active.length).toBe(0);
  });

  it("shows toast when returning all cards", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["bronze", "silver"];

    handlers.returnAllCards();

    expect(elements.actionToast.hidden).toBe(false);
    expect(elements.actionToastText.textContent).toContain("Returned 2 card(s) to hand");
  });

  it("handles trades and updates state", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.archive = Array.from({ length: 5 }, () => "bronze");
    player.deck = ["silver"];

    handlers.trade("trade_bronze");

    expect(state.tradesThisTurn).toBe(1);
    expect(player.hand).toContain("silver");
    expect(player.discard.length).toBe(5);
    expect(elements.actionToast.hidden).toBe(false);
    expect(elements.actionToastText.textContent).toContain("gained Silver");
  });

  it("closes trades modal before opening wood substitution overlay", () => {
    state = createInitialState({ mode: "offline", format: "expanded" });
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.archive = ["wood", "bronze", "bronze", "bronze", "bronze"];
    player.deck = ["silver"];
    elements.tradesOverlay.hidden = false;
    elements.woodOverlay.hidden = true;

    handlers.trade("trade_bronze");

    expect(elements.tradesOverlay.hidden).toBe(true);
    expect(elements.woodOverlay.hidden).toBe(false);
  });

  it("opens pool cost overlay for ancients trade", () => {
    state = createInitialState({ mode: "offline", format: "ancient" });
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    elements.poolCostOverlay.hidden = true;
    player.archive = ["turquoise", "carnelian"];
    player.deck = ["silver"];

    handlers.trade("trade_ancients_archive");

    expect(elements.poolCostOverlay.hidden).toBe(false);
    const buttons = elements.poolCostOptions.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("opens archive tutor after pool cost selection", () => {
    state = createInitialState({ mode: "offline", format: "ancient" });
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.archive = ["turquoise", "carnelian"];
    player.deck = ["silver"];

    handlers.trade("trade_ancients_archive");
    const poolButtons = Array.from(elements.poolCostOptions.querySelectorAll("button"));
    poolButtons.find((button) => button.dataset.choice === "turquoise")?.click();
    poolButtons.find((button) => button.dataset.choice === "carnelian")?.click();
    handlers.confirmPoolCost();

    expect(elements.archiveTutorOverlay.hidden).toBe(false);
    const tutorButtons = Array.from(elements.archiveTutorOptions.querySelectorAll("button"));
    const silverButton = tutorButtons.find((button) => button.dataset.choice === "silver");
    silverButton.click();
    handlers.confirmArchiveTutor();

    expect(state.tradesThisTurn).toBe(1);
    expect(player.archive).toContain("silver");
    expect(player.discard.length).toBe(2);
  });

  it("opens efficiency overlay for bronze trade in ancient format", () => {
    state = createInitialState({ mode: "offline", format: "ancient" });
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.archive = ["ingot", "bronze", "bronze"];
    player.deck = ["silver"];

    handlers.trade("trade_bronze");

    expect(elements.efficiencyOverlay.hidden).toBe(false);
    const labels = Array.from(elements.efficiencyOptions.querySelectorAll("button")).map(
      (button) => button.textContent
    );
    expect(labels).toContain("Use ingot");
    expect(labels.some((label) => label.includes("ledger"))).toBe(false);
  });

  it("does not offer efficiency for bronze trade when only sterling is present", () => {
    state = createInitialState({ mode: "offline", format: "ancient" });
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.archive = ["sterling", "bronze", "bronze", "bronze", "bronze", "bronze"];
    player.deck = ["silver"];

    handlers.trade("trade_bronze");

    expect(elements.efficiencyOverlay.hidden).toBe(true);
    expect(state.tradesThisTurn).toBe(1);
  });

  it("does not offer efficiency for silver trade when only ingot is present", () => {
    state = createInitialState({ mode: "offline", format: "ancient" });
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.archive = ["ingot", "silver", "silver", "silver", "silver", "silver"];
    player.deck = ["gold"];

    handlers.trade("trade_silver");

    expect(elements.efficiencyOverlay.hidden).toBe(true);
    expect(state.tradesThisTurn).toBe(1);
  });

  it("does not open electrum trade flow in ancient format", () => {
    state = createInitialState({ mode: "offline", format: "ancient" });
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.archive = ["bronze", "silver", "gold", "turquoise", "lapis_lazuli"];

    handlers.trade("trade_electrum_draw");

    expect(elements.choiceCostOverlay.hidden).toBe(true);
    expect(elements.handArchiveOverlay.hidden).toBe(true);
    expect(state.tradesThisTurn).toBe(0);
    expect(player.discard.length).toBe(0);
  });

  it("prepares archive on endTurn", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["bronze", "silver"];

    handlers.endTurn();

    expect(state.phase).toBe("confirm");
    expect(state.pendingArchive).not.toBeNull();
  });

  it("finalizes archive and advances turn", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["bronze", "bronze"];

    handlers.endTurn();
    handlers.confirmArchive();

    expect(state.currentPlayer).toBe(1);
    expect(state.phase).toBe("between");
  });

  it("runs archive-then-draw feedback sequence on confirm archive", () => {
    const animateSequence = vi.fn();
    const animateFromSnapshots = vi.fn();
    const captureSnapshot = vi.fn(() => ({ local: {} }));
    const feedbackFactory = () => ({
      cycleMotionMode: vi.fn(),
      closeReplay: vi.fn(),
      captureSnapshot,
      animateFromSnapshots,
      animateSequence,
      showArchiveReplayFromCards: vi.fn(),
      showArchiveReplayFromEvent: vi.fn(),
      reset: vi.fn(),
    });
    const handlers = createHandlers(state, elements, onWinner, { feedbackFactory });
    const player = state.players[0];
    player.active = ["bronze", "silver"];

    handlers.endTurn();
    handlers.confirmArchive();

    expect(animateSequence).toHaveBeenCalled();
    expect(animateFromSnapshots).toHaveBeenCalled();
  });

  it("shows replay panel on offline archive confirmation", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["bronze", "silver"];

    handlers.endTurn();
    handlers.confirmArchive();

    expect(elements.turnReplayPanel.hidden).toBe(false);
    expect(elements.turnReplayMeta.textContent).toContain("Archived 2 card(s)");
    expect(elements.turnReplayCards.children.length).toBe(2);
  });

  it("calls onWinner when a player wins", () => {
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.active = ["gold", "gold", "gold", "gold", "gold"];

    handlers.endTurn();
    handlers.confirmArchive();

    expect(onWinner).toHaveBeenCalledWith(0);
  });

  it("resets the game", () => {
    const handlers = createHandlers(state, elements, onWinner);
    state.currentPlayer = 1;

    handlers.resetGame();

    expect(state.currentPlayer).toBe(0);
    expect(state.turnCount).toBe(1);
  });

  it("selects offline mode and starts a game", () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.modeOverlay.hidden = false;

    handlers.selectOfflineMode();

    expect(state.mode).toBe("offline");
    expect(elements.modeOverlay.hidden).toBe(true);
    expect(elements.formatOverlay.hidden).toBe(false);

    handlers.selectCoreFormat();
    expect(state.turnCount).toBe(1);
  });

  it("selects ancient format in offline mode", () => {
    const handlers = createHandlers(state, elements, onWinner);
    handlers.selectOfflineMode();

    handlers.selectAncientFormat();

    expect(state.format).toBe("ancient");
    expect(state.players[0].deck.length + state.players[0].hand.length).toBe(180);
  });

  it("selects mystic format in offline mode", () => {
    const handlers = createHandlers(state, elements, onWinner);
    handlers.selectOfflineMode();

    handlers.selectMysticFormat();

    expect(state.format).toBe("mystic");
    expect(state.players[0].deck.length + state.players[0].hand.length).toBe(180);
  });

  it("selects foundry format in offline mode", () => {
    const handlers = createHandlers(state, elements, onWinner);
    handlers.selectOfflineMode();

    handlers.selectFoundryFormat();

    expect(state.format).toBe("foundry");
    expect(state.players[0].deck.length + state.players[0].hand.length).toBe(180);
  });

  it("keeps online mode disabled from mode picker", () => {
    const handlers = createHandlers(state, elements, onWinner);

    handlers.showModePicker();

    expect(elements.onlineMode.disabled).toBe(true);
    expect(elements.onlineMode.title).toContain("temporarily unavailable");
  });

  it("does not enter online mode when online is disabled", () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.modeOverlay.hidden = true;
    elements.onlineChoiceOverlay.hidden = true;

    handlers.selectOnlineMode();

    expect(state.mode).not.toBe("online");
    expect(elements.modeOverlay.hidden).toBe(true);
    expect(elements.onlineChoiceOverlay.hidden).toBe(true);
  });

  it("selects cpu mode and starts a mixed-format cpu game", () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.modeOverlay.hidden = false;

    handlers.selectCpuMode();

    expect(state.mode).toBe("cpu");
    expect(elements.modeOverlay.hidden).toBe(true);
    expect(elements.formatOverlay.hidden).toBe(false);

    handlers.selectCoreFormat();
    expect(elements.cpuFormatOverlay.hidden).toBe(false);
    expect(elements.cpuOverlay.hidden).toBe(true);

    handlers.selectCpuFormatAncient();
    expect(elements.cpuOverlay.hidden).toBe(false);

    handlers.selectCpuEasy();
    expect(state.cpu.difficulty).toBe("easy");
    expect(state.players[1].name).toBe("CPU");
    expect(state.formatsByPlayer).toEqual(["core", "ancient"]);
  });

  it("starts a valid cpu mirror match when the same deck is selected", () => {
    const handlers = createHandlers(state, elements, onWinner);

    handlers.selectCpuMode();
    handlers.selectMysticFormat();
    expect(elements.cpuFormatOverlay.hidden).toBe(false);

    handlers.selectCpuFormatMystic();
    expect(elements.cpuOverlay.hidden).toBe(false);

    handlers.selectCpuEasy();

    expect(state.formatsByPlayer).toEqual(["mystic", "mystic"]);
    expect(state.cpu.opponentFormat).toBe("mystic");
  });

  it("selects cpu medium and hard difficulties", () => {
    const handlers = createHandlers(state, elements, onWinner);
    handlers.selectCpuMode();
    handlers.selectCoreFormat();

    handlers.selectCpuMedium();
    expect(state.cpu.difficulty).toBe("medium");

    handlers.selectCpuHard();
    expect(state.cpu.difficulty).toBe("hard");
  });

  it("random cpu format can mirror the player's format", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.25);
    const handlers = createHandlers(state, elements, onWinner);

    handlers.selectCpuMode();
    handlers.selectExpandedFormat();
    handlers.selectCpuFormatRandom();
    handlers.selectCpuEasy();

    expect(state.formatsByPlayer[0]).toBe("expanded");
    expect(state.formatsByPlayer[1]).toBe("expanded");
    randomSpy.mockRestore();
  });

  it("toggles host/guest overlays", () => {
    const handlers = createHandlers(state, elements, onWinner);
    handlers.chooseCreate();
    expect(elements.hostOverlay.hidden).toBe(false);
    expect(elements.guestOverlay.hidden).toBe(true);

    handlers.chooseJoin();
    expect(elements.guestOverlay.hidden).toBe(false);
    expect(elements.hostOverlay.hidden).toBe(true);
  });

  it("toggles host format buttons", () => {
    const handlers = createHandlers(state, elements, onWinner);
    handlers.selectHostFormatExpanded();
    expect(state.format).toBe("expanded");
    handlers.selectHostFormatAncient();
    expect(state.format).toBe("ancient");
    handlers.selectHostFormatMystic();
    expect(state.format).toBe("mystic");
    handlers.selectHostFormatFoundry();
    expect(state.format).toBe("foundry");
  });

  it("opens amethyst target overlay and confirms target selection", () => {
    state = createInitialState({ mode: "offline", format: "mystic" });
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    const opponent = state.players[1];
    player.archive = ["amethyst"];
    opponent.archive = ["gold"];
    opponent.deck = [];
    elements.archiveTutorOverlay.hidden = true;

    handlers.trade("trade_amethyst");

    expect(elements.archiveTutorOverlay.hidden).toBe(false);
    expect(elements.archiveTutorMessage.textContent).toContain("opponent archive");
    const target = Array.from(elements.archiveTutorOptions.querySelectorAll("button")).find(
      (button) => button.dataset.choice === "gold"
    );
    target.click();
    handlers.confirmArchiveTutor();

    expect(state.tradesThisTurn).toBe(1);
    expect(player.discard).toContain("amethyst");
    expect(opponent.archive).not.toContain("gold");
    expect(opponent.deck).toContain("gold");
  });

  it("cancels amethyst target overlay without trading", () => {
    state = createInitialState({ mode: "offline", format: "mystic" });
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    const opponent = state.players[1];
    player.archive = ["amethyst"];
    opponent.archive = ["silver"];

    handlers.trade("trade_amethyst");
    expect(elements.archiveTutorOverlay.hidden).toBe(false);

    handlers.cancelArchiveTutor();

    expect(elements.archiveTutorOverlay.hidden).toBe(true);
    expect(state.tradesThisTurn).toBe(0);
    expect(player.discard.length).toBe(0);
    expect(opponent.archive).toContain("silver");
  });

  it("blocks amethyst trade when opponent archive has no target", () => {
    state = createInitialState({ mode: "offline", format: "mystic" });
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    const opponent = state.players[1];
    player.archive = ["amethyst"];
    opponent.archive = [];
    elements.archiveTutorOverlay.hidden = true;

    handlers.trade("trade_amethyst");

    expect(elements.archiveTutorOverlay.hidden).toBe(true);
    expect(state.tradesThisTurn).toBe(0);
    expect(player.discard.length).toBe(0);
  });

  it("returns to choice overlay", () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.onlineChoiceOverlay.hidden = true;
    elements.hostOverlay.hidden = false;

    handlers.backToChoice();

    expect(elements.onlineChoiceOverlay.hidden).toBe(false);
    expect(elements.hostOverlay.hidden).toBe(true);
  });

  it("runs cpu turn after human confirms archive", () => {
    state = createInitialState({ mode: "cpu", format: "core", playerNames: ["You", "CPU"] });
    state.cpu = { difficulty: "easy" };
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.hand = ["bronze"];

    handlers.playCard(0);
    handlers.endTurn();
    handlers.confirmArchive();

    expect(state.currentPlayer).toBe(0);
    expect(state.turnCount).toBe(3);
    expect(elements.cpuTurnOverlay.hidden).toBe(false);
    expect(elements.cpuTurnSummary.textContent).toContain("Archived");
  });

  it("creates a room in online mode", () => {
    const sendSpy = vi.fn();
    let capturedOnMessage;
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: ({ onMessage }) => {
        capturedOnMessage = onMessage;
        return {
          connect: vi.fn(),
          send: sendSpy,
        };
      },
    });
    elements.playerNameInput.value = "Hoster";

    handlers.createRoom();

    expect(state.mode).toBe("online");
    expect(state.online.role).toBe("host");
    expect(state.online.status).toBe("waiting");
    expect(elements.roomCodeInput.value).toBe("");
    expect(elements.hostStatus.textContent).toContain("Creating room");
    expect(sendSpy).toHaveBeenCalledWith({
      type: "create_room",
      playerName: "Hoster",
      format: "core",
    });
    capturedOnMessage({
      type: "room_created",
      roomId: "ROOM42",
      playerId: "P1",
      state: createInitialState({ mode: "online" }),
    });
    expect(elements.roomCodeInput.value).toBe("ROOM42");
  });

  it("joins a room in online mode", () => {
    const sendSpy = vi.fn();
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: () => ({
        connect: vi.fn(),
        send: sendSpy,
      }),
    });
    elements.guestNameInput.value = "Guesty";
    elements.guestRoomCodeInput.value = "abc123";

    handlers.joinRoom();

    expect(state.mode).toBe("online");
    expect(state.online.role).toBe("guest");
    expect(state.online.status).toBe("joined");
    expect(state.online.roomId).toBe("ABC123");
    expect(elements.guestStatus.textContent).toContain("Joined room");
    expect(sendSpy).toHaveBeenCalledWith({
      type: "join_room",
      roomId: "ABC123",
      playerName: "Guesty",
    });
  });

  it("readies up only after joining", () => {
    const sendSpy = vi.fn();
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: () => ({
        connect: vi.fn(),
        send: sendSpy,
      }),
    });

    handlers.readyUp();
    expect(elements.hostStatus.textContent).toContain("Join a room");

    state.online.roomId = "ROOM01";
    state.online.playerId = "P1";
    handlers.readyUp();

    expect(sendSpy).toHaveBeenCalledWith({
      type: "ready_up",
      roomId: "ROOM01",
      playerId: "P1",
    });
  });

  it("copies room code when available", async () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.roomCodeInput.value = "ROOMX1";
    const originalNavigator = global.navigator;
    global.navigator = { clipboard: { writeText: vi.fn() } };

    await handlers.copyRoomCode();

    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith("ROOMX1");
    global.navigator = originalNavigator;
  });

  it("shows error when joining without room code", () => {
    const sendSpy = vi.fn();
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: () => ({
        connect: vi.fn(),
        send: sendSpy,
      }),
    });

    elements.guestRoomCodeInput.value = "";
    handlers.joinRoom();

    expect(elements.hostStatus.textContent).toContain("Enter a room code");
  });

  it("shows room code when clipboard is unavailable", async () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.roomCodeInput.value = "ROOMX2";
    const originalNavigator = global.navigator;
    global.navigator = {};

    await handlers.copyRoomCode();

    expect(elements.hostStatus.textContent).toContain("Room code: ROOMX2");
    global.navigator = originalNavigator;
  });

  it("shows error when copying without a code", async () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.roomCodeInput.value = "";
    await handlers.copyRoomCode();
    expect(elements.hostStatus.textContent).toContain("Create a room first");
  });

  it("blocks actions when not connected online", () => {
    const handlers = createHandlers(state, elements, onWinner);
    state.mode = "online";
    state.online.role = "host";
    state.players[0].hand = ["bronze"];

    handlers.playCard(0);

    expect(elements.hostStatus.textContent).toContain("Not connected to server");
  });

  it("uses cpu local player for trades", () => {
    const cpuState = createInitialState({ mode: "cpu", format: "core", playerNames: ["You", "CPU"] });
    cpuState.players[0].archive = ["bronze", "bronze", "bronze", "bronze", "bronze"];
    cpuState.players[0].deck = ["silver"];
    const localElements = makeElements();
    const handlers = createHandlers(cpuState, localElements, onWinner);

    handlers.trade("trade_bronze");

    expect(cpuState.tradesThisTurn).toBe(1);
  });

  it("shows opponent trade and archive alerts", () => {
    const sendSpy = vi.fn();
    let capturedOnMessage;
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: ({ onMessage }) => {
        capturedOnMessage = onMessage;
        return { connect: vi.fn(), send: sendSpy };
      },
    });

    state.mode = "online";
    elements.playerNameInput.value = "Host";
    handlers.createRoom();
    state.online.playerId = "p2";

    capturedOnMessage({
      type: "state_update",
      roomId: "ROOM",
      playerId: "p2",
      lastEvent: {
        type: "trade",
        playerId: "p1",
        from: "bronze",
        to: "silver",
        cost: 5,
      },
      state: createInitialState({ mode: "online" }),
    });
    expect(elements.opponentAlert.textContent).toContain("Opponent traded");

    capturedOnMessage({
      type: "state_update",
      roomId: "ROOM",
      playerId: "p2",
      lastEvent: {
        type: "archive",
        playerId: "p1",
        counts: { bronze: 2, silver: 1, gold: 0 },
        drawCount: 4,
      },
      state: createInitialState({ mode: "online" }),
    });
    expect(elements.opponentAlert.textContent).toContain("Opponent archived");
  });

  it("shows opponent platinum trade details", () => {
    const sendSpy = vi.fn();
    let capturedOnMessage;
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: ({ onMessage }) => {
        capturedOnMessage = onMessage;
        return { connect: vi.fn(), send: sendSpy };
      },
    });

    state.mode = "online";
    elements.playerNameInput.value = "Host";
    handlers.createRoom();
    state.online.playerId = "p2";

    capturedOnMessage({
      type: "state_update",
      roomId: "ROOM",
      playerId: "p2",
      lastEvent: {
        type: "trade",
        recipeId: "trade_platinum",
        playerId: "p1",
        useWood: true,
        substituteType: "bronze",
        digDiscardedCount: 3,
        rewardType: "ruby",
      },
      state: createInitialState({ mode: "online" }),
    });

    expect(elements.opponentAlert.textContent).toContain("Discarded 3 bronze/silver");
    expect(elements.opponentAlert.textContent).toContain("Found ruby");
    expect(elements.opponentAlert.textContent).toContain("wood replaced bronze");

    capturedOnMessage({
      type: "state_update",
      roomId: "ROOM",
      playerId: "p2",
      lastEvent: {
        type: "trade",
        recipeId: "trade_platinum",
        playerId: "p1",
        useWood: false,
        substituteType: null,
        digDiscardedCount: 2,
        rewardType: null,
      },
      state: createInitialState({ mode: "online" }),
    });

    expect(elements.opponentAlert.textContent).toContain("Deck exhausted");
  });

  it("shows toast for self platinum trade and auto hides", () => {
    vi.useFakeTimers();
    const sendSpy = vi.fn();
    let capturedOnMessage;
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: ({ onMessage }) => {
        capturedOnMessage = onMessage;
        return { connect: vi.fn(), send: sendSpy };
      },
    });

    state.mode = "online";
    elements.playerNameInput.value = "Host";
    handlers.createRoom();
    state.online.playerId = "p1";

    capturedOnMessage({
      type: "state_update",
      roomId: "ROOM",
      playerId: "p1",
      lastEvent: {
        type: "trade",
        recipeId: "trade_platinum",
        playerId: "p1",
        useWood: false,
        substituteType: null,
        digDiscardedCount: 2,
        rewardType: "gold",
      },
      state: createInitialState({ mode: "online" }),
    });

    expect(elements.actionToast.hidden).toBe(false);
    expect(elements.actionToast.classList.contains("visible")).toBe(true);
    expect(elements.actionToastText.textContent).toContain("Discarded 2 bronze/silver");
    expect(elements.actionToastText.textContent).toContain("Found gold");

    vi.advanceTimersByTime(2000);
    expect(elements.actionToast.hidden).toBe(true);
    expect(elements.actionToast.classList.contains("visible")).toBe(false);
    vi.useRealTimers();
  });

  it("shows toast for offline platinum trade", () => {
    vi.useFakeTimers();
    state = createInitialState({ mode: "offline", format: "expanded" });
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    const player = state.players[0];
    player.archive = ["platinum", "bronze", "silver"];
    player.deck = ["gold"];

    handlers.trade("trade_platinum");

    expect(elements.actionToast.hidden).toBe(false);
    expect(elements.actionToastText.textContent).toContain("Found gold");

    vi.advanceTimersByTime(2000);
    expect(elements.actionToast.hidden).toBe(true);
    vi.useRealTimers();
  });

  it("sends wood substitution trade payload", () => {
    const sendSpy = vi.fn();
    const expandedState = createInitialState({ mode: "online", format: "expanded" });
    expandedState.online.role = "host";
    expandedState.mode = "online";
    const player = expandedState.players[0];
    player.archive = ["bronze", "bronze", "bronze", "bronze", "wood"];
    player.deck = ["silver"];

    const handlers = createHandlers(expandedState, elements, onWinner, {
      clientFactory: () => ({
        connect: vi.fn(),
        send: sendSpy,
      }),
    });

    handlers.createRoom();
    expandedState.online.roomId = "ROOM";
    expandedState.online.playerId = expandedState.players[0].id;

    handlers.trade("trade_bronze");
    const options = elements.woodSubOptions.querySelectorAll("button");
    options[0].click();
    handlers.confirmWoodSubstitution();

    const sent = sendSpy.mock.calls[sendSpy.mock.calls.length - 1][0];
    expect(sent.type).toBe("action");
    expect(sent.action.payload.recipeId).toBe("trade_bronze");
    expect(sent.action.payload.useWood).toBe(true);
    expect(sent.action.payload.substituteType).toBe("bronze");
  });

  it("opens gem tutor after wood substitution for gem trade", () => {
    const expandedState = createInitialState({ mode: "offline", format: "expanded" });
    const localElements = makeElements();
    const handlers = createHandlers(expandedState, localElements, onWinner);
    const player = expandedState.players[0];
    player.archive = ["ruby", "emerald", "wood"];
    player.deck = ["gold"];

    handlers.trade("trade_gem_set");
    const options = localElements.woodSubOptions.querySelectorAll("button");
    options[0].click();
    handlers.confirmWoodSubstitution();

    expect(localElements.gemTutorOverlay.hidden).toBe(false);
  });

  it("cancels wood substitution overlay", () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.woodOverlay.hidden = false;
    handlers.cancelWoodSubstitution();
    expect(elements.woodOverlay.hidden).toBe(true);
  });

  it("cancels gem tutor overlay", () => {
    const handlers = createHandlers(state, elements, onWinner);
    elements.gemTutorOverlay.hidden = false;
    handlers.cancelGemTutor();
    expect(elements.gemTutorOverlay.hidden).toBe(true);
  });

  it("hides no-wood option when base cost is not met", () => {
    const handlers = createHandlers(state, elements, onWinner);
    state.ruleset = expandedRuleset;
    state.format = "expanded";
    const player = state.players[0];
    player.archive = ["bronze", "bronze", "bronze", "bronze", "wood"];
    player.deck = ["silver"];

    handlers.trade("trade_bronze");

    const labels = Array.from(elements.woodSubOptions.querySelectorAll("button")).map(
      (button) => button.dataset.choice
    );
    expect(labels).not.toContain("none");
    expect(elements.woodMessage.textContent).toContain("Wood required");
  });

  it("sends gem tutor trade payload", () => {
    const sendSpy = vi.fn();
    const expandedState = createInitialState({ mode: "online", format: "expanded" });
    expandedState.online.role = "host";
    expandedState.mode = "online";
    const player = expandedState.players[0];
    player.archive = ["ruby", "emerald", "sapphire"];
    player.deck = ["gold"];

    const handlers = createHandlers(expandedState, elements, onWinner, {
      clientFactory: () => ({
        connect: vi.fn(),
        send: sendSpy,
      }),
    });

    handlers.createRoom();
    expandedState.online.roomId = "ROOM";
    expandedState.online.playerId = expandedState.players[0].id;

    handlers.trade("trade_gem_set");
    const options = Array.from(elements.gemTutorOptions.querySelectorAll("button"));
    const goldButton = options.find((button) => button.dataset.choice === "gold");
    goldButton.click();
    handlers.confirmGemTutor();

    const sent = sendSpy.mock.calls[sendSpy.mock.calls.length - 1][0];
    expect(sent.type).toBe("action");
    expect(sent.action.payload.recipeId).toBe("trade_gem_set");
    expect(sent.action.payload.rewardType).toBe("gold");
  });

  it("returns to mode selection on game over in online mode", () => {
    vi.useFakeTimers();
    let capturedOnMessage;
    const closeSpy = vi.fn();
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: ({ onMessage }) => {
        capturedOnMessage = onMessage;
        return {
          connect: vi.fn(),
          send: vi.fn(),
          close: closeSpy,
        };
      },
    });

    elements.playerNameInput.value = "Host";
    handlers.createRoom();
    state.mode = "online";
    elements.modeOverlay.hidden = true;

    capturedOnMessage({
      type: "game_over",
      roomId: "ROOM",
      winnerIndex: 0,
      winnerName: "Host",
    });

    expect(elements.winnerOverlay.hidden).toBe(false);
    expect(elements.winnerModalText.textContent).toContain("Host");

    vi.runAllTimers();

    expect(closeSpy).toHaveBeenCalled();
    expect(elements.modeOverlay.hidden).toBe(false);
    expect(state.mode).toBe(null);
    expect(elements.winnerOverlay.hidden).toBe(true);
    vi.useRealTimers();
  });

  it("re-renders after closing cpu summary", () => {
    state = createInitialState({ mode: "cpu", format: "core", playerNames: ["You", "CPU"] });
    state.cpu = { difficulty: "easy" };
    elements = makeElements();
    const handlers = createHandlers(state, elements, onWinner);
    elements.cpuTurnOverlay.hidden = false;

    handlers.closeCpuSummary();

    expect(elements.cpuTurnOverlay.hidden).toBe(true);
    expect(renderApp).toHaveBeenCalled();
  });

  it("defers cpu winner until summary is closed", () => {
    const winnerSpy = vi.fn();
    const cpuState = createInitialState({ mode: "cpu", format: "expanded", playerNames: ["You", "CPU"] });
    cpuState.cpu = { difficulty: "hard" };
    cpuState.players[0].hand = ["bronze"];
    cpuState.players[1].archive = [
      "gold",
      "gold",
      "gold",
      "gold",
      "silver",
      "silver",
      "silver",
      "silver",
      "silver",
    ];
    cpuState.players[1].deck = ["gold"];
    const localElements = makeElements();
    const handlers = createHandlers(cpuState, localElements, winnerSpy);

    handlers.playCard(0);
    handlers.endTurn();
    handlers.confirmArchive();

    expect(localElements.cpuTurnOverlay.hidden).toBe(false);
    expect(winnerSpy).not.toHaveBeenCalled();

    handlers.closeCpuSummary();
    expect(winnerSpy).toHaveBeenCalled();
  });

  it("resets online games by returning to mode select", () => {
    const handlers = createHandlers(state, elements, onWinner);
    state.mode = "online";
    handlers.resetGame();
    expect(elements.modeOverlay.hidden).toBe(false);
  });

  it("uses cpu winner flow without summary overlay", () => {
    const minimalElements = makeElements();
    minimalElements.cpuTurnOverlay = null;
    const winnerSpy = vi.fn();
    const localState = createInitialState({ mode: "cpu", format: "expanded", playerNames: ["You", "CPU"] });
    localState.cpu = { difficulty: "hard" };
    localState.players[0].hand = ["bronze"];
    localState.players[1].archive = [
      "gold",
      "gold",
      "gold",
      "gold",
      "silver",
      "silver",
      "silver",
      "silver",
      "silver",
    ];
    localState.players[1].deck = ["gold"];
    const handlers = createHandlers(localState, minimalElements, winnerSpy);

    handlers.playCard(0);
    handlers.endTurn();
    handlers.confirmArchive();

    expect(winnerSpy).toHaveBeenCalled();
  });

  it("shows confirm overlay only for the active online player", () => {
    const sendSpy = vi.fn();
    let capturedOnMessage;
    const handlers = createHandlers(state, elements, onWinner, {
      clientFactory: ({ onMessage }) => {
        capturedOnMessage = onMessage;
        return { connect: vi.fn(), send: sendSpy };
      },
    });

    state.mode = "online";
    elements.playerNameInput.value = "Host";
    handlers.createRoom();
    state.online.playerId = "p2";
    state.players[0].id = "p1";
    state.players[1].id = "p2";
    elements.confirmOverlay.hidden = false;

    capturedOnMessage({
      type: "state_update",
      roomId: "ROOM",
      playerId: "p2",
      state: {
        ...createInitialState({ mode: "online" }),
        players: [
          { id: "p1", hand: [], active: [], archive: [], discard: [], deck: [] },
          { id: "p2", hand: [], active: [], archive: [], discard: [], deck: [] },
        ],
        currentPlayer: 0,
        phase: "confirm",
      },
    });

    expect(elements.confirmOverlay.hidden).toBe(true);
  });

  it("starts a turn from between phase", () => {
    const handlers = createHandlers(state, elements, onWinner);
    state.phase = "between";
    elements.turnOverlay.hidden = false;

    handlers.startTurn();

    expect(state.phase).toBe("main");
    expect(elements.turnOverlay.hidden).toBe(true);
  });

  it("cancels archive confirmation", () => {
    const handlers = createHandlers(state, elements, onWinner);
    state.phase = "confirm";
    state.pendingArchive = { playedCards: [], drawCount: 0, playerIndex: 0 };
    elements.confirmOverlay.hidden = false;

    handlers.cancelArchive();

    expect(state.phase).toBe("main");
    expect(state.pendingArchive).toBe(null);
    expect(elements.confirmOverlay.hidden).toBe(true);
  });
});
