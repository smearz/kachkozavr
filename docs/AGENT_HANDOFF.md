# AGENT HANDOFF (Kachkozavr MVP)

## 1) Product Snapshot

- Product type: control-loop for trainer/student.
- Core loop: assignment -> execution -> report -> trigger evaluation -> trainer action.
- Current delivery format: mobile-first web + API + worker.

## 2) Current Stack

- Web: Next.js (app router), TypeScript.
- API: Fastify, JWT auth, Prisma.
- Worker: BullMQ + Redis + Prisma.
- DB: PostgreSQL.
- Media: filesystem provider (`MEDIA_ROOT`), private access via API.
- Local infra: docker-compose with Postgres + Redis.

## 3) Important Architecture Decisions

- Modular monolith (not microservices).
- Trigger logic centralized in worker `events` block:
  - `apps/worker/src/events/config.ts`
  - `apps/worker/src/events/dispatcher.ts`
  - `apps/worker/src/events/trigger-engine.ts`
- Media kept simple for MVP: filesystem storage, no MinIO dependency in primary path.

## 4) Implemented API Surface

### Auth / Invite / Membership
- `POST /auth/trainer/signup`
- `POST /auth/login`
- `POST /groups`
- `GET /groups`
- `POST /invites`
- `POST /invites/revoke`
- `GET /invites/validate?token=...`
- `POST /invites/join`

### Programs / Assignments
- `POST /programs`
- `GET /programs`
- `POST /assignments`
- `GET /students/me/current-workout`

### Reports / Media
- `POST /reports/submit` (idempotency key)
- `POST /reports/:reportId/attachments` (multipart -> filesystem)
- `GET /attachments/:attachmentId/content` (private read)

### Triggers / Trainer Ops
- `GET /trainer/attention-queue`
- `POST /trainer/triggers/:triggerId/resolve`
- Worker rules implemented:
  - `no_report_7d`
  - `two_skipped_in_row`
  - `wellbeing_low_n_times`

### Program Evaluation
- `GET /trainer/students/:studentId/program-evaluation`
  - adherence metrics
  - plan-vs-actual deltas
  - simple trend direction

## 5) Implemented Web Screens

- `/trainer/auth`
- `/trainer/groups`
- `/join`
- `/trainer/attention`
- `/trainer/evaluation`

## 6) Critical Fixes Already Applied

- Queue publish now fail-fast to avoid hanging report submit.
- API smoke workflow has strict curl timeouts + job timeout.
- Race-safe idempotency fallback for duplicate report submit (`P2002` path).
- Invite join race mapped to controlled 400/404 instead of 500.
- Reconcile now scopes to students with active assignments.
- JWT secret hardened: required outside `NODE_ENV=development`.

## 7) CI / Automation

- Workflow: `API Smoke (Core Loop Slice)` covers auth/invite/program/assignment/report/attachment path.
- Issues auto-close supported via commit marker:
  - `Issue-Title: <exact issue title>`
- Project sync workflows are in repo and used.

## 8) Workflow Rules (Must Keep)

- Every meaningful change should map to GitHub Project task/issue.
- If task does not exist, add it to `project/mvp-issues.json` first.
- Commit messages should include `Issue-Title: ...` for auto-close.
- User-facing progress/comments in Russian (English terms for entities are fine).

## 9) Remaining High-Value Tasks

- In-app notifications for trigger activation.
- Rate limiting for auth/invite/upload/report endpoints.
- Extend domain events consistency across all modules.
- Full runbook (local run, backup/restore, release checklist).
- Broader E2E coverage beyond current smoke.

## 10) Known Environment Gotchas

- Watch encoding issues (UTF-8) in markdown docs.
- Sometimes lock/permission issues in `.git` via PowerShell; escalation may be needed.
- Local environment may miss Docker access; CI workflow is more reliable for E2E confirmation.

## 11) Next-Step Protocol

1. Check `git status` is clean.
2. Pick next backlog item.
3. Implement.
4. Run typecheck/build for affected apps.
5. Commit with `Issue-Title`.
6. Push and report done/next.
