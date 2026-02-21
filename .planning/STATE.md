# State

**Phase:** 4 of 5 (Frontend Views) — IN PROGRESS
**Plan:** 2 of 4 complete
**Status:** Phase 4 Plan 02 complete — Events view smart container built
**Progress:** [████████░░] 82%

## Last Activity

2026-02-21 — Completed Phase 4 Plan 02 (Events View). EventsComponent smart container implemented at /events: providers:[DiagnosticsStore], OnPush, Angular 19 @if/@for template syntax, async pipe throughout (zero manual subscriptions), semantic <table> with five columns, <app-filter-panel>/<app-severity-badge>/<app-pagination>/<app-loading-spinner> wired, empty state "No events match your filters". Fixed pre-existing isolatedModules error in core/models/index.ts (export type for all interfaces). Build passes with zero errors.

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
- [Phase 03-frontend-foundation]: catchError inside switchMap inner pipe returns EMPTY — tapResponse not in @ngrx/component-store v19, identical stream-safe behavior
- [Phase 03-frontend-foundation]: DiagnosticsStore @Injectable() without providedIn — ComponentStore per-feature instance pattern
- [Phase 04-frontend-views]: FormsModule + ngModel for FilterPanel — simple two-way binding, no reactive forms overhead for five independent filter fields
- [Phase 04-frontend-views]: OnPush on all dumb components — inputs-only re-render, prevents zone-triggered cycles in event table rows
- [Phase 04-frontend-views]: AsyncPipe imported explicitly (not CommonModule) — tree-shakeable, standalone component pattern
- [Phase 04-frontend-views]: providers:[DiagnosticsStore] at component level — isolated store instance per route with lifecycle tied to component
- [Phase 04-frontend-views]: export type on all core/models/index.ts re-exports — required for isolatedModules:true TS compatibility

## Blockers

- Use `@ngrx/component-store@^19.0.0` — NOT `latest` (npm latest is Angular 21 aligned) [RESOLVED in 03-01]
- Use `swagger-ui-express` v5 — required for Express 5 compatibility
- catchError INSIDE switchMap inner pipe only (tapResponse removed from v19) — outer catchError kills effect stream [RESOLVED in 03-03: catchError+EMPTY inside inner pipe]
- TypeORM `synchronize: true` dev only — disable in Docker build
- export type (not export) for all interface re-exports in barrel files when isolatedModules:true [RESOLVED in 04-02]
