# State

**Phase:** 2 of 5 (Backend API Layer) — COMPLETE
**Plan:** 2 of 2
**Status:** Phase 2 complete, ready for Phase 3
**Progress:** [████░░░░░░] 40%

## Last Activity

2026-02-21 — Completed Phase 2 (Backend API Layer). All plans done: GET /api/events with 5 combinable filters + pagination, 3 aggregation endpoints (errors-per-vehicle, top-codes, critical-vehicles), Zod validation with 400 responses, global error handling, Swagger UI at /api-docs.

## Decisions

- Express over NestJS — lighter weight, shows raw architecture
- ComponentStore over NgRx Store — right-sized for single-feature app
- SQLite + TypeORM — real SQL, persists, production-like patterns
- tsx over ts-node-dev — esbuild-based, no ESM friction
- NodeNext module resolution — .js extensions on relative imports, required for ESM
- better-sqlite3 over sqlite3 — synchronous, better TypeORM integration
- synchronize:true for dev — auto-creates tables, disabled in Docker prod
- QueryBuilder over findBy — findBy with undefined silently returns all rows
- res.locals.validated — Zod middleware stores parsed params for route handlers
- DB-relative time for critical vehicles — MAX(timestamp) - 24h, not system time

## Blockers

- Use `@ngrx/component-store@^19.0.0` — NOT `latest` (npm latest is Angular 21 aligned)
- Use `swagger-ui-express` v5 — required for Express 5 compatibility
- catchError INSIDE switchMap inner pipe only (use tapResponse) — outer catchError kills effect stream
- TypeORM `synchronize: true` dev only — disable in Docker build
