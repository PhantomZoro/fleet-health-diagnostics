# State

**Phase:** 1 of 5 (Backend Data Layer)
**Plan:** 1 of 4
**Status:** In progress
**Progress:** [░░░░░░░░░░] 5%

## Last Activity

2026-02-21 — Completed 01-01 (Project Scaffolding). Express 5 + TypeORM + DiagnosticEvent entity scaffolded.

## Decisions

- Express over NestJS — lighter weight, shows raw architecture
- ComponentStore over NgRx Store — right-sized for single-feature app
- SQLite + TypeORM — real SQL, persists, production-like patterns
- tsx over ts-node-dev — esbuild-based, no ESM friction
- NodeNext module resolution — .js extensions on relative imports, required for ESM
- better-sqlite3 over sqlite3 — synchronous, better TypeORM integration
- synchronize:true for dev — auto-creates tables, disabled in Docker prod

## Blockers

- Use `@ngrx/component-store@^19.0.0` — NOT `latest` (npm latest is Angular 21 aligned)
- Use `swagger-ui-express` v5 — required for Express 5 compatibility
- catchError INSIDE switchMap inner pipe only (use tapResponse) — outer catchError kills effect stream
- TypeORM `synchronize: true` dev only — disable in Docker build
