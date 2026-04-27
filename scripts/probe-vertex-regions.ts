/**
 * Probe gemini-3.1-pro-preview (and other Gemini 3 preview models) across
 * all Vertex AI regions to find where the project has access.
 *
 * Strategy:
 *   1. List all available regions for our project via the Vertex API.
 *   2. For each region in parallel, try :generateContent against candidate models.
 *   3. Report which region+model combinations work.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { getVertexAccessToken } from "../lib/providers/vertex-auth";

// Regions where Vertex AI Gemini is generally available.
// Source: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations
const REGIONS = [
  "global",
  "us-central1",
  "us-east1",
  "us-east4",
  "us-east5",
  "us-south1",
  "us-west1",
  "us-west4",
  "northamerica-northeast1",
  "northamerica-northeast2",
  "southamerica-east1",
  "europe-central2",
  "europe-north1",
  "europe-southwest1",
  "europe-west1",
  "europe-west2",
  "europe-west3",
  "europe-west4",
  "europe-west6",
  "europe-west8",
  "europe-west9",
  "europe-west12",
  "asia-east1",
  "asia-east2",
  "asia-northeast1",
  "asia-northeast3",
  "asia-south1",
  "asia-southeast1",
  "australia-southeast1",
  "me-central1",
  "me-central2",
  "me-west1",
];

const MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
];

async function probe(
  token: string,
  project: string,
  location: string,
  modelId: string,
): Promise<{ status: "ok" | "no-access" | "not-found" | "other"; code: number; msg: string }> {
  const host =
    location === "global"
      ? "https://aiplatform.googleapis.com"
      : `https://${location}-aiplatform.googleapis.com`;
  const url =
    `${host}/v1/projects/${project}/locations/${location}` +
    `/publishers/google/models/${modelId}:generateContent`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 1, temperature: 0 },
      }),
    });
  } catch (err) {
    return { status: "other", code: 0, msg: (err as Error).message };
  }

  if (resp.ok) return { status: "ok", code: 200, msg: "OK" };
  const body = await resp.text();
  let msg = body.slice(0, 220);
  let kind: "no-access" | "not-found" | "other" = "other";
  try {
    const j = JSON.parse(body);
    msg = (j.error?.message ?? "").split("\n")[0].slice(0, 220);
    if (resp.status === 404 && /does not have access/i.test(msg)) kind = "no-access";
    else if (resp.status === 404) kind = "not-found";
  } catch { /* keep raw */ }
  return { status: kind, code: resp.status, msg };
}

async function main() {
  const auth = await getVertexAccessToken();
  console.log(`Project : ${auth.project}`);
  console.log(`Location in env: ${auth.location}\n`);

  console.log(`Probing ${MODELS.length} preview models across ${REGIONS.length} regions...\n`);

  const grid: Record<string, Record<string, string>> = {};
  for (const m of MODELS) grid[m] = {};

  // Run probes in parallel per region (sequential per model to avoid 429s)
  await Promise.all(
    REGIONS.map(async (region) => {
      for (const model of MODELS) {
        const r = await probe(auth.token, auth.project, region, model);
        const cell =
          r.status === "ok" ? "✅"
          : r.status === "no-access" ? "🔒"
          : r.status === "not-found" ? "—"
          : `?${r.code}`;
        grid[model][region] = cell;
        if (r.status === "ok") {
          console.log(`✅ ${model} @ ${region}`);
        } else if (r.status !== "not-found" && r.code !== 404) {
          console.log(`?? ${model} @ ${region}: ${r.code} ${r.msg.slice(0, 120)}`);
        }
      }
    }),
  );

  console.log("\n─── Matrix ────────────────────────────────────────────");
  console.log("Legend: ✅ = works · 🔒 = exists but no project access · — = not found in region · ?XXX = other error\n");

  const colWidth = Math.max(...REGIONS.map((r) => r.length));
  const modelWidth = Math.max(...MODELS.map((m) => m.length));

  // header
  process.stdout.write(" ".repeat(modelWidth + 2));
  for (const r of REGIONS) process.stdout.write(r.padEnd(colWidth + 1));
  process.stdout.write("\n");

  for (const m of MODELS) {
    process.stdout.write(m.padEnd(modelWidth + 2));
    for (const r of REGIONS) {
      const v = grid[m][r] ?? " ";
      process.stdout.write(v.padEnd(colWidth + 1));
    }
    process.stdout.write("\n");
  }

  console.log("\n─── Summary: regions where each model is available ────");
  for (const m of MODELS) {
    const ok = REGIONS.filter((r) => grid[m][r] === "✅");
    const locked = REGIONS.filter((r) => grid[m][r] === "🔒");
    console.log(`\n  ${m}`);
    console.log(`    ✅ accessible in: ${ok.length ? ok.join(", ") : "(none)"}`);
    console.log(`    🔒 exists, but project not allowlisted: ${locked.length ? locked.join(", ") : "(none)"}`);
  }
}

main().catch((err) => {
  console.error("\n❌ Failed:", err);
  process.exit(1);
});
