# State

**Phase:** 3 of 5 (Frontend Foundation) — In Progress
**Plan:** 2 of 3
**Status:** Phase 3 in progress, plan 03-02 complete
**Progress:** [█████████░] 86%

## Last Activity

2026-02-21 — Completed Phase 3 Plan 02 (Shared Models + API Service). TypeScript interfaces created mirroring backend API response shapes (DiagnosticEvent, EventFilters, PaginatedResponse<T>, ErrorsPerVehicle, TopCode, CriticalVehicle). DiagnosticsApiService with 4 typed HttpClient methods using dynamic HttpParams, truthy checks skip undefined/empty filter values. Barrel export at core/models/index.ts.

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
- timestamp: string on frontend (not Date) — JSON.stringify converts backend Date to ISO string over the wire
- Truthy checks for HttpParams — skips undefined AND empty strings, matches Zod backend validation
- inject() over constructor injection — Angular 19 preferred pattern for standalone services
- Base URL /api — works in dev (proxy) and prod (nginx) without environment-specific URLs

## Blockers

- Use `@ngrx/component-store@^19.0.0` — NOT `latest` (npm latest is Angular 21 aligned) [RESOLVED in 03-01]
- Use `swagger-ui-express` v5 — required for Express 5 compatibility
- catchError INSIDE switchMap inner pipe only (use tapResponse) — outer catchError kills effect stream
- TypeORM `synchronize: true` dev only — disable in Docker build
