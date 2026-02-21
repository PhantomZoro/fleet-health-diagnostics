# Project Research Summary

**Project:** Fleet Health Diagnostics Console
**Domain:** Ops/observability tooling — internal vehicle diagnostics console (Angular + Express + TypeORM + SQLite)
**Researched:** 2026-02-21
**Confidence:** HIGH

## Executive Summary

This project is an internal ops console for fleet vehicle diagnostics — closer to Kibana for OBD-II logs than to fleet management SaaS. The users are operations engineers, not consumers. The mental model is a structured log explorer with a severity-aware event table, combinable filters, and an aggregated summary dashboard. Everything in the stack is fixed by the assignment: Express 5.1.x, TypeORM 0.3.x, SQLite, Angular 19.2, and NgRx ComponentStore. Research confirms that these are the correct current-stable versions and that this combination is coherent and well-supported.

The recommended approach is a strict five-phase delivery: backend data layer first (entity + seed pipeline), then backend API layer (routes, services, Swagger), then frontend foundation (API service, ComponentStore, routing), then frontend views (events table + dashboard), and finally Docker integration. This order is non-negotiable — the ComponentStore effects depend on the API service, which depends on running backend endpoints. Deviating from this build order introduces integration risk with no compensating benefit.

The two highest-impact risks are: (1) placing `catchError` at the outer observable level in ComponentStore effects, which silently kills the effect stream on first error and is the most common senior-level Angular mistake, and (2) failing to demonstrate intentional RxJS operator selection (switchMap, debounceTime, distinctUntilChanged, tapResponse) — this is the explicit evaluation criterion for the BMW reviewer and must be visible and deliberate in the code.

## Key Findings

### Recommended Stack

The stack is fully locked by the assignment. All versions have been verified against official sources. Angular 19.2.x (February 2026 latest stable) requires TypeScript 5.5–5.8 and RxJS 7.8.x. NgRx ComponentStore v19.x aligns with Angular 19 exactly. TypeORM 0.3.28 is the current stable branch (1.x does not exist yet). Express 5.1.x is now the npm `latest` tag as of March 2025 and provides native async error propagation, eliminating the need for `asyncHandler` wrappers or `express-async-errors`.

The supporting libraries that matter most for the build: `zod` v4 for query param validation (6.5x faster than v3, TypeScript-native inference), `tsx` (not `ts-node-dev`) for the backend dev server (esbuild-based, no ES module issues on Node 20), `@angular/material` v19 for the UI components (mat-table, mat-paginator, mat-select save significant time vs building from scratch), and `swagger-ui-express` v5 specifically (v5 is required for Express 5 compatibility).

**Core technologies:**
- Express 5.1.x: HTTP server, routing — native async error propagation, drop-in for v4 with no API changes for this project
- TypeORM 0.3.28 + SQLite (sqlite3 ^5.1.x): ORM + embedded database — file-based, zero infrastructure, sufficient for 500-event seed
- Angular 19.2 + NgRx ComponentStore 19.x: SPA + local state — standalone components, ComponentStore is explicitly evaluated
- Zod v4: Request validation — schema-inferred TypeScript types eliminate separate type declarations for query params
- tsx ^4.x: Backend dev runner — replaces ts-node-dev, instant restarts, no ES module friction

See [STACK.md](.planning/research/STACK.md) for full version table, compatibility matrix, and tsconfig patterns.

### Expected Features

This is an ops console. The users are engineers who read raw event logs and need fast triage. Features that feel missing in a log explorer feel broken here. Features from fleet SaaS (GPS, driver analytics, predictive maintenance) are out of scope and should be documented as future considerations, not built.

**Must have (table stakes) — P1:**
- Raw event log view with severity-coded display (ERROR/WARN/INFO badges) — engineers cannot triage without visual severity differentiation
- Multi-dimensional combinable filters (vehicleId, code, level, date range) — all optional, combinable, not mutually exclusive
- Pagination with total count display — 500+ events cannot render in one shot
- Aggregated summary dashboard — errors-per-vehicle, top error codes, critical vehicles (3+ ERRORs in 24h)
- Loading and empty states — blank screens during fetches destroy trust in ops tools
- Swagger/OpenAPI docs at `/api-docs` — explicitly required by assignment
- Structured log parser + realistic OBD-II seed data (500 events, 15-20 vehicles, 7-day spread, real codes)
- HTTP interceptor for global error handling on the frontend

**Should have (differentiators) — P2:**
- Click-to-filter cross-navigation (critical vehicle on dashboard → filtered events view) — demonstrates product thinking beyond feature delivery
- RxJS patterns done visibly and intentionally: debounceTime(300), switchMap, distinctUntilChanged, combineLatest, tapResponse — this is the evaluation criterion
- TypeORM QueryBuilder for dynamic WHERE chains (not string concatenation or multiple findBy calls)
- Docker delivery (docker-compose up) — turns reviewers from developers into users

**Defer (v2+) — P3:**
- Real-time WebSocket streaming — seed data + polling note satisfies "near-real time" requirement
- Chart visualizations — ranked lists convey the same information faster and more reliably
- Authentication / auth layer — internal tool assumption, out of scope
- Unit/integration test suite — document approach, do not implement

See [FEATURES.md](.planning/research/FEATURES.md) for full prioritization matrix and dependency graph.

### Architecture Approach

The backend follows a strict Routes → Services → Data Access layered architecture where route handlers are thin (validate, delegate, respond) and all business logic lives in services. The frontend uses a single `DiagnosticsStore` (NgRx ComponentStore) as the source of truth for all state — filters, events, pagination, aggregations, loading, error — shared across both the events view and the dashboard. Feature components (EventsComponent, DashboardComponent) are smart (inject store, wire observables). Shared components (FilterPanel, SeverityBadge, PaginationControls) are dumb (Input/Output only, no store dependency).

**Major components:**
1. Backend — `DiagnosticEvent` entity + TypeORM DataSource (SQLite, WAL mode, indexes on vehicleId/level/code/timestamp)
2. Backend — `EventsService` + `AggregationsService` using QueryBuilder (dynamic WHERE chains, getManyAndCount for pagination)
3. Backend — `LogParser` (pure function, regex-based) + `SeedRunner` (startup count guard → batch insert)
4. Frontend — `DiagnosticsApiService` (HttpClient wrappers, Observable returns) + `DiagnosticsStore` (ComponentStore, all RxJS patterns)
5. Frontend — `EventsComponent` (events table) + `DashboardComponent` (summary cards), both wiring to the single store

See [ARCHITECTURE.md](.planning/research/ARCHITECTURE.md) for full system diagram, project structure, data flow traces, and anti-patterns with code examples.

### Critical Pitfalls

1. **catchError placed on outer ComponentStore effect stream** — kills the entire effect permanently on first API error; subsequent filter changes fire no requests. Prevention: use `tapResponse` inside the inner `switchMap` pipe only. This is the most common senior Angular mistake and will be noticed by the reviewer.

2. **TypeORM `synchronize: true` left active after seeding** — auto-syncs schema on every restart, silently drops and recreates tables on entity changes, wiping all seed data. Prevention: gate seeding behind a `COUNT(*) === 0` guard; use `synchronize: true` in dev only and disable it in the Docker production image.

3. **Undefined filter values passed to `findBy` return all rows** — TypeORM strips `undefined` from findBy options, producing no WHERE clause. Prevention: use QueryBuilder with explicit `if (value) qb.andWhere(...)` chains for all optional filter params; validate empty strings at the Zod boundary before they reach the service.

4. **Wrong RxJS flattening operator** — `mergeMap` causes race conditions where out-of-order responses corrupt displayed state; `exhaustMap` silently drops the user's latest filter change while a request is in-flight. Prevention: use `switchMap` for all filter-triggered API calls — it cancels the previous in-flight request and uses the latest emission.

5. **Subscription memory leaks from unmanaged `.subscribe()` in components** — ComponentStore selectors are long-lived; manual subscriptions without cleanup multiply on each navigation. Prevention: use the `async` pipe in templates (unsubscribes automatically) or `takeUntilDestroyed()` from `@angular/core/rxjs-interop` for imperative subscriptions.

See [PITFALLS.md](.planning/research/PITFALLS.md) for the full pitfall list, warning signs, recovery strategies, and the "looks done but isn't" checklist.

## Implications for Roadmap

Based on research, the build must proceed backend-first because the Angular ComponentStore effects call the API service, which requires running backend endpoints for real integration verification. Within the frontend, there is a strict linear dependency: models → API service → ComponentStore → feature components → shared components.

### Phase 1: Backend Data Layer
**Rationale:** Everything else depends on the DiagnosticEvent entity and a populated database. The LogParser and SeedRunner are pure functions with no HTTP dependency — they can be built and verified independently before any Express routes exist.
**Delivers:** `DiagnosticEvent` entity, TypeORM DataSource with WAL mode and indexes, LogParser, SeedRunner with count guard, `/health` endpoint confirming seeded row count.
**Addresses:** Seed data requirement, log parser differentiator, realistic OBD-II event data.
**Avoids:** `synchronize: true` data wipe pitfall (count guard set up here); SQLite WAL mode / SQLITE_BUSY race condition (PRAGMA set immediately after DataSource.initialize()).

### Phase 2: Backend API Layer
**Rationale:** All frontend work blocks on a running API. Building the full API surface (events query, all aggregations, error handling, Swagger) before starting Angular prevents integration surprises mid-frontend development.
**Delivers:** `GET /api/events` with combinable filters + pagination (QueryBuilder, getManyAndCount), `GET /api/aggregations/errors-per-vehicle`, `GET /api/aggregations/top-codes`, `GET /api/aggregations/critical-vehicles` (3+ ERRORs in 24h), global error handler middleware, Zod validation middleware, Swagger/OpenAPI docs.
**Uses:** Express 5.1.x (async error propagation), TypeORM QueryBuilder, Zod v4, swagger-jsdoc + swagger-ui-express v5.
**Avoids:** `findBy` undefined param data leak (QueryBuilder used throughout); async handler crash pitfall (Express 5 handles natively); Swagger drift (JSDoc written in same commit as routes).

### Phase 3: Frontend Foundation
**Rationale:** The Angular scaffold, models, API service, and ComponentStore must be built as a unit because they have strict linear dependencies. The ComponentStore cannot be written without the API service; the API service cannot be type-safe without the shared models.
**Delivers:** Angular project scaffold with proxy config (`/api/*` → `localhost:3000`), shared TypeScript interfaces (`DiagnosticEvent`, `EventFilters`, `PaginatedResponse<T>`), `DiagnosticsApiService` (HttpClient wrappers), `DiagnosticsStore` with full state shape, updaters, and effects using debounceTime + distinctUntilChanged + switchMap + tapResponse, app shell with two routes.
**Implements:** ComponentStore as single source of truth, all required RxJS patterns.
**Avoids:** catchError outer-stream pitfall (tapResponse inside switchMap from the start); subscription memory leaks (async pipe + takeUntilDestroyed enforced from the start); wrong flattening operator (switchMap explicitly chosen and commented).

### Phase 4: Frontend Views
**Rationale:** Feature components and shared components depend on the store being functional. Building views after the store means each component can be wired to real observables immediately — no mocking needed.
**Delivers:** Shared components (FilterPanel, SeverityBadge, PaginationControls, LoadingSpinner), EventsComponent (events table, severity badges, loading/empty states), DashboardComponent (summary cards, errors-per-vehicle list, top-codes list, critical vehicles list), HttpErrorInterceptor, click-to-filter cross-navigation (P2).
**Uses:** Angular Material 19.x (mat-table, mat-paginator, mat-select, mat-progress-spinner), OnPush change detection, async pipe throughout.
**Avoids:** UX pitfalls (loading state shown before debounce fires, page resets to 1 on filter change, error toast keeps last good data visible, empty state distinct from loading state).

### Phase 5: Integration and Delivery
**Rationale:** Docker is validated last because it requires both the backend and frontend to be individually functional. Attempting Docker earlier wastes time debugging container networking before the application logic is verified.
**Delivers:** Backend Dockerfile (multi-stage, Node 20 LTS), frontend Dockerfile (multi-stage, nginx:alpine serving Angular build output), docker-compose.yml (both services on shared bridge network, nginx proxies `/api/*` to backend container service name), cold-start smoke test, documentation (REQUIREMENTS.md, ARCHITECTURE.md, README.md with docker-compose up instructions).
**Avoids:** Docker frontend→backend networking mistake (nginx `proxy_pass http://backend:3000`, not `localhost:3000`); seed guard verified to run inside container environment from a clean volume.

### Phase Ordering Rationale

- The backend-first order is driven by the frontend's hard dependency on running API endpoints for integration verification. Drafting frontend TypeScript interfaces can be done in parallel with Phase 1, but actual wiring requires Phase 2 to be running.
- Phases 1 and 2 are separated because the SeedRunner + LogParser are pure function concerns with no HTTP surface — testing them independently before adding the Express layer keeps scope contained and errors local.
- The ComponentStore (Phase 3) is built before the views (Phase 4) because the store is the dependency, not the consumer. Building views first against a mock store results in integration surprises when wired to real effects.
- Docker (Phase 5) is last because it is integration infrastructure, not application logic. Docker issues should not block feature development.

### Research Flags

Phases likely needing deliberate care during planning:
- **Phase 3 (ComponentStore effects):** The tapResponse / catchError placement and operator selection are the highest-risk implementation details. Plan explicit code review checkpoints against the pitfall patterns in PITFALLS.md before moving to Phase 4.
- **Phase 5 (Docker nginx proxy):** The dev proxy config (`proxy.conf.json`) and the Docker nginx proxy config (`proxy_pass`) are different files serving the same purpose in different environments. Plan to implement and test them separately to avoid confusion.

Phases with standard well-documented patterns (lower research risk):
- **Phase 1 (data layer):** TypeORM entity setup and SQLite DataSource config are thoroughly documented with verified examples in STACK.md.
- **Phase 2 (API layer):** Express 5 route + middleware + Zod validation pattern is canonical and stable. Swagger JSDoc annotations are the only non-trivial element.
- **Phase 4 (views):** Angular Material component integration is well-documented. Smart/dumb component split is a standard Angular pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core versions verified against official sources (angular.dev, expressjs.com, zod.dev). Companion libraries verified via npm and WebSearch. |
| Features | HIGH | Domain is well-understood (analogous to Kibana log explorer). Assignment requirements are explicit. Competitor analysis confirms the table stakes list. |
| Architecture | HIGH | Stack is fully determined by assignment. NgRx ComponentStore patterns verified via Context7 (official NgRx docs). TypeORM QueryBuilder patterns verified via official TypeORM docs. |
| Pitfalls | HIGH | Critical pitfalls (catchError placement, synchronize:true, findBy undefined) verified with official docs and Context7. RxJS operator selection verified with ncjamieson.com and Angular University blog (established sources). |

**Overall confidence:** HIGH

### Gaps to Address

- **NgRx version alignment:** @ngrx/component-store v19.x confirmed for Angular 19, but npm lists v21.0.1 as latest. Version alignment pattern (NgRx major = Angular major) is the authoritative rule — install `@ngrx/component-store@^19.0.0` explicitly, do not use `latest` tag.
- **swagger-ui-express Express 5 compatibility:** v5.0.1 confirmed as latest; compatibility with Express 5 noted but not deeply tested in the research. Validate by running the Swagger UI at `/api-docs` in Phase 2 before proceeding.
- **Critical vehicles time window:** The `GET /api/aggregations/critical-vehicles` query must use the current runtime timestamp (not seed data timestamps) as the 24-hour reference point. This requires a `Date.now()` or `new Date()` call in the AggregationsService, not a hardcoded date — verify this during Phase 2 implementation.

## Sources

### Primary (HIGH confidence)
- Context7 `/ngrx/platform` — ComponentStore effects, tapResponse, debounced selectors, updater patterns
- Context7 `/typeorm/typeorm` — DataSource, SQLite config, QueryBuilder, getManyAndCount patterns
- `angular.dev/reference/versions` — Angular 19.2 version compatibility matrix (TypeScript, RxJS, Node ranges)
- `expressjs.com/2025/03/31/v5-1-latest-release.html` — Express 5.1.x confirmed as npm `latest`
- `zod.dev/v4` — Zod v4 release notes, performance improvements, import path (`zod/v4`)
- `ngrx.io/guide/component-store/effect` — tapResponse operator, effect lifecycle, error handling

### Secondary (MEDIUM confidence)
- `blog.angular.dev/angular-19-2-is-now-available-673ec70aea12` — Angular 19.2 February 2026 release confirmation
- `betterstack.com/community/guides/scaling-nodejs/tsx-vs-ts-node/` — tsx as 2025 community consensus for TypeScript Express development
- `ncjamieson.com/avoiding-switchmap-related-bugs/` — switchMap vs mergeMap vs exhaustMap operator selection rationale
- `blog.angular-university.io/rxjs-error-handling/` — inner vs outer catchError placement correctness

### Tertiary (referenced, not independently verified)
- TypeORM npm registry for 0.3.28 version — MEDIUM confidence (npm 403 prevented direct registry fetch; version confirmed via WebSearch cross-reference)
- `@ngrx/component-store` npm latest tag (v21.0.1) vs Angular 19 compatibility — version alignment pattern used; install with explicit `^19.0.0` to be safe

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
