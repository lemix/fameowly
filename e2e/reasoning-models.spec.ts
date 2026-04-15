import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

/**
 * E2E tests for reasoning models (local llama.cpp provider).
 * Requires local LLM servers to be running:
 *   - qwen3.5-122b-a10b at LOCAL_LLM_HOSTS port 8080
 *   - gemma-31b-it at LOCAL_LLM_HOSTS port 8081
 */

test.describe("Reasoning Models — Local LLM", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="chat-input-island"]', { timeout: 15_000 });
  });

  test("Qwen 3.5: reasoning + response with thinking enabled", async ({ page }) => {
    test.setTimeout(240_000); // Qwen reasoning can be slow on quantized models

    // Select Qwen model — switch to Fameowly tab
    await page.getByTestId("model-selector-trigger").click();
    await page.getByTestId("tab-local").click();
    const qwenOption = page.getByTestId("model-option-qwen3.5-122b-a10b");
    await qwenOption.scrollIntoViewIfNeeded();
    await qwenOption.click();

    // Ensure reasoning is enabled (pill should be active/purple)
    const pill = page.getByTestId("reasoning-pill");
    await expect(pill).toBeVisible();
    // If reasoning is disabled, click to enable
    const pillClass = await pill.getAttribute("class");
    if (!pillClass?.includes("bg-purple-600")) await pill.click();

    // Send a simple message
    const textarea = page.getByTestId("chat-input-island").locator("textarea");
    await textarea.fill("What is 2+2? Answer in one word.");
    await textarea.press("Enter");

    // Reasoning phase should appear (the model thinks)
    await expect(page.locator("text=Нейросеть рассуждает").first()).toBeVisible({ timeout: 30_000 });

    // Wait for the response to appear (assistant message with content)
    const assistantMessage = page.locator('[class*="prose"]').first();
    await expect(assistantMessage).toBeVisible({ timeout: 180_000 });

    // After streaming completes, reasoning block should show "Размышления"
    await expect(page.locator("text=Размышления").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Gemma 31B: reasoning + response with thinking enabled", async ({ page }) => {
    // Select Gemma model — switch to Fameowly tab
    await page.getByTestId("model-selector-trigger").click();
    await page.getByTestId("tab-local").click();
    const gemmaOption = page.getByTestId("model-option-gemma-31b-it");
    await gemmaOption.scrollIntoViewIfNeeded();
    await gemmaOption.click();

    // Ensure reasoning is enabled
    const pill = page.getByTestId("reasoning-pill");
    await expect(pill).toBeVisible();
    const pillClass = await pill.getAttribute("class");
    if (!pillClass?.includes("bg-purple-600")) await pill.click();

    // Send a simple message
    const textarea = page.getByTestId("chat-input-island").locator("textarea");
    await textarea.fill("What is 2+2? Answer in one word.");
    await textarea.press("Enter");

    // Reasoning should appear
    await expect(page.locator("text=Нейросеть рассуждает").first()).toBeVisible({ timeout: 30_000 });

    // Wait for the final response
    const assistantMessage = page.locator('[class*="prose"]').first();
    await expect(assistantMessage).toBeVisible({ timeout: 120_000 });

    // Reasoning block should be present
    await expect(page.locator("text=Размышления").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Qwen 3.5: no reasoning block when thinking disabled", async ({ page }) => {
    // Select Qwen model — switch to Fameowly tab
    await page.getByTestId("model-selector-trigger").click();
    await page.getByTestId("tab-local").click();
    const qwenOption = page.getByTestId("model-option-qwen3.5-122b-a10b");
    await qwenOption.scrollIntoViewIfNeeded();
    await qwenOption.click();

    // Disable reasoning — click pill so it becomes inactive (gray)
    const pill = page.getByTestId("reasoning-pill");
    await expect(pill).toBeVisible();
    const pillClass = await pill.getAttribute("class");
    if (pillClass?.includes("bg-purple-600")) await pill.click();

    // Send a message
    const textarea = page.getByTestId("chat-input-island").locator("textarea");
    await textarea.fill("What is 2+2? Answer in one word.");
    await textarea.press("Enter");

    // Wait for the response (should come faster without reasoning)
    const assistantMessage = page.locator('[class*="prose"]').first();
    await expect(assistantMessage).toBeVisible({ timeout: 120_000 });

    // There should be NO reasoning block
    await expect(page.locator("text=Размышления")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Нейросеть рассуждает")).not.toBeVisible();
  });
});
