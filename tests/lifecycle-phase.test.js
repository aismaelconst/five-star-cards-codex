import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/game/state.js";
import { normalizeOnlinePhase } from "../src/game/lifecycle.js";

describe("normalizeOnlinePhase", () => {
  it("moves online between phase to main", () => {
    const state = createInitialState({ mode: "online" });
    state.phase = "between";
    const changed = normalizeOnlinePhase(state);
    expect(changed).toBe(true);
    expect(state.phase).toBe("main");
  });

  it("does not change offline phase", () => {
    const state = createInitialState({ mode: "offline" });
    state.phase = "between";
    const changed = normalizeOnlinePhase(state);
    expect(changed).toBe(false);
    expect(state.phase).toBe("between");
  });
});
