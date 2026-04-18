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
    await expect(trigger).not.toBeEmpty();
  });

  test("clicking trigger opens desktop popover", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const popover = page.getByTestId("model-popover");
    await expect(popover).toBeVisible();
    await expect(page.getByTestId("model-bottom-sheet")).not.toBeVisible();
  });

  test("popover shows segmented control tabs", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const tabs = page.getByTestId("model-tabs");
    await expect(tabs).toBeVisible();
    await expect(page.getByTestId("tab-world")).toBeVisible();
    await expect(page.getByTestId("tab-local")).toBeVisible();
  });

  test("default tab matches selected model (world for cloud model)", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const worldTab = page.getByTestId("tab-world");
    await expect(worldTab).toHaveClass(/bg-th-subtle/);
    await expect(page.getByTestId("tab-banner-world")).toBeVisible();
  });

  test("world tab shows tier group headers", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const popover = page.getByTestId("model-popover");
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("Базовые");
    await expect(popover).toContainText("Продвинутые");
    await expect(popover).toContainText("Ультра");
  });

  test("switching to Fameowly tab shows local models and banner", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.getByTestId("tab-local").click();
    await expect(page.getByTestId("tab-banner-local")).toBeVisible();
    await expect(page.getByTestId("tab-banner-local")).toContainText("fameowly");
    const localModel = page.getByTestId("model-option-qwen3.5-122b-a10b");
    await expect(localModel).toBeVisible();
    await expect(localModel).toContainText("Бесплатно");
  });

  test("local models are hidden on world tab", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await expect(page.getByTestId("model-option-qwen3.5-122b-a10b")).not.toBeVisible();
    await expect(page.getByTestId("model-option-gemma-31b-it")).not.toBeVisible();
  });

  test("world models are hidden on Fameowly tab", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.getByTestId("tab-local").click();
    await expect(page.getByTestId("model-option-gemini-flash-latest")).not.toBeVisible();
  });

  test("ultra model shows 'Дорого' badge for admin on desktop", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const ultraModel = page.getByTestId("model-option-openai/gpt-5.4");
    await expect(ultraModel).toBeVisible();
    await expect(ultraModel).toContainText("Дорого");
  });

  test("basic/advanced models do NOT show 'Дорого' for admin", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const basicModel = page.getByTestId("model-option-gemini-flash-latest");
    await expect(basicModel).toBeVisible();
    await expect(basicModel).not.toContainText("Дорого");
    const advModel = page.getByTestId("model-option-deepseek/deepseek-v3.2");
    await expect(advModel).not.toContainText("Дорого");
  });

  test("active model has check icon", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const activeOption = page.getByTestId("model-check-icon");
    await expect(activeOption.first()).toBeVisible();
  });

  test("check icon appears immediately on selection (visual confirmation)", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const target = page.getByTestId("model-option-deepseek/deepseek-v3.2");
    await target.click();
    const check = target.getByTestId("model-check-icon");
    await expect(check).toBeVisible();
    await expect(page.getByTestId("model-popover")).not.toBeVisible();
  });

  test("selecting a model updates the trigger text", async ({ page }) => {
    const trigger = page.getByTestId("model-selector-trigger");
    await trigger.click();
    const option = page.getByTestId("model-option-deepseek/deepseek-v3.2");
    await option.click();
    await expect(page.getByTestId("model-popover")).not.toBeVisible();
    await expect(trigger).toContainText("DeepSeek V3.2");
  });

  test("clicking outside closes the popover", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await expect(page.getByTestId("model-popover")).toBeVisible();
    await page.getByTestId("reload-button").click();
    await expect(page.getByTestId("model-popover")).not.toBeVisible();
  });

  test("all model items use unified style (no special local styling)", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.getByTestId("tab-local").click();
    const localModel = page.getByTestId("model-option-qwen3.5-122b-a10b");
    await expect(localModel).toBeVisible();
    await expect(localModel).not.toHaveClass(/border-l-2/);
    await expect(localModel).not.toContainText("Приватная модель");
  });

  test("selecting local model then reopening shows Fameowly tab", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.getByTestId("tab-local").click();
    await page.getByTestId("model-option-qwen3.5-122b-a10b").click();
    await expect(page.getByTestId("model-popover")).not.toBeVisible();

    await page.getByTestId("model-selector-trigger").click();
    const localTab = page.getByTestId("tab-local");
    await expect(localTab).toHaveClass(/bg-th-subtle/);
    await expect(page.getByTestId("model-option-qwen3.5-122b-a10b")).toBeVisible();
  });
});

test.describe("Model Selector — Mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="app-header"]', { timeout: 10_000 });
  });

  test("clicking trigger opens bottom sheet on mobile", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const sheet = page.getByTestId("model-bottom-sheet");
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId("model-popover")).not.toBeVisible();
  });

  test("bottom sheet shows 'Выбор модели' title", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const sheet = page.getByTestId("model-bottom-sheet");
    await expect(sheet).toContainText("Выбор модели");
  });

  test("bottom sheet shows tabs and tier groups", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const sheet = page.getByTestId("model-bottom-sheet");
    await expect(sheet.getByTestId("model-tabs")).toBeVisible();
    await expect(sheet).toContainText("Базовые");
    await expect(sheet).toContainText("Продвинутые");
  });

  test("selecting a model closes bottom sheet", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const sheet = page.getByTestId("model-bottom-sheet");
    await expect(sheet).toBeVisible();
    await page.getByTestId("model-option-gemini-flash-latest").click();
    await expect(sheet).not.toBeVisible();
  });

  test("Fameowly tab shows local models on mobile", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.getByTestId("tab-local").click();
    const localModel = page.getByTestId("model-option-qwen3.5-122b-a10b");
    await expect(localModel).toBeVisible();
    await expect(localModel).not.toHaveClass(/border-l-2/);
  });

  test("active model shows check icon on mobile", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const checkIcon = page.getByTestId("model-check-icon");
    await expect(checkIcon.first()).toBeVisible();
  });

  test("no horizontal scroll on mobile viewport", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-bottom-sheet"]', { timeout: 5_000 });
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHScroll).toBe(false);
  });

  test("tapping overlay closes bottom sheet", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const sheet = page.getByTestId("model-bottom-sheet");
    await expect(sheet).toBeVisible();
    // Click the top area of the overlay (above the bottom sheet)
    await page.getByTestId("model-sheet-overlay").click({ position: { x: 195, y: 50 } });
    await expect(sheet).not.toBeVisible();
  });
});

test.describe("Model Selector — no model in sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10_000 });
  });

  test("sidebar does not contain a model dropdown", async ({ page }) => {
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar.getByTestId("model-selector-trigger")).not.toBeVisible();
  });
});
