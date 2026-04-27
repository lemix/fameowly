import { config } from "dotenv";
config({ path: ".env.local" });
import { getVertexAccessToken } from "../lib/providers/vertex-auth";

async function main() {
  const auth = await getVertexAccessToken();
  for (const loc of ["global", "us-central1"]) {
    for (const m of [
      "gemini-2.5-flash-image",
      "gemini-3.1-flash-image-preview",
      "gemini-3-pro-image-preview",
    ]) {
      const host =
        loc === "global"
          ? "https://aiplatform.googleapis.com"
          : `https://${loc}-aiplatform.googleapis.com`;
      const url = `${host}/v1/projects/${auth.project}/locations/${loc}/publishers/google/models/${m}:generateContent`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "small red apple, white background" }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });
      let extra = "";
      if (resp.ok) {
        const j = await resp.json();
        const has = j?.candidates?.[0]?.content?.parts?.some((p: { inlineData?: unknown }) => p.inlineData);
        extra = has ? "image returned" : "no image part";
      } else {
        const t = await resp.text();
        try {
          extra = (JSON.parse(t).error?.message ?? "").split("\n")[0].slice(0, 100);
        } catch {
          extra = t.slice(0, 100);
        }
      }
      console.log((resp.ok ? "✅" : "❌"), loc.padEnd(12), m.padEnd(35), resp.status, extra);
    }
  }
}
main();
