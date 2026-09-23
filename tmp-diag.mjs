// temporary diagnostic — delete after use
import fs from "node:fs";
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { initializeContainer, container } = await import("./lib/plugin-loader.ts");
const { readModelsConfig } = await import("./lib/models.server.ts");
const { streamText } = await import("ai");
initializeContainer();

const models = readModelsConfig().chatModels.filter((m) => m.provider !== "local");

for (const m of models) {
  let creds;
  try {
    creds = container.get("providerResolver").resolve(m.id, m.provider, "admin");
  } catch (e) {
    console.log(`${m.id.padEnd(38)} RESOLVE THREW ${String(e.message ?? e).slice(0, 80)}`);
    continue;
  }
  if (!creds) {
    console.log(`${m.id.padEnd(38)} resolve -> null  (vp=${m.virtualProviderId ?? "-"})`);
    continue;
  }
  const model = container.get("modelFactory").create(creds, m.id);
  if (!model) {
    console.log(`${m.id.padEnd(38)} factory -> null  base=${creds.baseProvider}`);
    continue;
  }
  const providerOptions = container.get("reasoningOptionsProvider").resolve({
    baseProvider: creds.baseProvider, modelId: m.id, reasoningEnabled: true,
  });
  try {
    const r = streamText({
      model, system: "Ты ассистент.",
      messages: [{ role: "user", content: [{ type: "text", text: "Скажи ОК." }] }],
      timeout: 60000,
      ...(providerOptions ? { providerOptions } : {}),
    });
    let text = "";
    for await (const p of r.fullStream) {
      if (p.type === "text-delta") text += p.text;
      if (p.type === "error") throw p.error;
    }
    console.log(`${m.id.padEnd(38)} OK   base=${creds.baseProvider.padEnd(14)} vp=${m.virtualProviderId ?? "-"} -> ${JSON.stringify(text.trim().slice(0, 30))}`);
  } catch (e) {
    console.log(`${m.id.padEnd(38)} FAIL base=${creds.baseProvider.padEnd(14)} vp=${m.virtualProviderId ?? "-"}`);
    console.log(`    ${String(e.message ?? e).replace(/\s+/g, " ").slice(0, 200)}`);
  }
}
