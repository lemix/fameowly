/**
 * Vertex AI authentication helpers.
 *
 * Resolves Service Account credentials for Google Cloud Vertex AI
 * from environment variables (Docker-friendly: raw JSON in env)
 * or a path on disk, and exposes utilities to:
 *   - parse the SA JSON safely
 *   - construct GoogleAuth options for @ai-sdk/google-vertex
 *   - obtain an OAuth2 access token for direct REST calls (image gen)
 *
 * Supported env vars (in order):
 *   GOOGLE_VERTEX_CREDENTIALS_JSON  \u2014 raw SA JSON content (preferred in Docker)
 *   GOOGLE_VERTEX_CREDENTIALS_FILE  \u2014 path to SA JSON file
 *   GOOGLE_APPLICATION_CREDENTIALS  \u2014 standard ADC path (fallback)
 *
 * Optional overrides:
 *   GOOGLE_VERTEX_PROJECT           \u2014 GCP project ID (overrides SA project_id)
 *   GOOGLE_VERTEX_LOCATION          \u2014 GCP location (default "us-central1")
 */

import fs from "fs";

const DEFAULT_LOCATION = "us-central1";

interface ServiceAccountJson {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  token_uri?: string;
  [key: string]: unknown;
}

export interface VertexAuthInput {
  /** Raw Service Account JSON string (preferred). When omitted falls back to env. */
  credentialsJson?: string;
  /** Override project ID. When omitted derived from SA `project_id` or env. */
  project?: string;
  /** Override location. When omitted from env or default `us-central1`. */
  location?: string;
}

export interface VertexAuthResolved {
  project: string;
  location: string;
  credentials: ServiceAccountJson;
}

/** Read raw SA JSON text from explicit input or from env vars. */
function readRawCredentials(credentialsJson?: string): string | null {
  if (credentialsJson && credentialsJson.trim()) return credentialsJson;

  const inline = process.env.GOOGLE_VERTEX_CREDENTIALS_JSON;
  if (inline && inline.trim()) return inline;

  const filePath =
    process.env.GOOGLE_VERTEX_CREDENTIALS_FILE ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (filePath) {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      throw new Error(
        `[vertex-auth] cannot read credentials file at ${filePath}: ${(err as Error).message}`,
      );
    }
  }

  return null;
}

/** Parse SA JSON, tolerating accidental surrounding whitespace / wrapping quotes. */
function parseServiceAccount(raw: string): ServiceAccountJson {
  const trimmed = raw.trim();
  // Some Docker tooling wraps env values in single/double quotes \u2014 strip them.
  const unquoted =
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ? trimmed.slice(1, -1)
      : trimmed;

  let parsed: ServiceAccountJson;
  try {
    parsed = JSON.parse(unquoted) as ServiceAccountJson;
  } catch (err) {
    throw new Error(
      `[vertex-auth] failed to parse Service Account JSON: ${(err as Error).message}`,
    );
  }

  // \\n \u2192 real newline (common when SA JSON is pasted into env)
  if (typeof parsed.private_key === "string" && !parsed.private_key.includes("\n")) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      "[vertex-auth] Service Account JSON missing client_email/private_key",
    );
  }

  return parsed;
}

/**
 * Resolve full Vertex auth context (project + location + parsed SA JSON).
 * Throws if no credentials configured.
 */
export function resolveVertexAuth(input: VertexAuthInput = {}): VertexAuthResolved {
  const raw = readRawCredentials(input.credentialsJson);
  if (!raw) {
    throw new Error(
      "[vertex-auth] no Service Account configured. Set GOOGLE_VERTEX_CREDENTIALS_JSON " +
        "or attach a Service Account JSON to the virtual provider.",
    );
  }

  const credentials = parseServiceAccount(raw);
  const project =
    input.project ||
    process.env.GOOGLE_VERTEX_PROJECT ||
    credentials.project_id ||
    "";
  const location =
    input.location || process.env.GOOGLE_VERTEX_LOCATION || DEFAULT_LOCATION;

  if (!project) {
    throw new Error(
      "[vertex-auth] project ID not provided and not found in Service Account JSON",
    );
  }

  return { project, location, credentials };
}

/**
 * Produce `googleAuthOptions` to pass into `createVertex({...})`.
 * Returns null when credentials cannot be resolved (caller decides what to do).
 */
export function buildVertexProviderOptions(input: VertexAuthInput = {}): {
  project: string;
  location: string;
  googleAuthOptions: { credentials: { client_email: string; private_key: string } };
} | null {
  try {
    const { project, location, credentials } = resolveVertexAuth(input);
    return {
      project,
      location,
      googleAuthOptions: {
        credentials: {
          client_email: credentials.client_email!,
          private_key: credentials.private_key!,
        },
      },
    };
  } catch (err) {
    console.error((err as Error).message);
    return null;
  }
}

/**
 * Obtain an OAuth2 access token for direct REST calls to Vertex AI
 * (used by the image generation route which calls `:generateContent` raw).
 */
export async function getVertexAccessToken(
  input: VertexAuthInput = {},
): Promise<{ token: string; project: string; location: string }> {
  const { project, location, credentials } = resolveVertexAuth(input);

  // Lazy import \u2014 avoids loading google-auth-library on cold paths.
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;
  if (!token) {
    throw new Error("[vertex-auth] failed to obtain access token from Service Account");
  }
  return { token, project, location };
}
