[![License](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](https://github.com/lemix/fameowly/blob/main/LICENSE)

# FaMeowly

A zero-database AI chat interface for small groups. It allows administrators to share centralized API keys (OpenRouter, Google AI Studio) with multiple users without complex infrastructure.

## Features

- **Zero-database architecture**: All user accounts and chat histories are stored as local JSON files.
- **Centralized API management**: API keys are configured by the host. Users authenticate via local passwords.
- **Admin panel**: Built-in UI for user creation and access management.
- **Multimodal support**: Image attachments in chat and dedicated image generation.
- **Formatting**: Renders Markdown, LaTeX, and code blocks with syntax highlighting.
- **Tech stack**: Built with Next.js 14 and Vercel AI SDK.

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
