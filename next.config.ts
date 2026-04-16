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
            "@premium/*": "./lib/premium-stub-component.tsx",
          },
        },
        webpack(config: Record<string, Record<string, Record<string, string>>>) {
          const stubTs = path.join(import.meta.dirname, "lib", "premium-stub.ts");
          const stubComponent = path.join(import.meta.dirname, "lib", "premium-stub-component.tsx");
          config.resolve.alias["@premium"] = stubTs;
          // Wildcard: any deep @premium/* import → stub component
          config.resolve.alias["@premium/plugins"] = stubComponent;
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
