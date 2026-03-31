import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const FOUNDRY_TYPES = ["prospector", "alloy", "assayer", "smelter", "refiner"];

describe("card assets", () => {
  it("includes Foundry art files and classic style hooks", () => {
    const root = process.cwd();
    const styles = readFileSync(resolve(root, "styles.css"), "utf8");

    FOUNDRY_TYPES.forEach((type) => {
      expect(existsSync(resolve(root, `assets/cards/${type}-star.svg`))).toBe(true);
      expect(styles).toContain(`.card.${type}`);
      expect(styles).toContain(`/assets/cards/${type}-star.svg`);
    });
  });

  it("includes Foundry pixel palette rules", () => {
    const styles = readFileSync(resolve(process.cwd(), "styles.css"), "utf8");

    FOUNDRY_TYPES.forEach((type) => {
      expect(styles).toContain(`body.theme-pixel .card.${type}`);
    });
  });
});
