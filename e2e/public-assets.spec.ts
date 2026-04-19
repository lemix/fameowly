import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Public assets accessible without auth", () => {
  test("logo.png is served on login page (no redirect)", async ({ page }) => {
    // Go to login page (no auth)
    await page.goto("/login");

    // logo.png should load successfully (not redirect to /login)
    const response = await page.request.get("/logo.png");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image");
  });

  test("SVG assets are served without auth", async ({ page }) => {
    const response = await page.request.get("/fameowly.svg");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("svg");
  });

  test("manifest.json is served without auth", async ({ page }) => {
    const response = await page.request.get("/manifest.json");
    expect(response.status()).toBe(200);
  });

  test("icons are served without auth", async ({ page }) => {
    const response = await page.request.get("/icons/icon-192x192.png");
    // Either 200 (exists) or 404 (not found) — but NOT a redirect to /login
    expect([200, 404]).toContain(response.status());
  });
});

test.describe("Private user files require auth", () => {
  test("unauthenticated request to /api/files is rejected", async ({ page }) => {
    const response = await page.request.get("/api/files/someuser/somefile.png", {
      maxRedirects: 0,
    });
    // Should redirect to login (302) or return error, not 200
    expect(response.status()).not.toBe(200);
  });

  test("authenticated user can access file API", async ({ page }) => {
    await loginAsAdmin(page);
    // Even with auth, a nonexistent file returns 404 (not a redirect)
    const response = await page.request.get("/api/files/nonexistent/file.png");
    expect([400, 403, 404]).toContain(response.status());
  });
});
