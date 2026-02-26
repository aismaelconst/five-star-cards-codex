import { describe, it, expect } from "vitest";
import { createAnimationQueue } from "../src/ui/feedback/animation-queue.js";

describe("animation queue", () => {
  it("runs tasks in order", async () => {
    const queue = createAnimationQueue();
    const calls = [];

    queue.enqueue(async () => {
      calls.push("a");
      await Promise.resolve();
    });
    queue.enqueue(() => {
      calls.push("b");
    });

    await queue.flush();

    expect(calls).toEqual(["a", "b"]);
  });

  it("continues after task failure", async () => {
    const queue = createAnimationQueue();
    const calls = [];

    queue.enqueue(() => {
      calls.push("a");
      throw new Error("boom");
    });
    queue.enqueue(() => {
      calls.push("b");
    });

    await queue.flush();

    expect(calls).toEqual(["a", "b"]);
  });
});
