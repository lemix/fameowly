# Family AI Hub

Self-hosted family AI hub on Next.js 16 with support for multiple LLM providers.

## Stack

- Next.js 16 (App Router, TypeScript, React 19)
- AI SDK v6 (ai, @ai-sdk/openai, @ai-sdk/google)
- Tailwind CSS v4 + @tailwindcss/typography
- jose (JWT auth)
- react-markdown + remark-gfm + remark-math + rehype-katex
- lucide-react

## Architecture Principles

- **SOLID**: each module/component has a single responsibility
- **DDD-lite**: domain logic (chat, images, auth) is isolated in `lib/`, 
  the UI layer contains no business logic
- **Low coupling**: components communicate through props/hooks, 
  not through global state

## File Size & Decomposition Rules

- **Maximum 200 lines** per component file. If it is longer, decompose it.
- **Maximum 150 lines** per custom hook. If it is longer, extract sub-hooks.
- **One component = one file**. Do not place multiple components in one file.
- **Hooks live in `hooks/`**, utilities in `lib/`, components in `components/` 
  or in co-located `_components/` next to the page.
- **Types**: shared types in `lib/types.ts`, local ones in the file where they are used.
- **Constants**: move them to separate files in `lib/` if they are used in 2+ places.

## Project Structure
- app/ # Next.js App Router pages & API routes
  - page.tsx # Home page — mode orchestrator (chat/image)
  - (chat)/_components/ # Chat mode components
  - (image)/_components/ # Image generation mode components
- api/ # API routes (chat, image, upload, auth, etc.)
- hooks/ # Custom React hooks (UI business logic)
- components/ # Shared UI components (sidebar, chat-message, etc.)
- lib/ # Server & shared utilities, types, domain logic
- data/ # Runtime data (users.json, chats/, uploads/)
- premium/ # Git submodule with premium plugins (providers, billing, etc.)


## Key Technical Decisions

- **AI SDK v6**: `streamText()` + `toUIMessageStreamResponse()` on the server.
  On the client, use a custom `usePersistentChat` hook with SSE parsing.
- **OpenRouter**: use `openrouter.chat(modelId)` (Chat Completions API),
  NOT `openrouter(modelId)` (Responses API is not supported).
- **Auth**: JWT in httpOnly cookies, middleware for route protection.
- **File attachments**: the server resolves files from `data/uploads/` into base64/text
  before sending them to the LLM. The client does not send raw data.
- **File security**: files are stored in `data/uploads/{userId}/`, 
  access is verified by `userId` from the session.
- **Plugin System**: Premium features are implemented as plugins in `premium/` submodule.
  Core routes (chat, image) try plugin hooks first, then fallback to base logic.
  Admin UI dynamically loads plugin tabs from `/api/premium/status`.

## Plugin System

- **PremiumPlugin Interface**: Plugins implement hooks: `resolveCredentials`, `createProviderModel`, 
  `onChatFinish`, `onImageFinish`, `middleware`, `adminTabs`, `apiRoutes`.
- **Adding New Plugins** (3 files to update):
  1. Create folder `premium/plugins/{plugin}/`, implement `PremiumPlugin`, register in `premium/index.ts`.
  2. Add OSS stub entry to `lib/plugin-stub-registry.js` (importPath + exportName).
  3. Add static import line to admin page loader map in `app/admin/page.tsx`.
  4. Stubs in `lib/premium-stubs/` and generated `premium/` are created automatically by `scripts/ensure-premium-stub.js`.
- **Plugin Bridge**: `lib/premium.ts` loads plugins from `@premium`, delegates calls.
  When premium absent, uses `lib/premium-stub.ts` (empty plugins array).
- **Stub Generation**: `scripts/ensure-premium-stub.js` runs via `postinstall` and before OSS builds.
  Reads `lib/plugin-stub-registry.js` and creates `premium/` + `lib/premium-stubs/` fallback files.
- **Build Modes**: `npm run build` (with premium), `npm run build:os` (open-source via `ENABLE_PREMIUM=false`).

## Code Style

- TypeScript strict mode, no `any`
- Functional components + hooks (no classes)
- Named exports for components, default export only for pages
- Tailwind CSS for styling, no CSS modules
- Russian language for UI text, English for code/comments

## Commands

- `npm run dev` — development server
- `npm run dev:os` — development server (open-source mode, no premium)
- `npm run build` — production build  
- `npm run build:os` — production build (open-source mode, no premium)
- `docker compose up -d` — Docker deployment

## Additional Conventions

| Principle     | Rule                                                                                        |
|---------------|---------------------------------------------------------------------------------------------|
| SRP           | One file = one entity. The `usePersistentChat` hook must not contain file upload logic      |
| OCP           | New provider = new file in `lib/providers/`, not edits to `route.ts`                        |
| ISP           | Components receive only the props they need, not the full hook state                        |
| DIP           | Hooks depend on abstractions (types in `lib/types.ts`), not concrete API endpoints          |
| Max 200 lines | Hard limit. Violation = immediate decomposition                                             |
| Plugin OCP    | New premium feature = new plugin in `premium/plugins/`, not edits to core routes            |
| Plugin DIP    | Plugins depend on core abstractions, core routes try plugins first, then fallback          |