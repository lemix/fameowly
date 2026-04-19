import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import path from "path";
import fs from "fs";

const TMP_DIR = path.join(__dirname, ".tmp");

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function cleanupTmpDir() {
  if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true, force: true });
}

test.describe("File Attachment", () => {
  test.beforeEach(async ({ page }) => {
    ensureTmpDir();
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="chat-input-island"]', { timeout: 10_000 });
  });

  test.afterAll(() => {
    cleanupTmpDir();
  });

  test("attach a text file via paperclip and see it in the input area", async ({ page }) => {
    const filePath = path.join(TMP_DIR, "test-attachment.txt");
    fs.writeFileSync(filePath, "Hello from test file");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    const island = page.getByTestId("chat-input-island");
    await expect(island.locator(".relative.rounded-lg")).toBeVisible({ timeout: 5_000 });
    await expect(island.locator(".animate-spin")).toBeHidden({ timeout: 15_000 });
  });

  test("attach an image file and see preview thumbnail", async ({ page }) => {
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    const filePath = path.join(TMP_DIR, "test-image.png");
    fs.writeFileSync(filePath, pngBuffer);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    const island = page.getByTestId("chat-input-island");
    await expect(island.locator("img")).toBeVisible({ timeout: 5_000 });
    await expect(island.locator(".animate-spin")).toBeHidden({ timeout: 15_000 });
  });

  test("remove an attached file by clicking X", async ({ page }) => {
    const filePath = path.join(TMP_DIR, "removable.txt");
    fs.writeFileSync(filePath, "to be removed");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    const island = page.getByTestId("chat-input-island");
    await expect(island.locator(".relative.rounded-lg")).toBeVisible({ timeout: 5_000 });

    // Click the X button to remove the attachment (top-right close button)
    await island.locator(".relative.rounded-lg > button").first().click();
    await expect(island.locator(".relative.rounded-lg")).toBeHidden({ timeout: 3_000 });
  });

  test("attach multiple files at once", async ({ page }) => {
    const file1 = path.join(TMP_DIR, "multi1.txt");
    const file2 = path.join(TMP_DIR, "multi2.txt");
    fs.writeFileSync(file1, "file 1");
    fs.writeFileSync(file2, "file 2");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([file1, file2]);

    const island = page.getByTestId("chat-input-island");
    await expect(island.locator(".relative.rounded-lg")).toHaveCount(2, { timeout: 5_000 });

    // Both should finish uploading (no spinners left)
    await expect(island.locator(".animate-spin")).toHaveCount(0, { timeout: 15_000 });
  });

  test("send button is enabled when file is attached without text", async ({ page }) => {
    const filePath = path.join(TMP_DIR, "enable-send.txt");
    fs.writeFileSync(filePath, "enable send");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    const island = page.getByTestId("chat-input-island");
    await expect(island.locator(".animate-spin")).toBeHidden({ timeout: 15_000 });

    const sendBtn = island.locator('button[title="Отправить"]');
    await expect(sendBtn).not.toBeDisabled();
  });
});
