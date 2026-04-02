import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("App Header", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="app-header"]', { timeout: 10_000 });
  });

  test("header is visible at the top", async ({ page }) => {
    const header = page.getByTestId("app-header");
    await expect(header).toBeVisible();
  });

  test("reload button is present in header", async ({ page }) => {
    const btn = page.getByTestId("reload-button");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("title", "Перезагрузить");
  });

  test("model selector is present in header", async ({ page }) => {
    const trigger = page.getByTestId("model-selector-trigger");
    await expect(trigger).toBeVisible();
  });
});

test.describe("App Header — Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="app-header"]', { timeout: 10_000 });
  });

  test("shows hamburger menu button on mobile", async ({ page }) => {
    const menuBtn = page.getByRole("button", { name: "Открыть меню" });
    await expect(menuBtn).toBeVisible();
  });

  test("reload button is visible on mobile", async ({ page }) => {
    await expect(page.getByTestId("reload-button")).toBeVisible();
  });
});

test.describe("PWA", () => {
  test("manifest.json is accessible", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body.name).toBe("FaMeowly");
    expect(body.display).toBe("standalone");
  });

  test("service worker script is accessible", async ({ page }) => {
    const response = await page.goto("/sw.js");
    expect(response?.status()).toBe(200);
    const text = await response?.text();
    expect(text).toContain("CACHE_NAME");
  });

  test("page uses 100dvh layout", async ({ page }) => {
    await loginAsAdmin(page);
    const main = page.locator("div.h-\\[100dvh\\]");
    await expect(main).toBeVisible();
  });
});

test.describe("Error Boundary", () => {
  test("app renders without crashing", async ({ page }) => {
    await loginAsAdmin(page);
    // Verify the main page loaded correctly (error boundary didn't catch)
    await expect(page.getByTestId("app-header")).toBeVisible();
    // The error boundary fallback should NOT be visible
    await expect(page.getByText("Ой, что-то пошло не так")).not.toBeVisible();
  });
});
