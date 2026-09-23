# Healthy Nation

A comprehensive personal healthcare web app: vitals dashboard, AI symptom checker, doctor search & booking, medical history (conditions/medications), pharmacy delivery, and emergency SOS.

## Architecture

pnpm monorepo with three artifacts:
- `artifacts/healthy-nation` — React + Vite frontend (this is the main user-facing app at `/`)
- `artifacts/api-server` — Express 5 + Drizzle + Postgres backend at `/api`
- `artifacts/mockup-sandbox` — design sandbox (unused for this app)

Shared libraries:
- `lib/api-spec` — OpenAPI source of truth (`openapi.yaml`); Orval generates client + zod schemas
- `lib/api-client-react` — generated TanStack Query hooks (consumed by frontend)
- `lib/api-zod` — generated zod schemas (consumed by backend for request validation)
- `lib/db` — Drizzle schema + connection pool

## Data model

Single demo user (no auth in this build). Tables: `profile`, `vitals`, `doctors`, `appointments`, `medications`, `conditions`, `medicines`, `pharmacies`, `orders`, `order_items`, `triage_sessions`, `chat_messages`, `emergency_contacts`, `hospitals`, `sos_events`. Seeded automatically on server boot if empty (see `artifacts/api-server/src/seed.ts`).

## Triage logic

Rule-based assessment in `artifacts/api-server/src/routes/triage.ts`:
- Red-flag symptoms or severity ≥ 9 → emergency
- Urgent flags or severity ≥ 6 or duration ≥ 14 days → urgent
- Otherwise routine

Specialty routing maps common symptoms → specialty.

## Key commands

- Codegen: `pnpm --filter @workspace/api-spec run codegen`
- DB push: `pnpm --filter @workspace/db run push`
- Typecheck libs: `pnpm -w run typecheck:libs`

## Notes

- OpenAPI title must remain `"Api"` — Orval uses it for import paths.
- `lib/api-zod/src/index.ts` re-exports only from `./generated/api` (not types) — the type and zod-schema names collide for path params.
- All currency in the API is integers in cents/paise; the frontend divides by 100 for display.
- Vitals classification (normal/warning/critical) is computed server-side on insert.
