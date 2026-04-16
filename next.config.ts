import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

const premiumDir = path.join(import.meta.dirname, "premium");
const premiumEnabled =
  process.env.ENABLE_PREMIUM !== "false" &&
  fs.existsSync(path.join(premiumDir, "index.ts"));

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["sharp"],
  // When premium/ submodule is absent, alias @premium to empty stubs
  ...(premiumEnabled
    ? {}
    : {
        turbopack: {
          resolveAlias: {
            "@premium": "./lib/premium-stub.ts",
            "@premium/plugins/*": "./lib/premium-stubs/*",
          },
        },
        webpack(config: Record<string, Record<string, Record<string, string>>>) {
          const stubTs = path.join(import.meta.dirname, "lib", "premium-stub.ts");
          const stubDir = path.join(import.meta.dirname, "lib", "premium-stubs");
          config.resolve.alias["@premium"] = stubTs;
          config.resolve.alias["@premium/plugins"] = stubDir;
          return config;
        },
      }),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
