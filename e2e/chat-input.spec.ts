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
    // Look for local model (Qwen 3.5 122B) — might need to scroll in popover
    const localOption = page.getByTestId("model-option-qwen3.5-122b-a10b");
    await localOption.scrollIntoViewIfNeeded();
    await expect(localOption).toBeVisible();
    await localOption.click();
    // Check reasoning pill visibility
    const pill = page.getByTestId("reasoning-pill");
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("Думать");
  });

  test("shows temperature chips for local model", async ({ page }) => {
    // Select local model first
    await page.getByTestId("model-selector-trigger").click();
    const localOption = page.getByTestId("model-option-qwen3.5-122b-a10b");
    await localOption.scrollIntoViewIfNeeded();
    await expect(localOption).toBeVisible();
    await localOption.click();

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
    await localOption.scrollIntoViewIfNeeded();
    await expect(localOption).toBeVisible();
    await localOption.click();

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

  test("hides reasoning pill for cloud model without reasoning support", async ({ page }) => {
    // Select Gemini Flash (supports temperature but NOT reasoning)
    await page.getByTestId("model-selector-trigger").click();
    const cloudOption = page.getByTestId("model-option-gemini-flash-latest");
    await cloudOption.scrollIntoViewIfNeeded();
    await expect(cloudOption).toBeVisible();
    await cloudOption.click();

    // Reasoning pill should not be visible (model doesn't support it)
    await expect(page.getByTestId("reasoning-pill")).not.toBeVisible();
    // Temperature chips SHOULD be visible (model supports temperature)
    await expect(page.getByTestId("temperature-chips")).toBeVisible();
  });

  test("shows reasoning pill for cloud model with reasoning support", async ({ page }) => {
    // Select DeepSeek R1 (openrouter, supports both reasoning + temperature)
    await page.getByTestId("model-selector-trigger").click();
    const reasoningOption = page.getByTestId("model-option-deepseek/deepseek-r1-distill-llama-70b");
    await reasoningOption.scrollIntoViewIfNeeded();
    await expect(reasoningOption).toBeVisible();
    await reasoningOption.click();

    // Both reasoning pill and temp chips should be visible
    await expect(page.getByTestId("reasoning-pill")).toBeVisible();
    await expect(page.getByTestId("temperature-chips")).toBeVisible();
  });
});
