# kachkozavr

MVP для control-loop продукта тренера и ученика.

## GitHub Project tracking

Инструкция: [SETUP_GITHUB_PROJECTS.md](./SETUP_GITHUB_PROJECTS.md)

## Локальный старт

1. Поднять инфраструктуру:
   - `pnpm compose:up`
2. Запустить сервисы по отдельности:
   - `pnpm dev:api`
   - `pnpm dev:web`
   - `pnpm dev:worker`

## Текущий статус

- Базовый монорепо-скелет готов.
- Подготовлен минимальный API health endpoint (`/health`).
- Подготовлен worker-процесс для очередей.
- Добавлен docker-compose для PostgreSQL, Redis, MinIO.
