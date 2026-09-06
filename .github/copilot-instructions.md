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
- extensions/ # Git submodule with closed-source plugins (providers, billing, etc.)


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
- **Plugin System**: optional features are implemented as plugins in the `extensions/` submodule.
  Behaviour is overridden through the DI container; core routes resolve strategies
  via `container.get(...)`. Admin UI loads plugin tabs from `/api/plugins/capabilities`.

## Plugin System

- **Plugin Interface** (`lib/types.ts`): `id`, `name`, `register`, `adminTabs`, `uiSlots`, `apiRoutes`.
  Behaviour changes go through `register(container)` — never through ad-hoc hooks.
- **DI Container** (`lib/container.ts`): six strategy slots — `providerResolver`, `modelFactory`,
  `usageTracker`, `pricingPolicy`, `modelAccessPolicy`, `userLifecycle`.
  `lib/plugin-loader.ts` registers OSS defaults first; plugins override. Last register wins.
- **Adding New Plugins** (no core files to edit):
  1. Create folder `extensions/plugins/{plugin}/`, implement `Plugin`, register in `extensions/index.ts`.
  2. Declare UI slots in `extensions/plugins/{plugin}/ui-slots.json`:
     `{ "<slot-id>": { "component": "components/foo", "inline": false } }`.
- **UI Slots**: `scripts/generate-plugin-slots.js` scans the manifests and emits
  `lib/generated/plugin-slots.ts` (gitignored) with literal dynamic imports.
  `PluginSlot` in `lib/plugin-ui.tsx` consumes that map and renders `fallback`
  for slots no plugin fills. With `ENABLE_PLUGINS=false` the map is empty,
  so plugin components are never bundled.
- **Plugin Bridge**: `lib/plugins.ts` loads the registry from `@plugins` and exposes
  `adminTabs` / `uiSlots` / `apiRoutes`. When the submodule is absent, `lib/plugin-stub.ts`
  supplies an empty plugins array.
- **Stub Generation**: `npm run prepare:plugins` (`postinstall` + before every dev/build)
  runs `scripts/ensure-plugin-stub.js` and `scripts/generate-plugin-slots.js`.
- **Build Modes**: `npm run build` (with plugins), `npm run build:os` (open-source via `ENABLE_PLUGINS=false`).

## Documentation Is Part of the Change

Documentation is not a follow-up task. A change that alters observable behaviour
is **incomplete** until the docs are updated in the same turn. Never finish a
task by saying docs will be updated later.

When you touch the left column, update the right one:

| Changed | Must update |
|---|---|
| Any signature in `lib/contracts/` | Extension-point table in both plugin docs |
| `Plugin` / `PluginAdminTab` in `lib/types.ts` | Both plugin docs + `## Plugin System` above |
| `ServiceMap` slots in `lib/container.ts` | Both plugin docs + `## Plugin System` above |
| OSS defaults in `lib/strategies/` | "OSS default" column in both plugin docs |
| `package.json` scripts | `## Commands` below, `README.md`, "Running it" in both plugin docs |
| Folder layout or path aliases | `## Project Structure` above, both plugin docs |
| New `getPluginRoute` delegator in `app/api/` | Delegated-path list in both plugin docs |
| `ui-slots.json` schema or the slot generator | `## Plugin System` above, section 5 of both plugin docs |

`internal-docs/plugin-development.md` (EN) and `internal-docs/plugin-development.ru.md`
(RU) are translations of each other — **never update one without the other**.

Verify claims before writing them down. Documentation asserting behaviour that
the code does not have is worse than no documentation.

## Breaking Change Protocol

The plugin API is consumed by an out-of-tree submodule and, once published, by
third-party developers. `tsc` cannot see those consumers, so **the compiler will
not warn you**. Absence of type errors is not evidence that a change is safe.

Before changing `lib/contracts/`, `ServiceMap`, `Plugin`, `PluginAdminTab`, the
`ui-slots.json` schema, or a delegated API path:

1. **Warn explicitly.** Open the reply with the contract name, the old shape and
   the new shape. Do not bury it in a summary.
2. **Show the blast radius.** Grep `extensions/` and list every consumer found,
   including "none found" as an explicit result.
3. **Ask before proceeding** when the change is not backwards compatible:
   removing or renaming a member, narrowing a return type, changing a slot id.
4. **Never silently delete** an interface member — report it as a breaking
   change even when nothing in this repository currently uses it.

Additive changes (a new optional field, a new container slot that ships an OSS
default) are not breaking. Say so explicitly, so the distinction stays visible.

## Code Style

- TypeScript strict mode, no `any`
- Functional components + hooks (no classes)
- Named exports for components, default export only for pages
- Tailwind CSS for styling, no CSS modules
- Russian language for UI text, English for code/comments

## Commands

- `npm run dev` — development server (premium, `data/`, port 3000)
- `npm run dev:os` — development server (open-source, `data-oss/`, port 3010)
- `npm run build` — production build  
- `npm run build:os` — production build (open-source mode, `ENABLE_PLUGINS=false`)
- `docker compose up -d` — Docker deployment

Runtime data lives in `DATA_DIR` (default `./data`). OSS runs use a separate
directory so they never corrupt premium data.

## Additional Conventions

| Principle     | Rule                                                                                        |
|---------------|---------------------------------------------------------------------------------------------|
| SRP           | One file = one entity. The `usePersistentChat` hook must not contain file upload logic      |
| OCP           | New provider = new file in `lib/providers/`, not edits to `route.ts`                        |
| ISP           | Components receive only the props they need, not the full hook state                        |
| DIP           | Hooks depend on abstractions (types in `lib/types.ts`), not concrete API endpoints          |
| Max 200 lines | Hard limit. Violation = immediate decomposition                                             |
| Plugin OCP    | New optional feature = new plugin in `extensions/plugins/`, not edits to core routes        |
| Plugin DIP    | Plugins register strategies in the DI container; core depends on contracts, not on plugins  |
| Docs sync     | Behaviour change without a doc update in the same turn = incomplete change                  |
| Docs parity   | EN and RU plugin docs are updated together, never one alone                                 |
| Contract warn | Touching `lib/contracts/`, `ServiceMap` or `Plugin` = explicit breaking-change warning first |
| No silent API drops | Removing an interface member is reported even if nothing in this repo uses it          |