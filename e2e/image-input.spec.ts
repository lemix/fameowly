import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Image Input Island", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Switch to image mode via sidebar tab
    const imageTab = page.getByRole("button", { name: /изображен/i });
    await imageTab.click();
    await page.waitForSelector('[data-testid="image-input-island"]', { timeout: 10_000 });
  });

  test("renders the floating image island", async ({ page }) => {
    const island = page.getByTestId("image-input-island");
    await expect(island).toBeVisible();
    await expect(island).toHaveClass(/rounded-2xl/);
    await expect(island).toHaveClass(/shadow-xl/);
  });

  test("island has max-width constraint", async ({ page }) => {
    const island = page.getByTestId("image-input-island");
    await expect(island).toHaveClass(/max-w-4xl/);
  });

  test("shows all aspect ratio chips", async ({ page }) => {
    const chipContainer = page.getByTestId("aspect-ratio-chips");
    await expect(chipContainer).toBeVisible();

    // All 7 aspect ratios
    const ratios = ["16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16"];
    for (const r of ratios) {
      await expect(page.getByTestId(`aspect-chip-${r}`)).toBeVisible();
    }
  });

  test("aspect ratio chips contain SVG icons", async ({ page }) => {
    // Each chip should have an SVG element inside
    const firstChip = page.getByTestId("aspect-chip-16:9");
    const svg = firstChip.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("selecting aspect ratio chip highlights it", async ({ page }) => {
    const chip = page.getByTestId("aspect-chip-1:1");
    await chip.click();
    // Active chip should have blue styling
    await expect(chip).toHaveClass(/bg-blue-600/);
  });

  test("shows resolution chips with label", async ({ page }) => {
    const resContainer = page.getByTestId("resolution-chips");
    await expect(resContainer).toBeVisible();
    // "Качество:" label
    await expect(resContainer).toContainText("Качество:");
    // Resolution chips
    await expect(page.getByTestId("resolution-chip-1K")).toBeVisible();
    await expect(page.getByTestId("resolution-chip-2K")).toBeVisible();
    await expect(page.getByTestId("resolution-chip-4K")).toBeVisible();
  });

  test("selecting resolution chip highlights it", async ({ page }) => {
    const chip = page.getByTestId("resolution-chip-4K");
    await chip.click();
    await expect(chip).toHaveClass(/bg-blue-600/);
  });
});

test.describe("Image Input — Mobile scrolling", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    const imageTab = page.getByRole("button", { name: /изображен/i });
    await imageTab.click();
    await page.waitForSelector('[data-testid="image-input-island"]', { timeout: 10_000 });
  });

  test("aspect ratio chips container is horizontally scrollable on mobile", async ({ page }) => {
    const chipContainer = page.getByTestId("aspect-ratio-chips");
    await expect(chipContainer).toBeVisible();
    await expect(chipContainer).toHaveClass(/overflow-x-auto/);
  });
});
