/**
 * List Gemini publisher models available via Vertex AI for our project/location.
 * Uses the same Service Account flow as the prod code.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { getVertexAccessToken } from "../lib/providers/vertex-auth";

interface ListResp {
  publisherModels?: Array<{
    name: string;
    versionId?: string;
    supportedActions?: { predict?: boolean; rawPredict?: boolean };
    launchStage?: string;
    publisherModelTemplate?: string;
  }>;
  nextPageToken?: string;
}

async function listPage(
  token: string,
  pageToken?: string,
): Promise<ListResp> {
  const url = new URL(
    "https://us-central1-aiplatform.googleapis.com/v1beta1/publishers/google/models",
  );
  url.searchParams.set("pageSize", "200");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    throw new Error(`list failed: ${resp.status} ${await resp.text()}`);
  }
  return resp.json();
}

async function probe(
  token: string,
  project: string,
  location: string,
  modelId: string,
): Promise<string> {
  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${location}/publishers/google/models/${modelId}:generateContent`;
  const resp = await fetch(url, {
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
  if (resp.ok) return "✅ OK";
  const body = await resp.text();
  // Pull first useful line of error
  try {
    const j = JSON.parse(body);
    return `❌ ${resp.status} ${j.error?.status ?? ""} — ${j.error?.message?.split("\n")[0]?.slice(0, 200)}`;
  } catch {
    return `❌ ${resp.status} ${body.slice(0, 200)}`;
  }
}

async function main() {
  const auth = await getVertexAccessToken();
  console.log(`Project : ${auth.project}`);
  console.log(`Location: ${auth.location}\n`);

  // 1. Enumerate all publisher models
  console.log("─── 1. Enumerating publisher models ───────────────────────");
  const allNames: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await listPage(auth.token, pageToken);
    for (const m of page.publisherModels ?? []) {
      // m.name like "publishers/google/models/gemini-2.5-flash@001"
      allNames.push(m.name.replace(/^publishers\/google\/models\//, ""));
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  const gemini = allNames
    .filter((n) => n.toLowerCase().startsWith("gemini") || n.toLowerCase().includes("imagen") || n.toLowerCase().includes("nano-banana") || n.toLowerCase().includes("image"))
    .sort();
  console.log(`Total publisher models in catalog: ${allNames.length}`);
  console.log(`Gemini / image-related: ${gemini.length}\n`);
  for (const n of gemini) console.log("  •", n);

  // 2. Probe specific candidates the user cares about
  console.log("\n─── 2. Probing candidate models with :generateContent ─────");
  const candidates = [
    // Chat
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-2.0-flash-001",
    // Currently-configured ids in models.json
    "gemini-flash-lite-latest",
    "gemini-3.1-pro-preview",
    "gemini-3-pro-preview",
    "gemini-3-pro",
    // Image
    "gemini-2.5-flash-image",
    "gemini-2.5-flash-image-preview",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
    "imagen-3.0-generate-002",
    "imagen-3.0-fast-generate-001",
    "imagen-4.0-generate-preview-06-06",
  ];

  const results: Array<{ id: string; status: string }> = [];
  for (const id of candidates) {
    const status = await probe(auth.token, auth.project, auth.location, id);
    results.push({ id, status });
    console.log(`  ${id.padEnd(40)} ${status}`);
  }

  console.log("\n─── 3. Summary: working chat models ───────────────────────");
  for (const r of results) {
    if (r.status.startsWith("✅")) console.log("  ✅", r.id);
  }
}

main().catch((err) => {
  console.error("\n❌ Failed:", err);
  process.exit(1);
});
