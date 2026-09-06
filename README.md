

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

Its main trick: **every outgoing request to an LLM provider can go through a SOCKS5 proxy**. Run the hub on any machine at home and reach OpenAI, Google or OpenRouter even when your ISP blocks them or the provider refuses connections from your country — users never need a VPN themselves.

## Features

- **SOCKS5 proxy for provider traffic**: set `SOCKS_PROXY` (or `ALL_PROXY` / `HTTPS_PROXY`) and all provider calls, including streaming, are tunneled through it. Everything else stays on the direct route.
- **Zero-database**: users, chats and uploads are plain JSON files under `data/`.
- **Shared keys**: OpenRouter, Google AI Studio and local LLaMA-compatible endpoints are configured once by the host; users sign in with local passwords.
- **Admin panel**: built-in UI for creating users and managing access.
- **Multimodal**: image and file attachments in chat, plus a dedicated image generation mode.
- **Rich rendering**: Markdown, LaTeX and syntax-highlighted code blocks.
- **Installable PWA**: works as a standalone app on desktop and mobile.

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

### Environment

```env
JWT_SECRET=change-me-to-a-32-char-random-string
ADMIN_INIT_PASS=pick-your-first-admin-password

OPENROUTER_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
LOCAL_LLM_URL=http://127.0.0.1:8080/v1

# Route provider traffic through a SOCKS5 proxy
SOCKS_PROXY=socks5://127.0.0.1:1080
```

The proxy is read from `SOCKS_PROXY`, `ALL_PROXY`, `HTTPS_PROXY` or `HTTP_PROXY`, in that order; the value must use a `socks` scheme. Leave them unset to connect directly.

### Models configuration

The available models are defined in `data/models.json` (not included in the repository — listed in `.gitignore`). A reference configuration with all supported fields is provided in `data/models.json.example`.

To get started, copy the example and adjust it:

```bash
cp data/models.json.example data/models.json
```

When deploying via Docker, mount your `models.json` into the container as shown above.

Boolean properties (`isLocal`, `supportsTemperature`, `supportsReasoning`) default to `false`. The `isLocal` flag is automatically inferred as `true` when `provider` is `"local"`.

## Local development

```bash
npm install
npm run dev   # http://localhost:3000
```

Runtime data lives in `DATA_DIR` (default `./data`). Point it at another directory to run isolated instances side by side.
