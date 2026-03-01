import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadIndexDom() {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = (bodyMatch ? bodyMatch[1] : html).replace(
    /<script[\s\S]*?<\/script>/gi,
    ""
  );
  return new DOMParser().parseFromString(`<body>${bodyContent}</body>`, "text/html");
}

describe("index layout", () => {
  it("renders table-lane as deck, archive, discard", () => {
    const document = loadIndexDom();
    const lane = document.querySelector(".table-lane");
    expect(lane).not.toBeNull();

    const childIds = Array.from(lane.children).map((node) => node.id);
    expect(childIds).toEqual(["deckZone", "archiveZone", "discardZone"]);
  });

  it("renders lower zones as active then hand", () => {
    const document = loadIndexDom();
    const zones = document.querySelector(".zones");
    expect(zones).not.toBeNull();

    const childIds = Array.from(zones.children).map((node) => node.id);
    expect(childIds).toEqual(["activeZone", "handZone"]);
  });

  it("places feedback caption inside archive zone", () => {
    const document = loadIndexDom();
    const archiveZone = document.getElementById("archiveZone");
    const caption = document.getElementById("feedbackCaption");
    expect(archiveZone).not.toBeNull();
    expect(caption).not.toBeNull();
    expect(archiveZone.contains(caption)).toBe(true);
  });
});
