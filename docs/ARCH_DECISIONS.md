# Architecture Decisions (Variant 1)

## Формат продукта
Mobile-first web app + PWA-lite (будет добавлен позже).

## Архитектурный стиль
Modular monolith:
- `apps/web` — UI.
- `apps/api` — HTTP API и доменная логика.
- `apps/worker` — асинхронная обработка триггеров/уведомлений.
- `packages/shared-types` — shared contracts.

## Инфраструктура
- PostgreSQL — основная БД.
- Redis — очереди и технические key-value сценарии.
- MinIO — private S3-compatible storage для фото.

## Почему так
- Быстрый старт без микросервисной сложности.
- Self-hosted friendly для РФ-реалий.
- Есть путь роста к более сложным trigger/notification/analytics сценариям.

## Нельзя упрощать
- Role/object access checks.
- Invite token security.
- Private media access control.
- Идемпотентность submit отчета.
