/**
 * Probe Imagen models via Vertex AI :predict endpoint (Imagen uses predict, not generateContent).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { getVertexAccessToken } from "../lib/providers/vertex-auth";

async function probePredict(
  token: string,
  project: string,
  location: string,
  modelId: string,
): Promise<string> {
  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${location}/publishers/google/models/${modelId}:predict`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [{ prompt: "a small red apple on white background" }],
      parameters: { sampleCount: 1, aspectRatio: "1:1" },
    }),
  });
  if (resp.ok) {
    const j = await resp.json();
    const got = Array.isArray(j.predictions) ? j.predictions.length : 0;
    return `✅ OK (${got} predictions)`;
  }
  const body = await resp.text();
  try {
    const j = JSON.parse(body);
    return `❌ ${resp.status} ${j.error?.status ?? ""} — ${j.error?.message?.split("\n")[0]?.slice(0, 200)}`;
  } catch {
    return `❌ ${resp.status} ${body.slice(0, 200)}`;
  }
}

async function main() {
  const auth = await getVertexAccessToken();
  console.log(`Project : ${auth.project}\nLocation: ${auth.location}\n`);

  const candidates = [
    "imagen-3.0-generate-002",
    "imagen-3.0-fast-generate-001",
    "imagen-3.0-capability-001",
    "imagen-3.0-capability-002",
    "imagen-4.0-generate-001",
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-ultra-generate-001",
  ];

  for (const id of candidates) {
    const status = await probePredict(auth.token, auth.project, auth.location, id);
    console.log(`  ${id.padEnd(40)} ${status}`);
  }
}

main().catch((err) => {
  console.error("\n❌ Failed:", err);
  process.exit(1);
});
