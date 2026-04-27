import { config } from "dotenv";
config({ path: ".env.local" });

import { container, initializeContainer } from "../lib/plugin-loader";
import { generateText } from "ai";
import type { LanguageModel } from "ai";

async function main() {
  await initializeContainer();
  const creds = container
    .get("providerResolver")
    .resolve("gemini-3.1-pro-preview", "google-vertex", "admin");
  if (!creds) throw new Error("No credentials resolved");
  console.log("Resolved:", {
    baseProvider: creds.baseProvider,
    project: creds.project,
    location: creds.location,
    hasJson: !!creds.credentialsJson,
  });
  const model = container
    .get("modelFactory")
    .create(creds, "gemini-3.1-pro-preview") as LanguageModel;
  const r = await generateText({ model, prompt: "Reply with exactly: pong" });
  console.log("text:", JSON.stringify(r.text));
  console.log(
    "trafficType:",
    (r.usage as { raw?: { trafficType?: string } }).raw?.trafficType,
  );
}
main().catch((e) => {
  console.error("ERR:", e?.message ?? e);
  process.exit(1);
});
