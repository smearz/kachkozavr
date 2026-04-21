# AGENT HANDOFF (Kachkozavr MVP)

## 1) Что это за проект

- Продукт: control-loop для trainer/student.
- Цикл: assignment -> execution -> report -> trigger evaluation -> trainer action.
- Формат: mobile-first web + API + worker.

## 2) Текущий стек

- Web: Next.js (app router), TypeScript.
- API: Fastify, TypeScript, JWT auth, Prisma.
- Worker: BullMQ + Redis, Prisma.
- DB: PostgreSQL.
- Media: filesystem provider (не MinIO).
- Infra local: docker-compose (Postgres + Redis).

## 3) Ключевые архитектурные решения

- Modular monolith (не microservices).
- Trigger processing вынесен в централизованный `events` block в worker:
  - `apps/worker/src/events/config.ts`
  - `apps/worker/src/events/dispatcher.ts`
  - `apps/worker/src/events/trigger-engine.ts`
- Media для MVP: private files через API (`MEDIA_ROOT`), а не external object storage.

## 4) Что уже реализовано (фактически)

### Auth/Invite/Join
- `POST /auth/trainer/signup`
- `POST /auth/login`
- `POST /groups`
- `GET /groups`
- `POST /invites`
- `POST /invites/revoke`
- `GET /invites/validate?token=...`
- `POST /invites/join`

### Programs/Assignments
- `POST /programs`
- `GET /programs`
- `POST /assignments` (single active assignment per student)
- `GET /students/me/current-workout`

### Reports/Media
- `POST /reports/submit` with idempotency key
- `POST /reports/:reportId/attachments` (multipart, filesystem)
- `GET /attachments/:attachmentId/content` (private access checks)

### Triggers/Queue
- API enqueue on report submit (`report-submitted`)
- Worker pipeline + recurring reconcile
- Rule implemented: `no_report_7d` (activate + auto-resolve)
- Trainer trigger endpoints:
  - `GET /trainer/attention-queue`
  - `POST /trainer/triggers/:triggerId/resolve`

### Web UI (minimum)
- `/trainer/auth`
- `/trainer/groups`
- `/join`
- `/trainer/attention`

## 5) Важные фиксы, которые уже внесены

- Queue publish fail-fast в API (иначе были потенциальные зависания).
- API smoke: добавлены жесткие curl timeouts + job timeout.
- Race-safe report idempotency (`P2002` fallback).
- Join race mapping: controlled 400/404 вместо 500.
- `no_report_7d` reconcile ограничен активными assignment.
- JWT hardening: без `JWT_SECRET` вне `development` API не стартует.

## 6) CI/Automation

- `API Smoke (Core Loop Slice)` workflow покрывает core API slice, включая attachment upload/read.
- Auto-close issues по коммит marker:
  - `Issue-Title: <exact issue title>`
- Project sync workflows уже добавлены и настраивались ранее.

## 7) Процесс работы (обязательный)

- Каждое изменение связывать с задачей GitHub Project/Issue.
- Если нужна новая логическая задача -> сначала добавить в `project/mvp-issues.json`, запушить, потом делать реализацию.
- Коммит должен содержать `Issue-Title: ...` для автозакрытия.
- Комментарии/описания для пользователя — на русском (термины/сущности на английском допустимы).

## 8) Что осталось сделать (основное)

- Trigger rules:
  - `two_skipped_in_row`
  - `wellbeing_low_n_times`
- Unified explainability payload conventions для всех trigger rules.
- Program evaluation service (adherence + plan-vs-actual trend).
- In-app notifications for trigger activation.
- Rate limiting (auth/invite/upload/report).
- Runbook/backup-restore/release docs.
- E2E smoke tests beyond current API workflow.

## 9) Технические нюансы / осторожности

- `README.md` ранее ломался по кодировке; текущая версия переписана. Следить за UTF-8.
- В PowerShell иногда проблемы с lock/permissions в `.git`; при необходимости использовать escalation.
- В этом окружении локально не всегда доступен docker; CI workflow часто надежнее для e2e-проверок.

## 10) Быстрый старт для следующего хода

1. Проверить `git status` (должен быть clean).
2. Выбрать следующий item из backlog.
3. Если item новый — добавить в `project/mvp-issues.json`, запушить.
4. Реализовать, прогнать typecheck/build (`api/web/worker` по нужным пакетам).
5. Коммит с `Issue-Title`.
6. Короткий отчет: что сделано, что проверено, что дальше.
