

<div align="center">
  <!-- Адаптивный логотип (Светлая/Темная тема GitHub) -->
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/fameowly.svg">
    <img src="./public/fameowly-light.svg" alt="Fameowly Logo" width="350"/>
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

A zero-database AI chat interface for small groups. It allows administrators to share centralized API keys (OpenRouter, Google AI Studio, Local LLAMA) with multiple users without complex infrastructure.

## Features

- **Zero-database architecture**: All user accounts and chat histories are stored as local JSON files.
- **Centralized API management**: API keys are configured by the host. Users authenticate via local passwords.
- **Admin panel**: Built-in UI for user creation and access management.
- **Multimodal support**: Image attachments in chat and dedicated image generation.
- **Formatting**: Renders Markdown, LaTeX, and code blocks with syntax highlighting.
- **Tech stack**: Built with Next.js 16 and Vercel AI SDK.
- **Proxy support**: Routes outgoing requests to LLM providers through a SOCKS5 proxy — helps when your ISP blocks access to AI services, or when a provider restricts access from your country.

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

Boolean properties (`isLocal`, `supportsTemperature`, `supportsReasoning`) default to `false`. The `isLocal` flag is automatically inferred as `true` when `provider` is `"local"`. Omitting `clientPrice` from a model entry hides that model from users with the `client` role.
