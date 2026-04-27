/**
 * Smoke test for Vertex AI integration.
 * Runs the same code path as the chat API: BaseModelFactory + streamText.
 *
 * Usage:  npx tsx scripts/test-vertex.ts [modelId]
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });
import { streamText, generateText } from "ai";
import type { LanguageModel } from "ai";
import { BaseModelFactory } from "../lib/strategies/base-model-factory";
import { resolveVertexAuth } from "../lib/providers/vertex-auth";
import type { ResolvedCredentials } from "../lib/types";

async function main() {
  const modelId = process.argv[2] ?? "gemini-2.5-flash";

  console.log("─── 1. Resolving Service Account ──────────────────");
  const auth = resolveVertexAuth();
  console.log("  project :", auth.project);
  console.log("  location:", auth.location);
  console.log("  client  :", auth.credentials.client_email);

  console.log("\n─── 2. Creating Vertex AI model via factory ───────");
  const factory = new BaseModelFactory();
  const credentials: ResolvedCredentials = {
    baseProvider: "google-vertex",
    apiKey: "",
    project: auth.project,
    location: auth.location,
  };
  const model = factory.create(credentials, modelId) as LanguageModel | null;
  if (!model) throw new Error("factory returned null");
  console.log("  model id:", modelId);

  console.log("\n─── 3. generateText (one-shot) ─────────────────────");
  const oneShot = await generateText({
    model,
    prompt: "Say 'pong' and nothing else.",
  });
  console.log("  response:", JSON.stringify(oneShot.text));
  console.log("  usage   :", oneShot.usage);

  console.log("\n─── 4. streamText (streaming) ──────────────────────");
  const result = streamText({
    model,
    messages: [
      { role: "user", content: "Скажи короткое приветствие на русском, одно предложение." },
    ],
  });

  let chunks = 0;
  let collected = "";
  for await (const delta of result.textStream) {
    chunks++;
    collected += delta;
    process.stdout.write(delta);
  }
  console.log(`\n  chunks received: ${chunks}`);
  console.log(`  total chars   : ${collected.length}`);
  const finalUsage = await result.usage;
  console.log("  usage         :", finalUsage);

  console.log("\n✅ Vertex AI integration works end-to-end.");
}

main().catch((err) => {
  console.error("\n❌ Test failed:", err);
  if (err?.responseBody) console.error("Response body:", err.responseBody);
  if (err?.cause) console.error("Cause:", err.cause);
  process.exit(1);
});
