# Family AI Hub

Семейный AI-хаб — self-hosted чат-приложение с поддержкой нескольких LLM-моделей (Google Gemini, OpenRouter: GPT-4o, Claude, Llama, DeepSeek) и генерацией изображений (DALL-E 3).

## Возможности

- 🔐 **Аутентификация** — JWT-сессии, файловое хранилище пользователей (`data/users.json`)
- 👨‍👩‍👧‍👦 **Админ-панель** — управление пользователями (добавление, удаление, сброс пароля)
- 💬 **Мультимодельный чат** — потоковый ответ, Markdown-рендеринг, выбор модели
- 🎨 **Генерация изображений** — DALL-E 3 через OpenRouter
- 🐳 **Docker** — готовый Dockerfile и docker-compose

## Технологии

- **Next.js 16** (App Router, TypeScript)
- **AI SDK v6** (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/react`)
- **Tailwind CSS v4**
- **jose** (JWT)
- **react-markdown** + **remark-gfm**
- **lucide-react** (иконки)

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env.local` и заполните:

```bash
cp .env.example .env.local
```

Необходимые ключи:
- `GOOGLE_GENERATIVE_AI_API_KEY` — ключ Google AI Studio
- `OPENROUTER_API_KEY` — ключ OpenRouter
- `JWT_SECRET` — секрет для JWT (минимум 32 символа)
- `ADMIN_INIT_PASS` — пароль администратора при первом запуске

### 3. Запуск

```bash
npm run dev
```

Откройте http://localhost:3000. При первом входе используйте логин `admin` и пароль из `ADMIN_INIT_PASS`.

## Docker

```bash
docker compose up -d
```

## Структура проекта

```
app/
├── api/
│   ├── auth/login/   — авторизация
│   ├── auth/logout/  — выход
│   ├── chat/         — streaming чат
│   ├── image/        — генерация изображений
│   └── users/        — управление пользователями
├── admin/            — админ-панель
├── login/            — страница входа
└── page.tsx          — основной чат
lib/
├── auth.ts           — JWT, хранение пользователей
├── models.ts         — список моделей
└── utils.ts          — утилиты
middleware.ts          — защита маршрутов
```

## Доступные модели

### Чат
| Модель | Провайдер |
|--------|-----------|
| Gemini 2.0 Flash | Google |
| Gemini 2.5 Pro | Google |
| Gemini 2.5 Flash | Google |
| GPT-4o | OpenRouter |
| GPT-4o Mini | OpenRouter |
| Claude Sonnet 4 | OpenRouter |
| Claude 3.5 Haiku | OpenRouter |
| Llama 3.3 70B | OpenRouter |
| DeepSeek V3 | OpenRouter |

### Изображения
| Модель | Провайдер |
|--------|-----------|
| DALL-E 3 | OpenRouter |
