/**
 * Strategy: Google-native web tools.
 *
 * `@ai-sdk/google-vertex` re-exports the very same tool factories from
 * `@ai-sdk/google`, so one implementation covers both Google providers.
 * The factories are pure — no credentials are needed to build them.
 */

import { google } from "@ai-sdk/google";
import type { WebToolsProvider, WebToolsRequest } from "../contracts";

export class GoogleWebToolsProvider implements WebToolsProvider {
  resolve(request: WebToolsRequest): Record<string, unknown> | undefined {
    if (request.baseProvider !== "google" && request.baseProvider !== "google-vertex") {
      return undefined;
    }

    const tools: Record<string, unknown> = {};
    if (request.webSearchEnabled) {
      tools.google_search = google.tools.googleSearch({});
    }
    if (request.urlContextRequested) {
      tools.url_context = google.tools.urlContext({});
    }

    return Object.keys(tools).length > 0 ? tools : undefined;
  }
}
