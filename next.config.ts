import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

const pluginsDir = path.join(import.meta.dirname, "premium");
const pluginsEnabled =
  process.env.ENABLE_PLUGINS !== "false" &&
  fs.existsSync(path.join(pluginsDir, "index.ts"));

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["sharp"],
  // When plugins directory is absent, alias @plugins to empty stubs
  ...(pluginsEnabled
    ? {}
    : {
        turbopack: {
          resolveAlias: {
            "@plugins": "./lib/plugin-stub.ts",
            "@plugins/ext/*": "./lib/plugin-stubs/*",
          },
        },
        webpack(config: Record<string, Record<string, Record<string, string>>>) {
          const stubTs = path.join(import.meta.dirname, "lib", "plugin-stub.ts");
          const stubDir = path.join(import.meta.dirname, "lib", "plugin-stubs");
          config.resolve.alias["@plugins"] = stubTs;
          config.resolve.alias["@plugins/ext"] = stubDir;
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
