import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

const MOBILE = { width: 375, height: 667 };
const HYBRID = { width: 1000, height: 800 };

/** Sheet/overlay enter animations run ~200ms; measure only once they settle. */
async function settled(locator: Locator) {
  await locator.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
}

function elementTestIdAt(page: Page, x: number, y: number) {
  return page.evaluate(([px, py]) => {
    const el = document.elementFromPoint(px, py);
    return el?.closest("[data-testid]")?.getAttribute("data-testid") ?? null;
  }, [x, y] as const);
}

test.describe("Mobile layout 375x667", () => {
  test.use({ viewport: MOBILE });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("model sheet escapes the blurred header and is anchored to the viewport", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();

    const sheet = page.getByTestId("model-bottom-sheet");
    const overlay = page.getByTestId("model-sheet-overlay");
    await expect(sheet).toBeVisible();
    await settled(sheet);

    // The header carries backdrop-filter — an in-place fixed sheet would anchor to it
    expect(await sheet.evaluate((el) => el.parentElement?.tagName)).toBe("BODY");

    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.y + box.height)).toBe(MOBILE.height);
    expect(box.height).toBeLessThanOrEqual(MOBILE.height * 0.7 + 1);

    const ov = (await overlay.boundingBox())!;
    expect({ x: ov.x, y: ov.y, width: ov.width, height: ov.height }).toEqual({
      x: 0, y: 0, width: MOBILE.width, height: MOBILE.height,
    });

    // Nothing paints on top of the sheet's own area
    const hit = await elementTestIdAt(page, box.x + box.width / 2, box.y + box.height / 2);
    expect(hit).toBe("model-bottom-sheet");
  });

  test("tapping the sheet overlay closes it", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    const sheet = page.getByTestId("model-bottom-sheet");
    await expect(sheet).toBeVisible();
    await settled(sheet);

    const box = (await sheet.boundingBox())!;
    await page.mouse.click(MOBILE.width / 2, box.y / 2);
    await expect(sheet).toBeHidden();
  });

  test("burger opens the sidebar and its overlay dims the header", async ({ page }) => {
    const sidebar = page.getByTestId("sidebar");
    expect((await sidebar.boundingBox())!.x).toBeLessThan(0);

    await page.getByRole("button", { name: "Открыть меню" }).click();
    await settled(sidebar);
    expect((await sidebar.boundingBox())!.x).toBe(0);

    const overlay = page.getByTestId("sidebar-overlay");
    const ov = (await overlay.boundingBox())!;
    expect({ x: ov.x, y: ov.y, width: ov.width, height: ov.height }).toEqual({
      x: 0, y: 0, width: MOBILE.width, height: MOBILE.height,
    });

    // The header sits at z-20; the overlay must win inside the header band
    expect(await elementTestIdAt(page, MOBILE.width - 45, 35)).toBe("sidebar-overlay");

    await page.mouse.click(MOBILE.width - 45, 35);
    await expect(overlay).toBeHidden();
    await settled(sidebar);
    expect((await sidebar.boundingBox())!.x).toBeLessThan(0);
  });

  test("input island is visible and receives taps", async ({ page }) => {
    const island = page.getByTestId("chat-input-island");
    await expect(island).toBeVisible();

    const box = (await island.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(MOBILE.height);
    expect(await elementTestIdAt(page, box.x + box.width / 2, box.y + box.height / 2)).toBe(
      "chat-input-island",
    );
  });

  test("reload button stays out of the browser tab", async ({ page }) => {
    await expect(page.getByTestId("app-header")).toBeVisible();
    await expect(page.getByTestId("reload-button")).toHaveCount(0);
  });
});

test.describe("Desktop layout at the former hybrid band 1000x800", () => {
  test.use({ viewport: HYBRID });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("sidebar is inline, burger is gone, model selector opens as a popover", async ({ page }) => {
    const sidebar = page.getByTestId("sidebar");
    expect(await sidebar.evaluate((el) => getComputedStyle(el).position)).toBe("relative");
    expect((await sidebar.boundingBox())!.x).toBe(0);

    await expect(page.getByRole("button", { name: "Открыть меню" })).toBeHidden();
    await expect(page.getByTestId("sidebar-close")).toBeHidden();

    await page.getByTestId("model-selector-trigger").click();
    await expect(page.getByTestId("model-popover")).toBeVisible();
    await expect(page.getByTestId("model-bottom-sheet")).toHaveCount(0);
  });
});
