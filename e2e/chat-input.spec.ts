import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Chat Input Island", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Ensure we are on the chat mode (default)
    await page.waitForSelector('[data-testid="chat-input-island"]', { timeout: 10_000 });
  });

  test("renders the floating island container", async ({ page }) => {
    const island = page.getByTestId("chat-input-island");
    await expect(island).toBeVisible();
    // Should have rounded corners and shadow (visual check via classes)
    await expect(island).toHaveClass(/rounded-2xl/);
    await expect(island).toHaveClass(/shadow-xl/);
  });

  test("island has max-width 800px", async ({ page }) => {
    const island = page.getByTestId("chat-input-island");
    const style = await island.getAttribute("style");
    expect(style).toContain("max-width: 800px");
  });

  test("shows reasoning pill for local model", async ({ page }) => {
    // Open model selector and pick the local model
    await page.getByTestId("model-selector-trigger").click();
    // Look for local model (Qwen 3.5 122B)
    const localOption = page.getByTestId("model-option-qwen3.5-122b-a10b");
    // It might be in a popover or bottom-sheet depending on viewport
    if (await localOption.isVisible()) {
      await localOption.click();
    }
    // Check reasoning pill visibility
    const pill = page.getByTestId("reasoning-pill");
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("Думать");
  });

  test("shows temperature chips for local model", async ({ page }) => {
    // Select local model first
    await page.getByTestId("model-selector-trigger").click();
    const localOption = page.getByTestId("model-option-qwen3.5-122b-a10b");
    if (await localOption.isVisible()) {
      await localOption.click();
    }

    const tempChips = page.getByTestId("temperature-chips");
    await expect(tempChips).toBeVisible();

    // Check all three presets exist
    await expect(page.getByTestId("temp-chip-precise")).toBeVisible();
    await expect(page.getByTestId("temp-chip-balanced")).toBeVisible();
    await expect(page.getByTestId("temp-chip-creative")).toBeVisible();
  });

  test("temperature chips contain correct labels", async ({ page }) => {
    // Select local model
    await page.getByTestId("model-selector-trigger").click();
    const localOption = page.getByTestId("model-option-qwen3.5-122b-a10b");
    if (await localOption.isVisible()) {
      await localOption.click();
    }

    await expect(page.getByTestId("temp-chip-precise")).toContainText("Точно");
    await expect(page.getByTestId("temp-chip-balanced")).toContainText("Баланс");
    await expect(page.getByTestId("temp-chip-creative")).toContainText("Творчески");
  });

  test("textarea has 16px minimum font size", async ({ page }) => {
    const textarea = page.getByTestId("chat-input-island").locator("textarea");
    await expect(textarea).toBeVisible();
    const style = await textarea.getAttribute("style");
    expect(style).toContain("font-size: 16px");
  });

  test("hides reasoning pill and temp chips for cloud model", async ({ page }) => {
    // Select a cloud model (Gemini 2.5 Flash — first by default)
    await page.getByTestId("model-selector-trigger").click();
    const cloudOption = page.getByTestId("model-option-gemini-2.5-flash");
    if (await cloudOption.isVisible()) {
      await cloudOption.click();
    }

    // Reasoning pill and temp chips should not be visible
    await expect(page.getByTestId("reasoning-pill")).not.toBeVisible();
    await expect(page.getByTestId("temperature-chips")).not.toBeVisible();
  });
});
