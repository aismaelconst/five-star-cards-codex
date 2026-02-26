import { createAnimationQueue } from "./animation-queue.js";
import { captureVisibleSnapshot, computeMovementDescriptors } from "./state-diff.js";
import { buildArchiveReplay, buildArchiveReplayFromCards } from "./replay-builder.js";
import { buildDescriptorSequence } from "./sequence-builder.js";

const MOTION_STORAGE_KEY = "fsc_motion_mode";
const MOTION_MODES = ["auto", "full", "reduced"];

function getAnchorByZone(elements, zone) {
  if (zone === "deck") return elements.deckAnchor;
  if (zone === "hand") return elements.handAnchor;
  if (zone === "active") return elements.activeAnchor;
  if (zone === "archive") return elements.archiveAnchor;
  if (zone === "discard") return elements.discardAnchor;
  return null;
}

function getZoneElementByZone(elements, zone) {
  if (zone === "deck") return elements.deckZone;
  if (zone === "hand") return elements.handZone;
  if (zone === "active") return elements.activeZone;
  if (zone === "archive") return elements.archiveZone;
  if (zone === "discard") return elements.discardZone;
  return null;
}

function getAnchorPoint(anchor) {
  if (!anchor) return null;
  const rect = anchor.getBoundingClientRect();
  if (!rect.width && !rect.height) return null;
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function readStoredMotionMode() {
  try {
    const value = localStorage.getItem(MOTION_STORAGE_KEY);
    if (value && MOTION_MODES.includes(value)) return value;
  } catch {
    // ignore storage errors
  }
  return "auto";
}

function writeStoredMotionMode(mode) {
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, mode);
  } catch {
    // ignore storage errors
  }
}

export function createFeedbackController({ state, elements }) {
  const queue = createAnimationQueue();
  let replayTimer = null;
  const initialMode = state.ui?.motionMode ?? readStoredMotionMode();
  state.ui = {
    ...state.ui,
    motionMode: MOTION_MODES.includes(initialMode) ? initialMode : "auto",
    replayQueue: Array.isArray(state.ui?.replayQueue) ? state.ui.replayQueue : [],
  };

  function updateMotionToggleLabel() {
    if (!elements.motionToggle) return;
    const mode = state.ui.motionMode;
    const label = mode.charAt(0).toUpperCase() + mode.slice(1);
    elements.motionToggle.textContent = `Motion: ${label}`;
  }

  function prefersReducedMotion() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isReducedMotion() {
    const mode = state.ui.motionMode;
    if (mode === "reduced") return true;
    if (mode === "full") return false;
    return prefersReducedMotion();
  }

  function applyMotionClass() {
    if (!document?.body) return;
    const reduced = isReducedMotion();
    document.body.classList.toggle("motion-reduced", reduced);
    document.body.classList.toggle("motion-full", !reduced);
  }

  function setMotionMode(mode) {
    if (!MOTION_MODES.includes(mode)) return;
    state.ui.motionMode = mode;
    writeStoredMotionMode(mode);
    updateMotionToggleLabel();
    applyMotionClass();
  }

  function cycleMotionMode() {
    const index = MOTION_MODES.indexOf(state.ui.motionMode);
    const next = MOTION_MODES[(index + 1) % MOTION_MODES.length];
    setMotionMode(next);
  }

  function clearReplayTimer() {
    if (replayTimer) {
      clearTimeout(replayTimer);
      replayTimer = null;
    }
  }

  function closeReplay() {
    clearReplayTimer();
    if (elements.turnReplayPanel) {
      elements.turnReplayPanel.hidden = true;
    }
  }

  function renderReplayCards(entries) {
    if (!elements.turnReplayCards) return;
    elements.turnReplayCards.innerHTML = "";
    entries.forEach((type) => {
      const card = document.createElement("div");
      card.className = `card ${type} replay-card`;
      card.dataset.cardType = type;
      const label = document.createElement("span");
      label.className = "card-label";
      label.textContent = type;
      card.appendChild(label);
      elements.turnReplayCards.appendChild(card);
    });
  }

  function showReplay(replay, options = {}) {
    if (!replay || !elements.turnReplayPanel || !elements.turnReplayMeta) return;
    state.ui.replayQueue.push(replay);
    elements.turnReplayMeta.textContent = replay.meta;
    renderReplayCards(replay.entries ?? []);
    elements.turnReplayPanel.hidden = false;
    clearReplayTimer();
    const autoHideMs = options.autoHideMs ?? 2600;
    if (autoHideMs > 0) {
      replayTimer = setTimeout(() => {
        closeReplay();
      }, autoHideMs);
    }
  }

  function showArchiveReplayFromEvent(event, actorName, options = {}) {
    const replay = buildArchiveReplay({
      counts: event?.counts ?? {},
      drawCount: event?.drawCount ?? 0,
      actorName,
      displayOrder: state.ruleset?.displayOrder,
    });
    showReplay(replay, options);
  }

  function showArchiveReplayFromCards(cards, drawCount, actorName, options = {}) {
    const replay = buildArchiveReplayFromCards({
      cards,
      drawCount,
      actorName,
      displayOrder: state.ruleset?.displayOrder,
    });
    showReplay(replay, options);
  }

  function captureSnapshot(localPlayerId) {
    return captureVisibleSnapshot(state, { localPlayerId });
  }

  function pulseZone(zone) {
    const target = getZoneElementByZone(elements, zone);
    if (!target) return Promise.resolve();
    target.classList.remove("zone-pulse");
    // force restart of pulse animation
    void target.offsetWidth;
    target.classList.add("zone-pulse");
    return new Promise((resolve) => {
      setTimeout(() => {
        target.classList.remove("zone-pulse");
        resolve();
      }, 320);
    });
  }

  function showCaption(text, zone, durationMs = 260) {
    if (!elements.feedbackCaption) {
      if (zone) return pulseZone(zone);
      return Promise.resolve();
    }
    elements.feedbackCaption.textContent = text ?? "";
    elements.feedbackCaption.classList.add("visible");
    const pulsePromise = zone ? pulseZone(zone) : Promise.resolve();
    return Promise.all([
      pulsePromise,
      new Promise((resolve) => {
        setTimeout(() => {
          if (elements.feedbackCaption.textContent === (text ?? "")) {
            elements.feedbackCaption.classList.remove("visible");
            elements.feedbackCaption.textContent = "";
          }
          resolve();
        }, durationMs);
      }),
    ]).then(() => undefined);
  }

  function playFlight(descriptor) {
    const layer = elements.feedbackLayer;
    if (!layer) return Promise.resolve();
    const fromAnchor = getAnchorByZone(elements, descriptor.fromZone);
    const toAnchor = getAnchorByZone(elements, descriptor.toZone);
    const from = getAnchorPoint(fromAnchor);
    const to = getAnchorPoint(toAnchor);
    if (!from || !to) return Promise.resolve();

    const flight = document.createElement("div");
    const useBack = descriptor.fromZone === "deck";
    const faceClass = useBack ? "card-back back" : descriptor.type;
    flight.className = `feedback-flight card ${faceClass}`;
    flight.style.left = `${from.x - 40}px`;
    flight.style.top = `${from.y - 56}px`;

    if (descriptor.count > 1) {
      const badge = document.createElement("span");
      badge.className = "flight-count";
      badge.textContent = `x${descriptor.count}`;
      flight.appendChild(badge);
    }

    layer.appendChild(flight);

    return new Promise((resolve) => {
      const deltaX = to.x - from.x;
      const deltaY = to.y - from.y;
      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        flight.removeEventListener("transitionend", onEnd);
        if (flight.parentNode) flight.parentNode.removeChild(flight);
        resolve();
      };
      const onEnd = () => cleanup();
      const raf =
        typeof requestAnimationFrame === "function"
          ? requestAnimationFrame
          : (callback) => setTimeout(callback, 0);
      raf(() => {
        flight.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.78)`;
        flight.style.opacity = "0";
      });

      flight.addEventListener("transitionend", onEnd);
      setTimeout(cleanup, 380);
    });
  }

  function runStep(step) {
    if (!step) return Promise.resolve();
    if (step.type === "caption") {
      return showCaption(step.text, step.zone, step.durationMs ?? 260);
    }
    if (step.type === "pulse") {
      return pulseZone(step.zone);
    }
    if (step.type === "move") {
      if (isReducedMotion()) {
        return pulseZone(step.descriptor?.toZone);
      }
      return playFlight(step.descriptor);
    }
    return Promise.resolve();
  }

  function animateSequence(steps = []) {
    if (!Array.isArray(steps) || steps.length === 0) return Promise.resolve(steps);
    steps.forEach((step) => {
      queue.enqueue(() => runStep(step));
    });
    return queue.flush().then(() => steps);
  }

  function animateFromSnapshots(before, after) {
    const descriptors = computeMovementDescriptors(before, after);
    if (!descriptors.length) return Promise.resolve(descriptors);
    const sequence = buildDescriptorSequence(descriptors);
    return animateSequence(sequence).then(() => descriptors);
  }

  function reset() {
    queue.clear();
    closeReplay();
    if (elements.feedbackLayer) elements.feedbackLayer.innerHTML = "";
    if (elements.feedbackCaption) {
      elements.feedbackCaption.textContent = "";
      elements.feedbackCaption.classList.remove("visible");
    }
    state.ui.replayQueue = [];
  }

  updateMotionToggleLabel();
  applyMotionClass();

  return {
    setMotionMode,
    cycleMotionMode,
    isReducedMotion,
    captureSnapshot,
    animateSequence,
    animateFromSnapshots,
    showCaption,
    showReplay,
    showArchiveReplayFromEvent,
    showArchiveReplayFromCards,
    closeReplay,
    reset,
  };
}
