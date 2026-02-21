# State

**Phase:** 3 of 5 (Frontend Foundation) — In Progress
**Plan:** 1 of 3
**Status:** Phase 3 in progress, plan 03-01 complete
**Progress:** [████▒░░░░░] 47%

## Last Activity

2026-02-21 — Completed Phase 3 Plan 01 (Angular Foundation). Angular 19 standalone project scaffolded with proxy config (/api/* -> localhost:3000), @ngrx/component-store@19.2.1 installed, app shell with sidebar nav (Dashboard/Events), lazy-loaded route stubs, BMW-inspired CSS custom properties in styles.scss.

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
- @ngrx/component-store@^19.0.0 pinned — npm latest resolves to Angular 21 aligned v21.x
- Lazy loadComponent for all routes — separate JS chunks per feature route
- CSS custom properties over SCSS variables — browser-inspectable, runtime-changeable design tokens

## Blockers

- Use `@ngrx/component-store@^19.0.0` — NOT `latest` (npm latest is Angular 21 aligned) [RESOLVED in 03-01]
- Use `swagger-ui-express` v5 — required for Express 5 compatibility
- catchError INSIDE switchMap inner pipe only (use tapResponse) — outer catchError kills effect stream
- TypeORM `synchronize: true` dev only — disable in Docker build
