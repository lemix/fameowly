

<div align="center">
  <!-- Адаптивный логотип (Светлая/Темная тема GitHub) -->
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./.github/assets/fameowly-wordmark-dark.svg">
    <img src="./.github/assets/fameowly-wordmark-light.svg" alt="Fameowly Logo" width="380"/>
  </picture>

  <br />

  <p>
    <em>Purrs up whatever you need 🐾</em>
  </p>

  <p>
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/License-BSL%201.1-blue.svg" alt="License" />
    </a>
    <a href="https://nextjs.org/">
      <img src="https://img.shields.io/badge/Next.js-16+-black?style=flat-square&logo=next.js" alt="Next.js" />
    </a>
    <a href="https://tailwindcss.com/">
      <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    </a>
  </p>
</div>

## Overview

Self-hosted AI chat for a family or a small team. One host configures the API keys — everyone else just logs in and talks to the models. No database, no cloud account, no per-seat subscriptions.

## Features

- **Zero-database**: users, chats and usage records are plain JSON files under `data/`.
- **Shared keys**: OpenRouter, Google AI Studio and local LLaMA-compatible endpoints are configured once by the host.
- **Admin panel**: create users, assign roles, control which models each role can use.
- **Usage tracking**: per-user token and cost statistics computed from the model price list.
- **Multimodal**: image and file attachments in chat, plus a dedicated image generation mode.
- **Rich rendering**: Markdown, LaTeX and syntax-highlighted code blocks.
- **Installable PWA**: works as a standalone app on desktop and mobile.
- **Proxy support**: outgoing provider requests can be routed through a SOCKS5 proxy — useful when your ISP or the provider blocks the connection.
- **Pluggable core**: optional features ship as plugins that override strategies in a DI container, so the open-source build stays lean (`npm run build:os`).

Built with Next.js 16, React 19, the Vercel AI SDK and Tailwind CSS v4.

## Deployment (Docker)

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  fameowly:
    image: ghcr.io/lemix/fameowly:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      # Mount a custom models configuration (see data/models.json.example)
      - ./models.json:/app/data/models.json:ro
    env_file:
      - .env
    restart: unless-stopped
```

### Models configuration

The available models are defined in `data/models.json` (not included in the repository — listed in `.gitignore`). A reference configuration with all supported fields is provided in `data/models.json.example`.

To get started, copy the example and adjust it:

```bash
cp data/models.json.example data/models.json
```

When deploying via Docker, mount your `models.json` into the container as shown above.

Boolean properties (`isLocal`, `supportsTemperature`, `supportsReasoning`) default to `false`. The `isLocal` flag is automatically inferred as `true` when `provider` is `"local"`. Set `availableForClients: true` to expose a model to users with the `client` role (legacy configs that use `clientPrice` are migrated automatically).

#### Pricing fields

| Field | Meaning |
|---|---|
| `inputPricePer1M` | Provider price in USD per 1M prompt tokens |
| `outputPricePer1M` | Provider price in USD per 1M completion tokens |
| `pricePerImage` | Provider price in USD per generated image |
| `markup` | Commercial multiplier applied on top of the provider price (default `1`) |

A request costs `(promptTokens/1M × inputPricePer1M + completionTokens/1M × outputPricePer1M) × markup`. Models without prices are treated as free. The computed cost is stored with each usage record, so later price edits never change already billed requests.

### Running the open-source build locally

```bash
npm run dev      # premium build, data/,      http://localhost:3000
npm run dev:os   # open-source build, data-oss/, http://localhost:3010
```

`dev:os` sets `ENABLE_PLUGINS=false` and `DATA_DIR=./data-oss`, so it never touches premium data. Point `DATA_DIR` at any directory to run additional isolated instances.
