# kachkozavr

MVP для control-loop продукта тренера и ученика.

## GitHub Project tracking

Инструкция: [SETUP_GITHUB_PROJECTS.md](./SETUP_GITHUB_PROJECTS.md)

## Локальный старт

1. Поднять инфраструктуру:
   - `pnpm compose:up`
   - bucket `reports-private` создается автоматически через `minio-init`
2. Установить зависимости:
   - `pnpm install`
3. Подготовить переменные:
   - скопировать `.env.example` в `.env`
4. Для API с Prisma:
   - `pnpm --filter @kachkozavr/api prisma:generate`
   - `pnpm --filter @kachkozavr/api prisma:migrate:dev`
   - `pnpm --filter @kachkozavr/api prisma:seed`
   - при первом запуске укажи `JWT_SECRET` в `.env`
5. Запустить сервисы по отдельности:
   - `pnpm dev:api`
   - `pnpm dev:web`
   - `pnpm dev:worker`

## Текущий статус

- Базовый монорепо-скелет готов.
- Подготовлен минимальный API health endpoint (`/health`).
- Подготовлен worker-процесс для очередей.
- Добавлен docker-compose для PostgreSQL, Redis, MinIO.
- Добавлены auth endpoints:
  - `POST /auth/trainer/signup`
  - `POST /auth/login`

## Процесс работы с задачами

- Для автоматического закрытия issue без номера используем marker в commit message:
  - `Issue-Title: <точный заголовок issue>`
- Workflow сам находит открытый issue по заголовку и закрывает его.
