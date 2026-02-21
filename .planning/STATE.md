# State

**Phase:** 4 of 5 (Frontend Views) — COMPLETE
**Plan:** 4 of 4 complete
**Status:** Phase 4 Plan 04 complete — HTTP error interceptor, toast notifications, OnPush/ARIA/semantic HTML audit, keyboard navigation
**Progress:** [██████████] 100%

## Last Activity

2026-02-21 — Completed Phase 4 Plan 04 (Error Handling + Polish). HttpErrorInterceptor functional interceptor registered via withInterceptors([httpErrorInterceptor]) in provideHttpClient. NotificationService BehaviorSubject singleton with 5s auto-dismiss. ToastComponent at app root level with aria-live, role=alert, slide-in animation. FilterPanel wrapped in form for Enter key submission. All 7 Phase 4 components verified: OnPush, semantic HTML (main/nav/section/table/fieldset), ARIA (aria-label/aria-live/role on all interactive elements). Build passes zero errors zero warnings.

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
- [Phase 04-frontend-views]: cross-view navigation via queryParams — isolated component-level stores cannot share state, queryParams is the correct Angular transport
- [Phase 04-frontend-views]: take(1) on ActivatedRoute.queryParams — one-shot init read prevents memory leak from never-completing queryParams observable
- [Phase 04-frontend-views]: throwError(() => error) in interceptor catchError — re-propagates to store's inner catchError for error$ state update
- [Phase 04-frontend-views]: HttpInterceptorFn with inject() inside function — Angular 19 functional interceptor pattern, no class needed
- [Phase 04-frontend-views]: withInterceptors([httpErrorInterceptor]) in provideHttpClient — tree-shakeable functional interceptor registration
- [Phase 04-frontend-views]: <form (ngSubmit)> wrapping FilterPanel — native Enter key submission, requires name attributes on all ngModel inputs
- [Phase 04-frontend-views]: Date.now() as notification id — unique, monotonically increasing, zero external dependencies

## Blockers

- Use `@ngrx/component-store@^19.0.0` — NOT `latest` (npm latest is Angular 21 aligned) [RESOLVED in 03-01]
- Use `swagger-ui-express` v5 — required for Express 5 compatibility
- catchError INSIDE switchMap inner pipe only (tapResponse removed from v19) — outer catchError kills effect stream [RESOLVED in 03-03: catchError+EMPTY inside inner pipe]
- TypeORM `synchronize: true` dev only — disable in Docker build
- export type (not export) for all interface re-exports in barrel files when isolatedModules:true [RESOLVED in 04-02]
