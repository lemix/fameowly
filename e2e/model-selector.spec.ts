import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Model Selector — Desktop", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="app-header"]', { timeout: 10_000 });
  });

  test("model selector trigger is visible in header", async ({ page }) => {
    const trigger = page.getByTestId("model-selector-trigger");
    await expect(trigger).toBeVisible();
    // Should show a model name
    await expect(trigger).not.toBeEmpty();
  });

  test("clicking trigger opens desktop popover", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const popover = page.getByTestId("model-popover");
    await expect(popover).toBeVisible();
    // Bottom sheet should NOT appear on desktop
    await expect(page.getByTestId("model-bottom-sheet")).not.toBeVisible();
  });

  test("popover shows tier group headers", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const popover = page.getByTestId("model-popover");
    await expect(popover).toBeVisible();

    // Tier labels should be present
    await expect(popover).toContainText("Базовые");
    await expect(popover).toContainText("Продвинутые");
    await expect(popover).toContainText("Ультра");
  });

  test("local model shows 'Наш сервер' badge for admin", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const localModel = page.getByTestId("model-option-qwen3.5-122b-a10b");
    await expect(localModel).toBeVisible();
    await expect(localModel).toContainText("Наш сервер");
    await expect(localModel).toContainText("Бесплатно");
  });

  test("ultra model shows 'Дорого' badge for admin", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const ultraModel = page.getByTestId("model-option-anthropic/claude-sonnet-4.6");
    await expect(ultraModel).toBeVisible();
    await expect(ultraModel).toContainText("Дорого");
  });

  test("selecting a model updates the trigger text", async ({ page }) => {
    const trigger = page.getByTestId("model-selector-trigger");
    await trigger.click();

    // Select DeepSeek
    const option = page.getByTestId("model-option-deepseek/deepseek-v3.2");
    await option.click();

    // Popover should close
    await expect(page.getByTestId("model-popover")).not.toBeVisible();
    // Trigger should now show the selected model
    await expect(trigger).toContainText("DeepSeek V3.2");
  });

  test("clicking outside closes the popover", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await expect(page.getByTestId("model-popover")).toBeVisible();

    // Click on header area outside the popover
    await page.getByTestId("reload-button").click();
    await expect(page.getByTestId("model-popover")).not.toBeVisible();
  });
});

test.describe("Model Selector — Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="app-header"]', { timeout: 10_000 });
  });

  test("clicking trigger opens bottom sheet on mobile", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const sheet = page.getByTestId("model-bottom-sheet");
    await expect(sheet).toBeVisible();
    // Desktop popover should NOT appear on mobile
    await expect(page.getByTestId("model-popover")).not.toBeVisible();
  });

  test("bottom sheet shows 'Выбор модели' title", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const sheet = page.getByTestId("model-bottom-sheet");
    await expect(sheet).toContainText("Выбор модели");
  });

  test("bottom sheet shows tier groups", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const sheet = page.getByTestId("model-bottom-sheet");
    await expect(sheet).toContainText("Базовые");
    await expect(sheet).toContainText("Продвинутые");
  });

  test("selecting a model closes bottom sheet", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const sheet = page.getByTestId("model-bottom-sheet");
    await expect(sheet).toBeVisible();

    const option = page.getByTestId("model-option-gemini-2.5-flash");
    await option.click();

    await expect(sheet).not.toBeVisible();
  });

  test("model options have minimum 44px touch target", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const option = page.getByTestId("model-option-gemini-2.5-flash");
    await expect(option).toBeVisible();
    await expect(option).toHaveClass(/min-h-\[44px\]/);
  });
});

test.describe("Model Selector — no model in sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10_000 });
  });

  test("sidebar does not contain a model dropdown", async ({ page }) => {
    const sidebar = page.getByTestId("sidebar");
    // Model selector should only be in the header, not in the sidebar
    await expect(sidebar.getByTestId("model-selector-trigger")).not.toBeVisible();
  });
});
