import { Page } from "@playwright/test";

/**
 * Logs in as the Admin user via the login page.
 * Admin has password "admin123" (sha256 = 240be518...)
 */
export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Ваше имя").fill("Admin");
  await page.getByPlaceholder("••••••••").fill("admin123");
  await page.getByRole("button", { name: /войти/i }).click();
  // Wait for redirect to main page
  await page.waitForURL("/", { timeout: 10_000 });
}
