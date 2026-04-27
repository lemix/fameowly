/**
 * E2E check: gemini-3.1-pro-preview via our BaseModelFactory using location=global.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import fs from "fs";
import { streamText, generateText } from "ai";
import type { LanguageModel } from "ai";
import { BaseModelFactory } from "../lib/strategies/base-model-factory";
import type { ResolvedCredentials } from "../lib/types";

async function run(modelId: string, location: string) {
  console.log(`\n══════ ${modelId} @ ${location} ══════`);
  const factory = new BaseModelFactory();
  const credentials: ResolvedCredentials = {
    baseProvider: "google-vertex",
    apiKey: "",
    project: process.env.GOOGLE_VERTEX_PROJECT,
    location,
    credentialsJson: fs.readFileSync("./data/vertex-sa.json", "utf-8"),
  };
  const model = factory.create(credentials, modelId) as LanguageModel | null;
  if (!model) throw new Error("factory returned null");

  console.log("─ generateText ─");
  const r = await generateText({
    model,
    prompt: "Reply with exactly: pong",
  });
  console.log("  text :", JSON.stringify(r.text));
  console.log("  usage:", r.usage);

  console.log("─ streamText ─");
  const s = streamText({
    model,
    messages: [{ role: "user", content: "Скажи короткое приветствие на русском." }],
  });
  let collected = "";
  for await (const d of s.textStream) { collected += d; process.stdout.write(d); }
  console.log(`\n  total: ${collected.length} chars`);
  console.log("  usage:", await s.usage);
}

async function main() {
  await run("gemini-3.1-pro-preview", "global");
  await run("gemini-3-flash-preview", "global");
  await run("gemini-2.5-flash", "global"); // does GA model still work in global?
  console.log("\n✅ All probes passed.");
}

main().catch((err) => {
  console.error("\n❌", err);
  if ((err as { responseBody?: string }).responseBody) {
    console.error("body:", (err as { responseBody?: string }).responseBody);
  }
  process.exit(1);
});
