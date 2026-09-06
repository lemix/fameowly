import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

const pluginsDir = path.join(import.meta.dirname, "extensions");
const pluginsEnabled =
  process.env.ENABLE_PLUGINS !== "false" &&
  fs.existsSync(path.join(pluginsDir, "index.ts"));

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["sharp"],
  // When the extensions directory is absent, alias @plugins to an empty registry
  ...(pluginsEnabled
    ? {}
    : {
        turbopack: {
          resolveAlias: {
            "@plugins": "./lib/plugin-stub.ts",
          },
        },
        webpack(config: Record<string, Record<string, Record<string, string>>>) {
          const stubTs = path.join(import.meta.dirname, "lib", "plugin-stub.ts");
          config.resolve.alias["@plugins"] = stubTs;
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
