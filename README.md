

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

A zero-database AI chat interface for small groups. It allows administrators to share centralized API keys (OpenRouter, Google AI Studio, Local LLAMA) with multiple users without complex infrastructure.

## Features

- **Zero-database architecture**: All user accounts and chat histories are stored as local JSON files.
- **Centralized API management**: API keys are configured by the host. Users authenticate via local passwords.
- **Admin panel**: Built-in UI for user creation and access management.
- **Multimodal support**: Image attachments in chat and dedicated image generation.
- **Formatting**: Renders Markdown, LaTeX, and code blocks with syntax highlighting.
- **Tech stack**: Built with Next.js 16 and Vercel AI SDK.
- **SOCKS5 proxy support**: useful under country/provider restrictions

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
    env_file:
      - .env
    restart: unless-stopped
