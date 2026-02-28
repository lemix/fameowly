# Family AI Hub

Self-hosted семейный AI-хаб на Next.js 16 с поддержкой нескольких LLM-провайдеров.

## Stack

- Next.js 16 (App Router, TypeScript)
- AI SDK v6 (ai, @ai-sdk/openai, @ai-sdk/google, @ai-sdk/react)
- Tailwind CSS v4
- jose (JWT auth)
- react-markdown + remark-gfm
- lucide-react

## Key Architecture Decisions

- **AI SDK v6**: Uses `DefaultChatTransport` for `useChat`, `toUIMessageStreamResponse()` for server streaming, `UIMessage.parts` array (no `.content` property), `sendMessage({ text })` API.
- **Auth**: JWT sessions stored in httpOnly cookies, user data in `data/users.json` file.
- **Middleware**: Route protection via `middleware.ts` (deprecated in Next.js 16 but still functional).
- **Providers**: Google Generative AI (direct) and OpenRouter (via @ai-sdk/openai with custom baseURL).

## Commands

- `npm run dev` — development server
- `npm run build` — production build
- `docker compose up -d` — Docker deployment
