# 🐈 FaMeooowly
Purrs up whatever you need

**An ultra-lightweight, zero-database AI UI for your family, friends, or small team.**

Stop paying $20/month per person for premium AI subscriptions. NanoHub AI allows you to securely share your API keys (OpenRouter, Google AI Studio) with your close circle through a beautiful, Next.js-powered interface. You pay per token centrally, and they get a premium ChatGPT-like experience.

## ✨ Why NanoHub AI?
Powerful tools like Open WebUI or LibreChat are amazing, but they require heavy databases (Postgres/MongoDB) and complex orchestration. 
NanoHub AI takes a different approach: **Zero databases.** All users and chat histories are stored locally in simple JSON files. It takes 1 minute to deploy and uses minimal RAM.

## 🚀 Features
- 💳 **Centralized Billing:** You provide the API key. Your users just log in with a password. You control the costs.
- 🗂️ **Database-Free Architecture:** Everything is saved in a local `./data` folder as JSON. Extremely easy to backup or migrate.
- 👥 **Multi-User Admin Panel:** Create accounts, set passwords, and manage access directly from the UI.
- 🎨 **Beautiful & Smart UI:** First-class support for **LaTeX (Math)**, syntax highlighting for code, and seamless markdown tables.
- 🖼️ **Multimodal:** Copy-paste images directly into the chat or use the dedicated "Image Generation" tab.
- ⚡ **Buttery Smooth Streaming:** Powered by Next.js 14 and Vercel AI SDK to prevent "chunk errors" and timeouts.

## 🛠️ Quick Start (Docker)

The easiest way to run NanoHub AI is using Docker.

**1. Create a `docker-compose.yml` file:**
```yaml
version: '3.8'
services:
  nanohub-ai:
    image: ghcr.io/lemix/fameowly:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data # This saves your chats and users!
    env_file:
      - .env
    restart: unless-stopped
```

## 🤝 Contributing
Feel free to open issues or submit PRs! This is a weekend project built for my family, but I'm happy to see it grow.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.