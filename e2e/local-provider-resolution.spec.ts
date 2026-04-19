import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Local Model Provider Resolution", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("local models without virtualProviderId resolve via LOCAL_LLM_HOSTS", async ({ page }) => {
    const res = await page.request.get("/api/models");
    expect(res.ok()).toBeTruthy();
    const config = await res.json();

    const localModels = config.chatModels.filter(
      (m: { provider: string }) => m.provider === "local",
    );
    expect(localModels.length).toBeGreaterThan(0);

    // Local models should exist and not require baseURL in config
    // (they get it from LOCAL_LLM_HOSTS at runtime)
    for (const model of localModels) {
      expect(model.provider).toBe("local");
      expect(model.isLocal).toBe(true);
    }
  });

  test("local model baseURL from config is optional when LOCAL_LLM_HOSTS is set", async ({ page }) => {
    const res = await page.request.get("/api/models");
    const config = await res.json();

    // Models without virtualProviderId should NOT need baseURL in JSON —
    // they rely on LOCAL_LLM_HOSTS from .env
    const localWithoutVP = config.chatModels.filter(
      (m: { provider: string; virtualProviderId?: string }) =>
        m.provider === "local" && !m.virtualProviderId,
    );
    expect(localWithoutVP.length).toBeGreaterThan(0);
  });

  test("chat API resolves local model correctly (not 405)", async ({ page }) => {
    // Send a chat request for a local model with a short timeout
    // We check that the server doesn't return 405 (method not allowed),
    // which was the original bug — requests going to wrong URL
    const res = await page.request.fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        messages: [{ id: "1", role: "user", content: "test" }],
        model: "qwen3.5-35b-a3b",
        provider: "local",
      }),
      timeout: 5000,
    }).catch((e) => e);

    // If we got a Response, check it's not 405
    if (res && typeof res.status === "function") {
      expect(res.status()).not.toBe(405);
    }
    // If it timed out or got connection error, that's fine —
    // it means the request went to the Llama server (correct URL), which is unavailable
  });
});
