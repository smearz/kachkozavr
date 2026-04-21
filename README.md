# kachkozavr

MVP для control-loop продукта тренера и ученика.

## GitHub Project tracking

Инструкция: [SETUP_GITHUB_PROJECTS.md](./SETUP_GITHUB_PROJECTS.md)

## Локальный старт

1. Поднять инфраструктуру:
   - `pnpm compose:up`
2. Установить зависимости:
   - `pnpm install`
3. Подготовить переменные:
   - скопировать `.env.example` в `.env`
4. Для API с Prisma:
   - `pnpm --filter @kachkozavr/api prisma:generate`
   - `pnpm --filter @kachkozavr/api prisma:migrate:dev`
   - `pnpm --filter @kachkozavr/api prisma:seed`
5. Запустить сервисы:
   - `pnpm dev:api`
   - `pnpm dev:web`
   - `pnpm dev:worker`

## Текущий статус API

- `POST /auth/trainer/signup`
- `POST /auth/login`
- `POST /invites`
- `POST /invites/revoke`
- `GET /invites/validate?token=...`
- `POST /invites/join`
- `POST /programs`
- `GET /programs`
- `POST /assignments`
- `GET /students/me/current-workout`
- `POST /reports/submit`
- `POST /reports/:reportId/attachments` (filesystem provider)
- `GET /attachments/:attachmentId/content` (private read)

## Media storage (MVP)

- Для MVP используется локальный `filesystem provider`.
- Директория задается через `MEDIA_ROOT`.
- Доступ к файлам только через API с проверкой владения.

## Процесс работы с задачами

- Для автоматического закрытия issue без номера используем marker в commit message:
  - `Issue-Title: <точный заголовок issue>`
- Workflow находит открытый issue по заголовку и закрывает его.
