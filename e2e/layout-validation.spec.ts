import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

/**
 * Layout Validation — Scale Harmony & Geometry Checks
 *
 * These tests verify computed styles and bounding boxes to ensure
 * the "Scale Clash" is resolved and all UI elements are harmonious.
 */

test.describe("Layout Validation — Desktop", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="app-header"]', { timeout: 10_000 });
  });

  test("all model list items have strictly identical height (cloud vs local)", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-popover"]', { timeout: 5_000 });

    const result = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-testid^="model-option-"]');
      const heights = Array.from(items).map((el) => ({
        id: el.getAttribute("data-testid"),
        height: (el as HTMLElement).offsetHeight,
      }));
      return heights;
    });

    expect(result.length).toBeGreaterThan(0);
    const referenceHeight = result[0].height;

    // All items must be exactly the same height
    for (const item of result) {
      expect(item.height, `${item.id} height ${item.height} ≠ reference ${referenceHeight}`).toBe(referenceHeight);
    }

    // Height must be exactly 56px (explicit pixel value)
    expect(referenceHeight).toBe(56);
  });

  test("cloud model and local model (Qwen) have identical height (zero tolerance)", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-popover"]', { timeout: 5_000 });

    const heights = await page.evaluate(() => {
      const cloud = document.querySelector('[data-testid="model-option-gemini-2.5-flash"]') as HTMLElement;
      const local = document.querySelector('[data-testid="model-option-qwen3.5-122b-a10b"]') as HTMLElement;
      if (!cloud || !local) throw new Error("Model options not found");
      return {
        cloudHeight: cloud.offsetHeight,
        localHeight: local.offsetHeight,
      };
    });

    expect(heights.cloudHeight).toBe(heights.localHeight);
    expect(heights.cloudHeight).toBe(56);
  });

  test("model popover uses rounded-2xl (16px) matching input island", async ({ page }) => {
    // Get input island border-radius
    const inputRadius = await page.evaluate(() => {
      const island = document.querySelector('[data-testid="chat-input-island"]');
      if (!island) throw new Error("Chat input island not found");
      return getComputedStyle(island).borderRadius;
    });

    // Open model selector and get popover border-radius
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-popover"]', { timeout: 5_000 });

    const popoverRadius = await page.evaluate(() => {
      const popover = document.querySelector('[data-testid="model-popover"]');
      if (!popover) throw new Error("Popover not found");
      return getComputedStyle(popover).borderRadius;
    });

    // Both should be rounded-2xl = 16px
    expect(inputRadius).toBe("16px");
    expect(popoverRadius).toBe("16px");
  });

  test("model items use rounded-xl (12px) inner radius", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-popover"]', { timeout: 5_000 });

    const itemRadius = await page.evaluate(() => {
      const item = document.querySelector('[data-testid="model-option-gemini-2.5-flash"]');
      if (!item) throw new Error("Model item not found");
      return getComputedStyle(item).borderRadius;
    });

    expect(itemRadius).toBe("12px");
  });

  test("active model has visible ring (box-shadow)", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-popover"]', { timeout: 5_000 });

    // The default selected model should have bg-white/10 + ring
    const activeCheck = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-testid^="model-option-"]');
      for (const item of items) {
        const check = item.querySelector('[data-testid="model-check-icon"]');
        if (check) {
          const cs = getComputedStyle(item);
          return {
            hasRing: cs.boxShadow !== "none" && cs.boxShadow !== "",
            bgColor: cs.backgroundColor,
          };
        }
      }
      throw new Error("No active model with check icon found");
    });

    expect(activeCheck.hasRing).toBe(true);
  });

  test("system prompt preset buttons have correct geometry", async ({ page }) => {
    const preset = page.getByTestId("preset-default");
    await expect(preset).toBeVisible();

    const styles = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="preset-default"]');
      if (!btn) throw new Error("Preset button not found");
      const cs = getComputedStyle(btn);
      const rect = btn.getBoundingClientRect();
      return {
        paddingLeft: parseFloat(cs.paddingLeft),
        paddingTop: parseFloat(cs.paddingTop),
        borderRadius: cs.borderRadius,
        minHeight: cs.minHeight,
        actualHeight: rect.height,
        display: cs.display,
      };
    });

    // px-4 = 16px padding
    expect(styles.paddingLeft).toBeGreaterThanOrEqual(16);
    // py-3 = 12px padding
    expect(styles.paddingTop).toBeGreaterThanOrEqual(12);
    // rounded-xl = 12px
    expect(styles.borderRadius).toBe("12px");
    // min-h-[3.5rem] = 56px
    expect(styles.minHeight).toBe("56px");
    // Actual height must be at least 56px
    expect(styles.actualHeight).toBeGreaterThanOrEqual(56);
    // Must use flex layout
    expect(styles.display).toBe("flex");
  });

  test("active preset button has ring accent", async ({ page }) => {
    const preset = page.getByTestId("preset-default");
    await expect(preset).toBeVisible();

    const hasRing = await preset.evaluate((el) => {
      const cs = getComputedStyle(el);
      // ring-1 ring-blue-500/30 compiles to box-shadow
      return cs.boxShadow !== "none" && cs.boxShadow !== "";
    });

    expect(hasRing).toBe(true);
  });

  test("all preset buttons have identical border-radius", async ({ page }) => {
    const radii = await page.evaluate(() => {
      const btns = document.querySelectorAll('[data-testid^="preset-"]');
      return Array.from(btns).map((btn) => ({
        id: btn.getAttribute("data-testid"),
        radius: getComputedStyle(btn).borderRadius,
      }));
    });

    expect(radii.length).toBeGreaterThan(0);
    for (const item of radii) {
      expect(item.radius, `${item.id} should have 12px radius`).toBe("12px");
    }
  });

  test("model item icons have consistent 20px optical weight", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-popover"]', { timeout: 5_000 });

    const iconSizes = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-testid^="model-option-"]');
      const sizes: { id: string | null; width: number; height: number }[] = [];
      items.forEach((item) => {
        // First SVG child is the model icon (Shield or Sparkles)
        const svg = item.querySelector("svg");
        if (svg) {
          const rect = svg.getBoundingClientRect();
          sizes.push({
            id: item.getAttribute("data-testid"),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      });
      return sizes;
    });

    expect(iconSizes.length).toBeGreaterThan(0);
    for (const icon of iconSizes) {
      // w-5 h-5 = 20px (allow ±1px for subpixel rendering)
      expect(icon.width, `${icon.id} icon width`).toBeGreaterThanOrEqual(19);
      expect(icon.width, `${icon.id} icon width`).toBeLessThanOrEqual(21);
      expect(icon.height, `${icon.id} icon height`).toBeGreaterThanOrEqual(19);
      expect(icon.height, `${icon.id} icon height`).toBeLessThanOrEqual(21);
    }
  });
});

test.describe("Layout Validation — Mobile (iPhone 12)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="app-header"]', { timeout: 10_000 });
  });

  test("model items have uniform height on mobile bottom sheet", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-bottom-sheet"]', { timeout: 5_000 });

    const heights = await page.evaluate(() => {
      const cloud = document.querySelector('[data-testid="model-option-gemini-2.5-flash"]') as HTMLElement;
      const local = document.querySelector('[data-testid="model-option-qwen3.5-122b-a10b"]') as HTMLElement;
      if (!cloud || !local) throw new Error("Model options not found");
      return {
        cloudHeight: cloud.offsetHeight,
        localHeight: local.offsetHeight,
      };
    });

    expect(heights.cloudHeight).toBe(heights.localHeight);
    expect(heights.cloudHeight).toBe(56);
  });

  test("price badge containers are not squeezed to zero width on mobile", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-bottom-sheet"]', { timeout: 5_000 });

    const badgeWidths = await page.evaluate(() => {
      const badges = document.querySelectorAll(
        '[data-testid="badge-free"], [data-testid="badge-expensive"], [data-testid="badge-price"]'
      );
      return Array.from(badges).map((b) => ({
        testId: b.getAttribute("data-testid"),
        width: b.getBoundingClientRect().width,
      }));
    });

    for (const badge of badgeWidths) {
      expect(badge.width, `${badge.testId} must not be zero-width`).toBeGreaterThan(0);
    }
  });

  test("model names have proper truncation CSS on narrow viewport", async ({ page }) => {
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-bottom-sheet"]', { timeout: 5_000 });

    const truncationOk = await page.evaluate(() => {
      const nameSpans = document.querySelectorAll('[data-testid^="model-option-"] .truncate');
      return Array.from(nameSpans).every((n) => {
        const cs = getComputedStyle(n);
        return (
          cs.overflow === "hidden" &&
          cs.textOverflow === "ellipsis" &&
          cs.whiteSpace === "nowrap"
        );
      });
    });

    expect(truncationOk).toBe(true);
  });

  test("system prompt cards render at correct size on mobile", async ({ page }) => {
    const preset = page.getByTestId("preset-default");
    await expect(preset).toBeVisible();

    const styles = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="preset-default"]');
      if (!btn) throw new Error("Preset button not found");
      const cs = getComputedStyle(btn);
      const rect = btn.getBoundingClientRect();
      return {
        height: rect.height,
        borderRadius: cs.borderRadius,
        paddingLeft: parseFloat(cs.paddingLeft),
      };
    });

    expect(styles.height).toBeGreaterThanOrEqual(56);
    expect(styles.borderRadius).toBe("12px");
    expect(styles.paddingLeft).toBeGreaterThanOrEqual(16);
  });

  test("no horizontal overflow on mobile viewport", async ({ page }) => {
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBe(false);
  });
});

test.describe("Layout Validation — Global Harmony", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForSelector('[data-testid="app-header"]', { timeout: 10_000 });
  });

  test("border-radius consistency: input island = model popover (rounded-2xl)", async ({ page }) => {
    const inputRadius = await page.evaluate(() => {
      const island = document.querySelector('[data-testid="chat-input-island"]');
      if (!island) throw new Error("Chat input island not found");
      return getComputedStyle(island).borderRadius;
    });

    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-popover"]', { timeout: 5_000 });

    const popoverRadius = await page.evaluate(() => {
      const popover = document.querySelector('[data-testid="model-popover"]');
      if (!popover) throw new Error("Popover not found");
      return getComputedStyle(popover).borderRadius;
    });

    expect(inputRadius).toBe(popoverRadius);
  });

  test("border-radius consistency: model items = preset buttons (rounded-xl)", async ({ page }) => {
    // Get preset button radius
    const presetRadius = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="preset-default"]');
      if (!btn) throw new Error("Preset button not found");
      return getComputedStyle(btn).borderRadius;
    });

    // Open model selector and get item radius
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-popover"]', { timeout: 5_000 });

    const itemRadius = await page.evaluate(() => {
      const item = document.querySelector('[data-testid="model-option-gemini-2.5-flash"]');
      if (!item) throw new Error("Model item not found");
      return getComputedStyle(item).borderRadius;
    });

    // Both inner elements should be rounded-xl = 12px
    expect(presetRadius).toBe("12px");
    expect(itemRadius).toBe("12px");
  });

  test("scale harmony: preset min-height matches model item height", async ({ page }) => {
    // Get preset button min-height
    const presetMinHeight = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="preset-default"]');
      if (!btn) throw new Error("Preset button not found");
      return getComputedStyle(btn).minHeight;
    });

    // Open model selector and get item height
    await page.getByTestId("model-selector-trigger").click();
    await page.waitForSelector('[data-testid="model-popover"]', { timeout: 5_000 });

    const modelItemHeight = await page.evaluate(() => {
      const item = document.querySelector('[data-testid="model-option-gemini-2.5-flash"]') as HTMLElement;
      if (!item) throw new Error("Model item not found");
      return item.offsetHeight;
    });

    // Preset min-h-[3.5rem] = 56px, model item h-[56px] = 56px
    expect(presetMinHeight).toBe("56px");
    expect(modelItemHeight).toBe(56);
  });
});
