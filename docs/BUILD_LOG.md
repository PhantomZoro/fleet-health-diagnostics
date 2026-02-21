# Build Log

Chronological record of what was built, why, and how. Written for interview preparation — each phase entry covers the talking points BMW interviewers will likely probe.

---

## Phase 1: Backend Data Layer

**Status:** Complete (4/4 plans complete)

### What Was Built & Why

**Plan 01-01 — Project Scaffolding & Entity Setup**

Established the backend monorepo foundation: Express 5 server with TypeScript strict mode, TypeORM DataSource connected to SQLite via better-sqlite3, and the DiagnosticEvent entity with indexed columns ready for data insertion.

The scaffold is intentionally minimal — no routes yet, just the foundation that subsequent plans (parser, seeder, endpoints) build on top of.

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| NodeNext module resolution | Required for ESM compatibility with TypeORM entity imports (.js extensions) | CommonJS — would lose ESM benefits |
| better-sqlite3 driver | Synchronous SQLite driver, better TypeORM support than the standard sqlite3 | sqlite3 (async, more friction with TypeORM) |
| synchronize:true in DataSource | Dev convenience — auto-creates tables on startup without migrations | Manual migrations — over-engineered for dev/demo |
| tsx over ts-node-dev | esbuild-based, zero ESM/CJS friction, faster startup | ts-node-dev — slower, known ESM issues |
| Four indexed columns | timestamp, vehicleId, level, code all filterable — indexes prevent full table scans | No indexes — unacceptable at 500+ rows |

### Tricky Parts & Solutions

**TypeORM minimatch vulnerability in transitive deps:** TypeORM 0.3.x depends on glob@3-10 which depends on minimatch <10.2.1 (ReDoS vulnerability). The `npm audit fix --force` fix would downgrade to typeorm@0.0.1 (breaking change). Accepted the risk — the vulnerability is in CLI glob matching, not runtime query execution. Not exploitable in our use case.

**NodeNext + .js import extensions:** With `"moduleResolution": "NodeNext"`, TypeScript requires `.js` extensions on relative imports even for `.ts` files. Entity import in database.ts uses `'../entities/diagnostic-event.entity.js'` — this is correct for NodeNext.

**reflect-metadata must be first import:** TypeORM decorators require `reflect-metadata` to be imported before any decorated class. Placed at top of `index.ts` as the very first import.

### Patterns Demonstrated

- **Layered directory structure:** `routes/` → `services/` → `entities/` directories created from the start, establishing the architecture pattern
- **TypeORM column typing without any:** All entity columns use explicit types (`'datetime'`, `'varchar'`, `'text'`) — no `any` types anywhere per strict mode requirement
- **Non-null assertion on entity fields:** TypeORM initializes decorated fields — using `!` assertion is idiomatic and avoids false TypeScript errors
- **Index decorator on all filterable fields:** Each queryable dimension (timestamp, vehicleId, level, code) gets `@Index()` — database-first performance thinking

**Plan 01-02 — Log Parser, Seed Data, Seed Runner & Health Endpoint**

Built the complete data pipeline: a regex-based log parser that extracts structured fields from log lines, a 500-event seed file with realistic OBD-II diagnostic codes across 20 BMW vehicles, a startup seeder with duplicate protection, and a health check endpoint to verify the database is populated.

This completes Phase 1 — the server now starts, initializes the database, parses and seeds realistic diagnostic data, and serves a health endpoint confirming the event count.

### Key Decisions (Plan 01-02)
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| Structured log format with bracketed fields | Clean regex extraction, each field delimited — realistic yet parseable | CSV/JSON — less realistic for diagnostic logs |
| parseLogLine returns null for bad lines | Graceful degradation — malformed lines skip with warning, parser never throws | Throw on bad lines — too brittle for real log data |
| Count guard in seeder (not upsert) | Simpler than unique constraints for seed-only scenario — check count, skip if > 0 | Upsert with unique key — unnecessary complexity |
| Chunk insert (100 per batch) | SQLite max 999 variables — 100 entities × 6 columns = 600 per batch, safe margin | Single insert — would hit variable limit at 167+ entities |
| Events unsorted in seed.log | Realistic — logs arrive out of order in production systems | Sorted by timestamp — would be unrealistic |

### Tricky Parts & Solutions (Plan 01-02)

**No issues encountered.** The plan was well-specified and executed cleanly. The regex pattern matched all 500 seed lines with zero parse failures.

### Patterns Demonstrated (Plan 01-02)

- **Router-per-domain:** Each route group (health, future events, future aggregations) exports its own Express Router, mounted in index.ts — keeps routing modular
- **Functional + OO parser API:** `parseLogLine()` and `parseLogFile()` as pure functions, plus `LogParser` class wrapper — consumer chooses style
- **Seed idempotency via count guard:** `repo.count() > 0` check before seeding — simple, effective, no schema changes needed
- **Async bootstrap sequence:** DataSource.initialize() → seedDatabase() → express.listen() — ordered startup ensures DB is ready before accepting requests

---

## Phase 2: Backend API Layer

**Status:** Complete (2/2 plans)

### What Was Built & Why

**Plan 02-01 — Events Query Endpoint + Validation + Error Handling**

Built the primary data API: `GET /api/events` with five combinable filters (vehicleId, code, level, from, to) and pagination. Established the validation infrastructure with a reusable Zod middleware and global error handling (400/404/500 all return structured JSON).

**Plan 02-02 — Aggregation Endpoints + Swagger Documentation**

Built three aggregation endpoints for the frontend dashboard: errors-per-vehicle (grouped counts by severity), top error codes (top 10 by frequency), and critical vehicles (3+ ERRORs in a 24h window). Added Swagger UI at `/api-docs` with full OpenAPI documentation generated from JSDoc annotations.

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| TypeORM QueryBuilder over repository.findBy | `findBy({ field: undefined })` silently returns ALL rows — QueryBuilder with explicit undefined guards is safe | findBy — dangerous silent behavior |
| res.locals.validated pattern | Zod middleware parses/coerces query params, stores typed result — route handlers get clean data | Mutating req.query — Express types fight you |
| DB-relative time for critical vehicles | Uses MAX(timestamp) - 24h, not system time — seed data has fixed timestamps | `new Date()` — would return zero results |
| getRawMany + Number() for aggregations | TypeORM raw queries return strings for SUM/COUNT — explicit casting ensures typed output | getRawMany without casting — runtime type mismatch |
| GROUP BY code AND level for top-codes | Different severity levels may share the same OBD-II code — grouping by both gives accurate per-level counts | GROUP BY code only — loses severity context |
| swagger-jsdoc with JSDoc annotations | Documentation lives next to code, auto-generates spec — single source of truth | Separate OpenAPI YAML file — drifts from code |

### Tricky Parts & Solutions

**Express 5 + Zod validation middleware:** Express 5 handles async errors natively but the validation middleware needed careful typing. Used `RequestHandler` from express and stored parsed data on `res.locals.validated` to avoid fighting with `req.query` types.

**Aggregation number casting:** TypeORM's `getRawMany()` returns all values as strings from SQLite. Without explicit `Number()` casting, the response would contain `"5"` instead of `5`. Each raw result is mapped through a typed conversion.

### Patterns Demonstrated

- **Layered architecture enforced:** routes → services → TypeORM entities. Routes never touch the database directly. Services never import Express types.
- **Reusable validation middleware:** `validateQuery(schema)` is generic — pass any Zod schema, get validated typed output. Used by both events and aggregation routes.
- **Dynamic WHERE with undefined guards:** Every filter param gets an explicit `!== undefined` check before adding to QueryBuilder — prevents the TypeORM "returns all rows" pitfall.
- **Conditional SQL aggregation:** `SUM(CASE WHEN level = 'X' THEN 1 ELSE 0 END)` for per-level counts in a single query — avoids N+1 queries per vehicle.
- **OpenAPI co-located with routes:** `@openapi` JSDoc on each route handler — documentation is always in sync with implementation.

---

## Phase 3: Frontend Foundation

**Status:** In progress (3/4 plans complete)

### What Was Built & Why

**Plan 03-02 — Shared Models + API Service**

Created the typed contract layer between Angular frontend and Express backend: TypeScript interfaces mirroring the backend API response shapes and an `HttpClient`-based API service with methods for all 4 endpoints.

Five model files in `frontend/src/app/core/models/`: `DiagnosticEvent` (with `DiagnosticLevel` type), `EventFilters`, `PaginatedResponse<T>`, and three aggregation interfaces (`ErrorsPerVehicle`, `TopCode`, `CriticalVehicle`). A barrel `index.ts` re-exports all models from a single import path.

The `DiagnosticsApiService` wraps `HttpClient` with four typed methods. Query params are built dynamically using `HttpParams` — undefined and empty-string values are skipped using truthy checks, which matches the backend Zod validation that rejects empty strings.

### Key Decisions (Plan 03-02)
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| Frontend interfaces separate from backend types | Monorepo but separate packages — no code sharing. Frontend timestamp is `string` (JSON serialization), backend entity uses `Date` | Shared types package — unnecessary coupling, different serialization shapes |
| Truthy checks for HttpParams (`if (filters.vehicleId)`) | Skips both `undefined` AND empty strings — aligns with backend Zod validation which rejects empty strings | `!== undefined` check — would send `?vehicleId=` to backend, causing Zod validation failure |
| `inject()` function over constructor injection | Angular 19 preferred pattern for standalone components and services. Cleaner, works without constructor | Constructor injection — verbose, extra boilerplate |
| `providedIn: 'root'` on service | Tree-shakeable singleton — if nothing imports the service in production, it's excluded from bundle | Feature-level providers — unnecessary scope restriction for a shared API service |
| Base URL `/api` | Angular dev proxy rewrites `/api/*` → `http://localhost:3000/api/*`. No hardcoded port or host — same code works in prod behind nginx | Hardcoded `http://localhost:3000` — breaks in Docker/production |

### Tricky Parts & Solutions (Plan 03-02)

**No issues encountered.** The plan was well-specified with exact interface shapes. The backend types in `backend/src/types/index.ts` provided the reference, and the only adaptation needed was `timestamp: string` (frontend) vs `Date` (backend entity).

### Patterns Demonstrated (Plan 03-02)

- **Typed HTTP contract:** All 4 service methods use generic `Observable<T>` return types. No `any` anywhere — TypeScript will catch shape mismatches at compile time.
- **Dynamic HttpParams pattern:** `new HttpParams().set(...)` then conditional `.set()` only for truthy values — prevents `?field=undefined` query strings.
- **Barrel export pattern:** `core/models/index.ts` re-exports all interfaces — consumers use `import { DiagnosticEvent } from '../models'` not `'../models/diagnostic-event.model'`.
- **Angular 19 inject() idiom:** `private readonly http = inject(HttpClient)` — function-based injection, no constructor needed.

---

**Plan 03-03 — DiagnosticsStore: NgRx ComponentStore with Full RxJS Pattern Demonstration**

Built the core state management layer — the primary demonstration of senior RxJS competency in this assignment. `DiagnosticsStore` extends `ComponentStore<DiagnosticsState>` and implements all 5 STATE requirements.

Two files: `diagnostics-state.model.ts` (state interfaces + initial value) and `diagnostics.store.ts` (store class with updaters, selectors, and effects).

### Key Decisions (Plan 03-03)
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| `catchError` inside `switchMap` inner pipe (not `tapResponse`) | `tapResponse` was removed from `@ngrx/component-store` v19 and is now in the separately installed `@ngrx/operators`. `catchError` inside the inner pipe returns `EMPTY`, keeping the outer stream alive — identical behavior to `tapResponse` | Import `@ngrx/operators` — adds a dependency for a single utility |
| `catchError` returns `EMPTY` | `EMPTY` completes the inner observable without error — outer `combineLatest`/`select` stream stays alive and will re-emit on next filter change | `of(null)` — would emit a value we don't need to handle |
| `combineLatest([filters$, page$, limit$])` for event loading | All three dimensions must be current for a valid API call. Either changing triggers a re-fetch with the latest state of all three | `withLatestFrom(page$, limit$)` — only fires when filters change, ignores page-only changes |
| Effects wired in constructor (`this.loadEventsEffect()`) | Ensures effects start when store is provided. Called after `super(initialState)` — state is initialized before subscriptions begin | Using `@ngrx/component-store` `effect()` pattern — requires different calling convention |
| `@Injectable()` without `providedIn` | ComponentStore pattern — each feature component that needs it declares it in its own `providers` array. Gives each route its own store instance with isolated state | `providedIn: 'root'` — singleton would share state across routes, breaking isolation |
| `takeUntilDestroyed(this.destroyRef)` on all effects | Automatic unsubscription when store is destroyed (component unmounts). No manual `ngOnDestroy` or `Subject` + `takeUntil` required | `takeUntil(this.destroy$)` + `ngOnDestroy` — 4 extra lines per effect, easy to forget |

### Tricky Parts & Solutions (Plan 03-03)

**`tapResponse` not in `@ngrx/component-store` v19:** The plan specified `tapResponse` from `@ngrx/component-store`. This export was removed in newer NgRx versions (moved to `@ngrx/operators`). Checked `node_modules/@ngrx/component-store/public_api.d.ts` — no `tapResponse` export. The solution is `catchError` inside the `switchMap` inner pipe returning `EMPTY` — this is exactly what `tapResponse` does internally. The outer stream remains alive. Documented as a Rule 1 auto-fix (library API divergence from plan spec).

### RxJS Patterns — Deep Dive (Plan 03-03)

All 5 STATE requirements are satisfied and demonstrable:

#### STATE-01: Observable state slices
All 7 state dimensions (`filters$`, `events$`, `total$`, `page$`, `loading$`, `error$`, `aggregations$`) are exposed as `Observable<T>` — components never touch raw state directly.

#### STATE-02: `debounceTime(300)` before API calls
Both `loadEventsEffect` and `loadAggregationsEffect` apply `debounceTime(300)` before `switchMap`. Rapid filter typing fires only one API call after 300ms of inactivity.

#### STATE-03: `switchMap` cancels in-flight requests
`switchMap` in both effects: when filters/page emit while an HTTP request is in-flight, RxJS cancels the previous `HttpClient` request (unsubscribes from its `Observable`) and starts a new one with the latest values. No stale results, no race conditions.

#### STATE-04: `combineLatest` merges filter dimensions
`combineLatest([filters$, page$, limit$])` in `loadEventsEffect`: three independent state slices merge into a single stream. Any of the three changing triggers a re-fetch with all three current values.

#### STATE-05: `distinctUntilChanged` + `shareReplay(1)` on all selectors
Every selector has both operators chained. `distinctUntilChanged` suppresses emissions when the slice hasn't changed (reference equality). `shareReplay(1)` gives late-subscribing components the current value immediately.

### Patterns Demonstrated (Plan 03-03)

- **ComponentStore pattern:** Extends `ComponentStore<T>` with explicit state interface — type-safe `patchState`, `updater`, `select`
- **Updater reset pattern:** `setFilters` resets `page: 1` — prevents out-of-range pagination on filter change
- **Inner-pipe error isolation:** `catchError` scoped to the inner `switchMap` observable returns `EMPTY` — errors surface to state without killing the effect
- **Effect auto-wiring:** Both effects called in constructor — no external trigger needed, effects start on store initialization
- **DestroyRef injection:** `inject(DestroyRef)` passed to `takeUntilDestroyed()` — works in any injection context, not just in component lifecycle

**Plan 03-01 — Angular Project Scaffold, App Shell, and Global Styles**

Bootstrapped the entire Angular 19 frontend: scaffolded a standalone-component project with SCSS and routing via Angular CLI 19, configured an API proxy so `/api/*` requests forward to `localhost:3000`, installed `@ngrx/component-store@^19.0.0`, and built the app shell — a fixed sidebar nav with lazy-loaded route stubs for Dashboard and Events.

Global CSS custom properties establish the BMW-inspired design token system (`--primary: #1C69D4`, surface colors, text colors, border colors) that all subsequent plan components consume via `var()` references. The sidebar collapses to a horizontal top bar on mobile via a single media query.

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| `@ngrx/component-store@^19.0.0` explicit version | npm `latest` tag resolves to Angular 21 aligned version (^21.x) which is incompatible with Angular 19 | `@latest` — breaks peer dep resolution |
| `provideAnimationsAsync()` in app.config | Lazy loads animation browser module only when needed — improves initial bundle size | `provideAnimations()` — eager import, heavier initial load |
| Lazy `loadComponent` for routes | Code-splits dashboard and events into separate JS chunks — 388 bytes and 380 bytes respectively | Eager `component:` reference — bundles everything into main |
| CSS custom properties for design tokens | All components share tokens via `var(--primary)` without a dedicated theming library | SCSS variables — can't change at runtime, no browser dev tools inspectability |
| `@angular/animations` manual install | `provideAnimationsAsync()` requires `@angular/animations` but the CLI 19 scaffold doesn't install it automatically | Skip animations — needed for future Material UI patterns |

### Tricky Parts & Solutions

**Missing `@angular/animations` package:** The Angular CLI 19 scaffold does not include `@angular/animations` by default, but `provideAnimationsAsync()` in `app.config.ts` dynamically imports `@angular/animations/browser` at runtime. The build failed with "Could not resolve @angular/animations/browser" until explicitly installing `@angular/animations@^19.0.0`. Fixed as a Rule 3 deviation (blocking build issue).

**Angular CLI 19 project in existing directory:** The existing empty `frontend/` directory was already tracked by git. Running `ng new frontend --directory=frontend` scaffolded into the correct location without conflict.

### RxJS Patterns — Deep Dive

RxJS patterns are implemented in Plan 03-03 (DiagnosticsStore). See the pre-written analysis below for full interview talking points.

### RxJS Patterns — Deep Dive

This is the section BMW will grill on. Each pattern with the exact reasoning:

#### `switchMap` for API calls
- **Where:** ComponentStore effect that loads events on filter change
- **Why switchMap, not mergeMap:** When filters change rapidly, we want to cancel the previous in-flight HTTP request and only keep the latest one. `mergeMap` would let all requests complete, potentially showing stale results if an older request resolves after a newer one.
- **Why not concatMap:** We don't need guaranteed ordering — we only care about the latest filter state. `concatMap` would queue requests unnecessarily.

#### `debounceTime(300)` on filter changes
- **Where:** Before the `switchMap` in the events loading effect
- **Why 300ms:** Prevents firing an API call on every keystroke in the vehicle ID input. Waits until the user pauses typing. 300ms is the sweet spot — fast enough to feel responsive, slow enough to avoid unnecessary requests.
- **Why not throttleTime:** `throttleTime` emits the first value immediately, then ignores for the duration. We want the opposite — wait for the user to stop, then emit the final value.

#### `combineLatest` for merging filter dimensions
- **Where:** Combining `filters$` and `page$` streams into a single API call trigger
- **Why combineLatest:** We need the latest value from BOTH streams to construct the API call. When either changes, we want to re-fetch with the current state of both.
- **Why not withLatestFrom:** `withLatestFrom` only emits when the source emits, treating the other as passive. We want either filter OR page changes to trigger a fetch.

#### `tapResponse` for error handling (NOT `catchError`)
- **Where:** Inside the `switchMap` pipe in ComponentStore effects
- **Why not catchError on outer stream:** This is a critical gotcha. If you put `catchError` on the outer effect observable, it completes the stream on first error — all future filter changes are silently ignored. The effect is permanently dead.
- **How tapResponse works:** It's an NgRx helper that wraps the inner observable with error handling. Errors are caught and handled without killing the outer effect stream.

#### `takeUntilDestroyed()` for cleanup
- **Where:** Any component that subscribes to observables in `constructor` or `ngOnInit`
- **Why:** Automatically unsubscribes when the component is destroyed. Replaces the old `ngOnDestroy` + `Subject` + `takeUntil` pattern. Cleaner, less boilerplate, impossible to forget.

#### `distinctUntilChanged` + `shareReplay(1)` on selectors
- **Where:** All ComponentStore selectors (`events$`, `filters$`, `loading$`, etc.)
- **Why distinctUntilChanged:** Prevents re-renders when the selected value hasn't actually changed. Without it, every state update would trigger all subscribers even if their slice didn't change.
- **Why shareReplay(1):** Ensures late subscribers get the current value immediately. Without it, a component subscribing after the initial emission would see nothing until the next state change.

---

## Phase 4: Frontend Views

**Status:** Not started

### What Was Built & Why
_To be filled after phase completion_

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| | | |

### Tricky Parts & Solutions
_Problems encountered during implementation and how they were resolved_

### Component Architecture
- **Smart vs Dumb split:** Smart components (EventsComponent, DashboardComponent) inject the store. Dumb components (FilterPanel, SeverityBadge, Pagination) use only @Input/@Output.
- **Why OnPush everywhere:** Reduces change detection cycles. Angular only checks the component when its inputs change or an event fires within it. Critical for performance with large event tables.
- **Why standalone components:** Angular 19 default. No NgModules needed. Each component declares its own imports. Simpler dependency graph, better tree-shaking.

---

## Phase 5: Integration & Delivery

**Status:** Not started

### What Was Built & Why
_To be filled after phase completion_

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| | | |

### Tricky Parts & Solutions
_Problems encountered during implementation and how they were resolved_

### Docker Architecture
_Multi-stage build strategy, nginx configuration, container networking_

---

## Interview Quick Reference

### "Why did you choose X over Y?"

| Choice | Reasoning |
|--------|-----------|
| Express over NestJS | Shows raw architecture decisions — layered service pattern is MY choice, not framework magic. NestJS decorators hide too much for a senior assessment. |
| ComponentStore over NgRx Store | Right-sized for single-feature app. Full Store (actions/reducers/effects/selectors) is over-engineered when you have one data domain. ComponentStore still demonstrates observable state patterns. |
| SQLite + TypeORM over lowdb | Real SQL with indexes, QueryBuilder, proper ORM patterns. lowdb is just a JSON file — doesn't demonstrate database thinking. |
| Zod over class-validator | TypeScript-native, works at runtime AND compile time. Clean error messages for API responses. class-validator requires decorators and reflect-metadata. |
| tsx over ts-node-dev | esbuild-based, zero ESM/CJS friction. ts-node-dev uses TypeScript compiler which is slower and has module resolution issues. |
| Seed via log parser | Proves the parser works on real data format. Synthetic `repository.save()` calls don't demonstrate anything. The parser IS a feature. |

### "Walk me through the data flow"

1. User types in filter panel -> `@Output` emits `EventFilters`
2. Smart component calls `store.setFilters(filters)` -> updater writes to state
3. `filters$` selector emits (distinctUntilChanged skips if same)
4. `combineLatest([filters$, page$])` fires -> `debounceTime(300)` waits
5. `switchMap` cancels any in-flight request, fires new `api.getEvents()`
6. `tap` handles success (update state), `catchError` inside `switchMap` inner pipe handles error (set error state, return `EMPTY`)
7. `events$` selector emits -> smart component template re-renders via `async` pipe

### "How do you handle errors?"

- **Backend:** Global Express error handler returns `{ error, statusCode, details? }`. Zod validation errors include field-level details. Express 5 catches async errors natively — no wrapper needed.
- **Frontend:** HTTP interceptor catches errors -> pushes to notification service -> toast auto-dismisses after 5s. ComponentStore effects use `tapResponse` so the effect stream survives errors.
- **Critical pitfall avoided:** Never `catchError` on outer effect stream — it kills the stream permanently.

---
*Last updated: 2026-02-21*
