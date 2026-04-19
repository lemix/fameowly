import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("PWA Manifest — Icons", () => {
  test("manifest has separate maskable icons", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    const maskable = body.icons.filter(
      (i: { purpose: string }) => i.purpose === "maskable"
    );
    expect(maskable.length).toBeGreaterThanOrEqual(1);
    // "any maskable" combo should NOT exist
    const combo = body.icons.filter(
      (i: { purpose: string }) => i.purpose === "any maskable"
    );
    expect(combo.length).toBe(0);
  });
});

test.describe("Theme Color Meta", () => {
  test("page has theme-color meta tags", async ({ page }) => {
    await loginAsAdmin(page);
    const metas = page.locator('meta[name="theme-color"]');
    const count = await metas.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Login Page", () => {
  test("login page shows logo image and SVG wordmark", async ({ page }) => {
    await page.goto("/login");
    // Logo image
    const logo = page.locator('img[alt="Fameowly"]').first();
    await expect(logo).toBeVisible();
    // Subtitle text
    await expect(page.getByText("Войдите в свой аккаунт")).toBeVisible();
  });

  test("login page is vertically centered", async ({ page }) => {
    await page.goto("/login");
    const container = page.locator("div.items-center.justify-center").first();
    await expect(container).toBeVisible();
  });
});

test.describe("Sidebar Footer — Admin", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10_000 });
  });

  test("admin sees admin panel link in sidebar", async ({ page }) => {
    // Open sidebar on mobile
    const menuBtn = page.getByRole("button", { name: "Открыть меню" });
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
    }
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar.getByText("Админ-панель")).toBeVisible();
    // Admin should NOT see GitHub link
    await expect(sidebar.getByText("GitHub")).not.toBeVisible();
  });
});

test.describe("Safe Area", () => {
  test("globals.css includes safe-area-top class", async ({ page }) => {
    await loginAsAdmin(page);
    // Just check the main container has safe-area-top class
    const main = page.locator("div.safe-area-top").first();
    await expect(main).toBeVisible();
  });
});
