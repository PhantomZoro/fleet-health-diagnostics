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

**Status:** Complete (3 plans — 03-04 scope was folded into 03-01)

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

**Status:** Complete (4/4 plans complete)

### What Was Built & Why

**Plan 04-01 — Shared UI Components (FilterPanel, SeverityBadge, Pagination, LoadingSpinner)**

Built four presentational (dumb) components that are reused across the Events and Dashboard views. These components establish the smart/dumb component split pattern that is central to the BMW assignment demonstration.

- **FilterPanelComponent:** A standalone fieldset-based filter form with five fields (vehicleId, code, severity, dateFrom, dateTo). Uses FormsModule `ngModel` for two-way binding. Emits `EventFilters` on Apply and `void` on Reset via `@Output()`. Initializes from `@Input() filters` via `ngOnChanges` — supports pre-populating filters when navigating from dashboard.
- **SeverityBadgeComponent:** Inline-template component that renders a colored `<span>` badge. Three CSS classes map to severity levels: `badge--error` (red #D32F2F), `badge--warn` (orange #F57C00), `badge--info` (blue #1976D2) using RGBA backgrounds for subtle tinting.
- **PaginationComponent:** Navigation component with Prev/Next buttons. Computes `totalPages` from `Math.ceil(total/limit)`, exposes `hasPrev`/`hasNext` getters, and disables buttons at boundaries via `[disabled]`. Emits page number via `@Output() pageChange`.
- **LoadingSpinnerComponent:** CSS-only animated overlay with `position: absolute; inset: 0` positioning. `border-top-color: var(--primary)` on a spinning 36px circle creates the animation via `@keyframes spin 0.8s linear infinite`.

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| `FormsModule` + `ngModel` for FilterPanel | Simple two-way binding for filter fields — no complex form validation needed. No reactive forms overhead. | `ReactiveFormsModule` with `FormGroup` — overkill for five independent string/date fields |
| `ngOnChanges` for filter initialization | Allows parent to pre-populate filter values reactively — e.g., clicking a vehicle on dashboard navigates to Events with vehicleId pre-filled | `ngOnInit` only — would miss updates when parent changes `@Input filters` after init |
| Inline template for SeverityBadge and LoadingSpinner | Single-element templates — no benefit to a separate .html file. Reduces file count, easier to read | External .html files — unnecessary for single-line templates |
| `[class]` binding with `badge--` prefix | Dynamic class name from level input, lowercase — `'badge badge--' + level.toLowerCase()` merges base and modifier classes | `[ngClass]` with object — more verbose for a single dynamic class |
| OnPush for all four components | Dumb components only re-render when inputs change — no zone-triggered re-renders. Critical for event table rows using SeverityBadge | Default change detection — unnecessary re-renders on every zone event |

### Tricky Parts & Solutions

**No issues encountered.** All four components compiled cleanly on first build attempt. The CSS custom property design token system established in Phase 3 (Plan 03-01) made styling straightforward — components consume `var(--primary)`, `var(--border-light)`, `var(--radius)` etc. without needing to redeclare values.

### Component Architecture
- **Smart vs Dumb split:** Smart components (EventsComponent, DashboardComponent) inject the store. Dumb components (FilterPanel, SeverityBadge, Pagination, LoadingSpinner) use only @Input/@Output.
- **Why OnPush everywhere:** Reduces change detection cycles. Angular only checks the component when its inputs change or an event fires within it. Critical for performance with large event tables.
- **Why standalone components:** Angular 19 default. No NgModules needed. Each component declares its own imports. Simpler dependency graph, better tree-shaking.
- **Why semantic HTML in FilterPanel:** `<fieldset>` + `<legend>` is the correct HTML for a group of related form controls. `<nav>` with `role="navigation"` in PaginationComponent provides the correct ARIA landmark. All inputs have `aria-label` attributes for screen reader accessibility.

---

**Plan 04-02 — Events View (Smart Container)**

Built the primary data exploration view — `EventsComponent` as a smart container at `/events` that connects all shared dumb components to `DiagnosticsStore`. This is the central demonstration of the smart/dumb split and RxJS-driven state flow.

EventsComponent is the single smart component responsible for wiring state to presentation. It provides its own `DiagnosticsStore` instance via `providers: [DiagnosticsStore]`, exposes all store observables to the template via `async` pipe, and delegates user actions (filter apply, filter reset, page change) back to the store via three methods. The dumb components (FilterPanel, SeverityBadge, Pagination, LoadingSpinner) receive data through `@Input` bindings and emit events via `@Output` — they have zero knowledge of the store.

### Key Decisions (Plan 04-02)
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| `AsyncPipe` imported explicitly | Standalone components need explicit imports for every pipe used in the template — `async` is not auto-available | `CommonModule` import — brings in too many directives unnecessarily |
| `providers: [DiagnosticsStore]` at component level | Each feature route gets its own isolated store instance with its own state. Store is destroyed when component unmounts — clean lifecycle | `providedIn: 'root'` singleton — shares state across routes, breaking isolation |
| `export type` on all model barrel re-exports | `isolatedModules: true` in tsconfig requires `export type` for interfaces (types, not values). All models in `core/models/` are TypeScript interfaces | `export` without `type` — causes TS1205 error with isolatedModules |
| Angular 19 `@if`/`@for` template syntax | New control flow syntax (not `*ngIf`/`*ngFor`). Built-in, no import required. `@if (x; as y)` alias pattern reduces redundant async pipe subscriptions | `*ngIf`/`*ngFor` with NgIf/NgFor imports — deprecated, more verbose |
| Conditional pagination (`@if (total$ | async); as total`) | Only renders PaginationComponent when there is data (`total > 0` implicit since 0 is falsy) — avoids empty Prev/Next controls on initial load | Always-visible pagination — shows disabled controls when no data, confusing UX |

### Tricky Parts & Solutions (Plan 04-02)

**Missing `AsyncPipe` import caused NG8004 build error:** The plan specified `imports: [CommonModule, ...]` but the implementation used `AsyncPipe` and `DatePipe` individually (tree-shakeable approach). The `async` pipe is not available without either `CommonModule` or explicit `AsyncPipe` import. Fixed by adding `AsyncPipe` to the imports array (Rule 3 auto-fix).

**Pre-existing `isolatedModules` type re-export error:** `core/models/index.ts` used value-syntax re-exports (`export { X }`) for TypeScript interfaces. With `isolatedModules: true` in tsconfig, this causes TS1205. All re-exports were updated to `export type { X }`. This was a build-blocking pre-existing issue triggered when the build ran against the full codebase for the first time in this phase (Rule 3 auto-fix).

### RxJS Patterns — Events View (Plan 04-02)

The Events view is the consumer end of the full RxJS data flow. No new RxJS operators are introduced here — instead, it demonstrates how the patterns from Plan 03-03 are consumed by the view layer:

- **`async` pipe:** All observables are subscribed in the template via Angular's built-in `async` pipe. Each `| async` subscription is automatically cleaned up when the component is destroyed — no `takeUntilDestroyed()` needed in the component class because there are no manual subscriptions.
- **`@if (obs$ | async); as value`:** Angular 19 template syntax creates a local alias without subscribing twice. Equivalent to `*ngIf="obs$ | async as value"` but with cleaner syntax.
- **Zero manual subscriptions:** The component class has no `ngOnInit`, no `subscribe()` calls, no `Subject`, no `BehaviorSubject`. All state flows from store → template via `async` pipe. This is the Angular 19 idiomatic pattern.
- **`??` null-coalescing in template:** `(filters$ | async) ?? {}` and `(page$ | async) ?? 1` provide safe defaults for the `@Input` bindings. The `async` pipe emits `null` on initial subscription before the store emits — the null-coalescing operator prevents passing `null` to child component inputs.

### Patterns Demonstrated (Plan 04-02)

- **Smart/dumb split in full effect:** EventsComponent (smart) coordinates state and actions; FilterPanel/SeverityBadge/Pagination/LoadingSpinner (dumb) are pure presentation components. The template binds @Input and handles @Output — no logic in between.
- **Component-level store provision:** `providers: [DiagnosticsStore]` in the component decorator, not in the route config or root. This gives the route its own store lifecycle tied to component mount/unmount.
- **Semantic HTML table:** `<section>` contains `<table>` with `<thead>/<tbody>/<tr>/<th>/<td>`. Code values use `<code>` element for monospace rendering. Empty state uses `role="status"` for accessibility.
- **Angular 19 `@for` with `track`:** `@for (event of events; track event.id)` uses the entity's `id` as the track key. Angular uses this for efficient DOM reconciliation — only changed rows are re-rendered.

---

**Plan 04-03 — Dashboard View (Smart Container with Aggregation Visualization)**

Built the operational overview page at `/dashboard` — a smart `DashboardComponent` that consumes all three aggregation endpoints from `DiagnosticsStore` and presents data in four visual sections. This is the second smart component demonstrating the smart/dumb split pattern alongside EventsComponent.

The dashboard is the primary visualization surface: summary cards for at-a-glance fleet health metrics, a proportional horizontal bar chart for errors-per-vehicle (stacked error/warn/info segments), a top error codes list with severity badges, and a critical vehicles section where clicking a vehicle navigates to the Events view with the vehicleId filter pre-populated via query params.

### Key Decisions (Plan 04-03)
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| Cross-view navigation via queryParams | Each route has its own isolated `DiagnosticsStore` instance (component-level providers). Cannot share state directly between Dashboard and Events stores. Query params are the correct transport for cross-route communication in Angular. | Shared singleton store — would break the component-level provider isolation pattern |
| `ActivatedRoute.queryParams.pipe(take(1))` in EventsComponent constructor | Reads query params exactly once on component init — applies vehicleId filter if navigated from Dashboard. `take(1)` prevents memory leak from the never-completing queryParams observable | `ngOnInit` with subscribe — equivalent but less idiomatic for Angular 19 inject() pattern |
| `map` on `aggregations$` for derived summary values | Derives `totalVehicles$`, `criticalCount$`, `mostCommonCode$` without adding state to the store — keeps the store's state minimal | Adding derived state to store — unnecessary when it can be derived from existing state in the component |
| Proportional bar widths use first vehicle's `total` as max | First item in `errorsPerVehicle` array has the highest total (backend returns ordered by total DESC) — gives correct proportional scaling without needing a separate max calculation | `Math.max(...agg.errorsPerVehicle.map(v => v.total))` — works but unnecessarily complex when backend ordering guarantees first item is max |
| `getBarWidth` returns `'0%'` for zero maxTotal | Prevents division by zero on empty data — safe fallback | `|| 1` denominator — masks the empty state |

### Tricky Parts & Solutions (Plan 04-03)

**No blocking issues encountered.** The build completed on the first attempt with zero errors. One NG8107 warning was emitted for `agg.topCodes[0]?.code` — Angular's template type checker considers `topCodes[0]` non-nullable inside the `@if (agg)` block (after the `@if` guard TypeScript knows `agg` exists but can't narrow the array index access). This is a cosmetic warning, not an error, and does not affect runtime behavior.

**EventsComponent query param reading** was added as a small extension described in the plan: injecting `ActivatedRoute` and reading `vehicleId` in the constructor. No architectural changes were needed — the pattern fits naturally into the existing component structure.

### RxJS Patterns — Dashboard View (Plan 04-03)

The dashboard introduces `map` as a derived-observable pattern on top of the store's `aggregations$` selector:

- **`map` for derived observables:** Three derived observables (`totalVehicles$`, `criticalCount$`, `mostCommonCode$`) are created in the component class using `aggregations$.pipe(map(...))`. This avoids adding derived state to the store and keeps the store's state shape minimal. The `async` pipe in the template subscribes once per derived observable.
- **Multiple `async` subscriptions from a single source:** The template uses `(aggregations$ | async)` once via the `@if (... as agg)` pattern — Angular resolves the single observable and provides the `agg` alias throughout the block. No redundant subscriptions for the primary data.
- **`total$` subscription in summary card:** `(total$ | async) ?? 0` reads from the events total selector — the events effect runs concurrently with the aggregations effect in the store, so total event count is available without additional API calls.
- **`take(1)` on queryParams:** In EventsComponent, `this.route.queryParams.pipe(take(1))` completes after the first emission — no `takeUntilDestroyed` needed since `take(1)` auto-completes and prevents memory leak.

### Patterns Demonstrated (Plan 04-03)

- **Cross-view navigation with query params:** `router.navigate(['/events'], { queryParams: { vehicleId } })` on critical vehicle click, read back in EventsComponent constructor via `ActivatedRoute.queryParams.pipe(take(1))` — clean one-shot cross-route communication.
- **Proportional bar chart in pure CSS + Angular bindings:** `[style.width]="getBarWidth(...)"` with `flex` layout on `.bar-track` creates a stacked horizontal bar chart without any charting library. Three `div.bar-fill` elements render error/warn/info segments proportionally.
- **Smart/dumb split in dashboard context:** DashboardComponent (smart) injects store and router. FilterPanel, SeverityBadge, LoadingSpinner (dumb) receive data through @Input only — no direct store access.
- **Semantic HTML with ARIA:** `<section class="panel">` for each data group, `<ul>/<li>` for lists, `<button>` (not `<div>`) for clickable critical vehicles, `[attr.aria-label]` on each button describing the navigation target.
- **Empty state patterns:** All three data sections handle the empty list case with `@else { <p class="empty-state">...</p> }` — the UI never shows blank panels.

---

**Plan 04-04 — HTTP Error Handling, Toast Notifications, and Quality Polish**

Added the final layer of production polish to the frontend: an HTTP error interceptor that catches all failed API calls and displays user-friendly toast notifications, plus a full audit of all Phase 4 components for OnPush change detection, semantic HTML, ARIA compliance, and keyboard navigation.

Three new files:
- `NotificationService`: `providedIn: 'root'` singleton managing a `BehaviorSubject<Notification[]>` stream. `show()` adds with `Date.now()` id and schedules `setTimeout(() => this.dismiss(id), 5000)` for auto-removal. `dismiss()` filters by id — immutable array updates ensure OnPush components detect changes.
- `HttpErrorInterceptor`: Functional interceptor (Angular 19 `HttpInterceptorFn`) using `inject(NotificationService)` inside the interceptor function. Status-code switch: 0 (no connection), 5xx (server error), 400 (bad request with message), 404 (not found), default. Always re-throws via `throwError(() => error)` so the store's `catchError` also fires.
- `ToastComponent`: Fixed-position top-right container using `@for` with `track notification.id`. Slide-in CSS animation. `aria-live="polite"` on container, `role="alert"` on each toast, dismiss button with `aria-label`.

### Key Decisions (Plan 04-04)
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| `throwError(() => error)` after interceptor `catchError` | Propagates error to store's inner `catchError` so state can update `error$`. Without re-throw, the store effect never knows the request failed. | Swallow error in interceptor — store would see successful empty response, error state never set |
| `inject()` inside functional interceptor | Angular 19 functional interceptor pattern — no class needed. `inject()` works in any injection context including `HttpInterceptorFn`. | Class-based interceptor with `@Injectable()` and `implements HttpInterceptor` — deprecated pattern |
| `withInterceptors([httpErrorInterceptor])` in `provideHttpClient` | Tree-shakeable, functional interceptor API — registers interceptor at app config level | `HTTP_INTERCEPTORS` token — class-based, more boilerplate |
| `<form (ngSubmit)="onApply()">` wrapping FilterPanel | Enables Enter key in any text input to submit the filter form natively — browser handles key event propagation. Required `name` attributes on all ngModel inputs inside a form. | `(keydown.enter)="onApply()"` on fieldset — less standard, requires manual event handling |
| `Date.now()` as notification id | Unique, monotonically increasing, zero-dependency. Used as both `id` and `timestamp`. | UUID library — unnecessary dependency for a simple notification system |

### Tricky Parts & Solutions (Plan 04-04)

**NG8107 warning in dashboard template (pre-existing):** The `agg.topCodes[0]?.code` in `dashboard.component.html` triggered Angular template type checker warning NG8107 ("optional chain not needed — type doesn't include null/undefined"). Inside an `@if (agg)` block, Angular narrows `agg` but considers `topCodes[0]` non-null after the guard. Fixed by replacing with ternary `agg.topCodes[0] ? agg.topCodes[0].code : 'N/A'` — clearer intent and zero warnings (Rule 1 auto-fix).

**FormsModule `name` attribute requirement:** Wrapping FilterPanel inputs in `<form>` required adding `name` attributes to all `ngModel` inputs. Angular template-driven forms require `name` on each control inside a `<form>` element — without it, Angular cannot register the control in the form's `NgForm` model and throws a runtime error. The `name` attribute was added to all 5 inputs (vehicleId, code, level, dateFrom, dateTo).

### RxJS Patterns — Error Handling (Plan 04-04)

- **`BehaviorSubject` for notification state:** Starts with empty array `[]` — new subscribers immediately get current notifications (important for components mounted after notifications are added). `asObservable()` prevents external code from calling `.next()` directly — encapsulation.
- **Immutable array updates:** `[...this.notificationsSubject.value, notification]` for show, `.filter(n => n.id !== id)` for dismiss — new array references trigger OnPush change detection in `ToastComponent`.
- **`catchError` in HTTP interceptor (outer pipe):** Unlike ComponentStore effects where `catchError` on the outer stream kills it, `HttpInterceptorFn` returns a cold observable per request — each request gets its own pipe. `catchError` here doesn't kill anything permanently.

### Patterns Demonstrated (Plan 04-04)

- **Functional HTTP interceptor:** `HttpInterceptorFn` — the Angular 19 preferred pattern. No class, no `@Injectable()`, just a function. `inject()` works inside the function body.
- **Global notification pattern:** `NotificationService` singleton, `ToastComponent` at app root level (outside router-outlet). Notifications from any component/service/interceptor appear regardless of current route.
- **OnPush with BehaviorSubject:** `ToastComponent` uses `async` pipe on `notifications$` — every `next()` on the subject creates a new array reference, triggering the OnPush check. No manual `ChangeDetectorRef.markForCheck()` needed.
- **Full ARIA compliance audit:** 7 components verified — all interactive elements have `aria-label`, all live regions have `aria-live`, all structural elements use semantic HTML. Tab navigation flows naturally through filter fields to Apply button.

---

## Phase 5: Integration & Delivery

**Status:** Complete (3/3 plans)

### What Was Built & Why

**Plan 05-01 — Docker Containerization**

Created the complete Docker infrastructure for one-command startup: `docker-compose up` builds and runs both backend and frontend containers from a clean clone, without requiring the reviewer to install Node, npm, or Angular CLI.

Four files:
- **backend/Dockerfile:** Multi-stage Node 20 alpine build. Stage 1 compiles TypeScript with `tsc`. Stage 2 installs production-only dependencies (critical for `better-sqlite3` native module — must `npm ci` in the runtime alpine image, NOT copy `node_modules` from build stage). Copies `data/seed.log` for runtime seeding; `fleet.db` is created by TypeORM at startup.
- **frontend/Dockerfile:** Multi-stage build. Stage 1 builds Angular 19 with `ng build --configuration production` (output at `dist/frontend/browser/` per the `application` builder). Stage 2 copies built assets into `nginx:alpine` and applies custom nginx config.
- **frontend/nginx.conf:** Listens on port 4200. SPA fallback via `try_files $uri $uri/ /index.html`. Proxies `/api` and `/api-docs` to `backend:3000` using Docker service name resolution.
- **docker-compose.yml:** Two services (backend, frontend) on a shared `fleet-network` bridge. Named `backend-data` volume persists SQLite database across container restarts. `depends_on` ensures backend starts before frontend. `NODE_ENV=production` disables TypeORM `synchronize`.

Also updated `backend/src/config/database.ts` to make `synchronize` environment-aware: `process.env['NODE_ENV'] !== 'production'` (enabled in dev, disabled in Docker production). Created root `.dockerignore` to exclude `node_modules`, `dist`, `.db`, `.planning`, `.claude`, `.git`.

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| `npm ci --omit=dev` in production stage (not copy from build) | `better-sqlite3` is a native C++ addon compiled during `npm install`. Must be compiled in the same alpine image that runs it — copying `node_modules` from build stage would have wrong native bindings | Copy node_modules from build — native module ABI mismatch |
| Node 20 alpine for both stages | Matches LTS, minimal image size (~180MB vs ~1GB for full node:20) | node:20 (Debian) — 5x larger image |
| nginx:alpine for frontend serving | Static file serving + reverse proxy in a single lightweight image (~40MB) | node:20-alpine running `npx serve` — heavier, no proxy capability |
| Port 4200 for nginx | Matches Angular dev server port for consistency — reviewer sees same port in dev and prod | Port 80 — would conflict with other local services |
| Named volume for backend-data | SQLite database persists across `docker-compose down/up` cycles — no data loss on restart | Bind mount — ties to host filesystem structure |
| `synchronize: process.env['NODE_ENV'] !== 'production'` | Keeps dev convenience (auto-creates tables) while preventing accidental schema changes in production containers | Always false — would require migrations for dev |
| Removed obsolete `version: "3.8"` from docker-compose | Docker Compose V2 warns that `version` attribute is obsolete and ignored | Keep it — cosmetic warning on every compose command |

### Tricky Parts & Solutions

**better-sqlite3 native module strategy:** The critical gotcha with containerizing this backend is `better-sqlite3`. It compiles native C++ code during `npm install` that is ABI-specific to the Node.js version and OS. If you `npm ci` in the build stage (Node 20 alpine) and copy `node_modules` to the production stage, the native `.node` binary is compatible because both stages use the same base image. However, the plan correctly separates concerns: build stage compiles TypeScript only, production stage does its own `npm ci --omit=dev` to get a clean production dependency tree with correctly compiled native modules. This avoids copying devDependencies into production.

**Angular 19 application builder output path:** The `application` builder (not the legacy `browser` builder) outputs to `dist/frontend/browser/` — not `dist/frontend/` directly. The frontend Dockerfile copies from the correct nested path.

### Docker Architecture

```
Host Machine
  |
  +-- docker-compose.yml (orchestrator)
       |
       +-- backend (Node 20 alpine)
       |     Port: 3000
       |     Volume: backend-data -> /app/data (SQLite DB)
       |     ENV: NODE_ENV=production, PORT=3000
       |
       +-- frontend (nginx:alpine)
       |     Port: 4200
       |     /api/* -> proxy_pass http://backend:3000
       |     /api-docs/* -> proxy_pass http://backend:3000
       |     /* -> try_files (SPA fallback)
       |
       +-- fleet-network (bridge)
             Enables container-to-container DNS resolution
```

### Patterns Demonstrated

- **Multi-stage Docker builds:** Separate build and runtime stages reduce final image size — no TypeScript compiler, no devDependencies in production
- **Native module handling:** `npm ci` in runtime stage ensures correct ABI for `better-sqlite3` — a common pitfall in Node.js containerization
- **Nginx reverse proxy:** Single entry point on port 4200 serves both static Angular assets and proxies API requests — no CORS needed in production
- **Environment-aware configuration:** `synchronize` toggle via `NODE_ENV` — same codebase works in dev (auto-create tables) and production (stable schema)
- **Docker Compose service networking:** Named bridge network with DNS resolution via service names (`backend:3000`) — no hardcoded IPs

**Plan 05-02 -- Deliverable Documentation (REQUIREMENTS.md, ARCHITECTURE.md, README.md)**

Created three documentation deliverables that serve as the BMW reviewer's entry points to understanding the project.

Three files:
- **docs/REQUIREMENTS.md:** Business-facing specification with 8 business requirements (BR-01 through BR-08), 6 assumptions with rationale (DB-relative time, SQLite sufficiency, no auth), and 6 out-of-scope items with reasoning (no WebSocket, no auth, no export).
- **docs/ARCHITECTURE.md:** Technical architecture document covering the full stack: backend layered architecture (routes-services-entities), data model with indexes, API endpoint table, Zod validation flow, frontend component tree with smart/dumb split, NgRx ComponentStore data flow diagram, 8-operator RxJS rationale table, 7-item key trade-offs table, and Docker multi-stage build architecture.
- **README.md:** Project entry point enabling clone-to-running-app in under 5 minutes. Docker quick start (one command), manual development setup (two terminals), project structure overview, "What Works" feature list, "What I Would Add" future improvements, and links to the other two docs.

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| Separate REQUIREMENTS.md from ARCHITECTURE.md | Business spec (what) vs technical design (how) -- different audiences. Requirements readable by non-technical stakeholders, architecture by engineers. | Single combined document -- loses audience focus |
| RxJS rationale table with 8 operators | Proactively addresses the "why this operator?" interview question. Each row explains the chosen operator, where it's used, AND why alternatives would be wrong. | Simple operator list -- misses the reasoning that demonstrates seniority |
| "What I Would Add" in README | Shows awareness of production gaps without pretending the demo is production-ready. Demonstrates scope judgment -- knowing what NOT to build for a time-boxed assignment. | Omit it -- leaves reviewer wondering if gaps are intentional |
| DB-relative time assumption documented explicitly | The critical vehicles endpoint uses MAX(timestamp) - 24h, not system time. Without this documented, a reviewer running the app months later might think the feature is broken. | Assume reviewer reads the code -- risky for a timed evaluation |
| All content verified against actual codebase | Every file path, endpoint, operator, and pattern referenced in docs was cross-checked against source files. No fictional features. | Write from plan spec only -- risks documenting planned but unimplemented features |

### Tricky Parts & Solutions

**No issues encountered.** Documentation plans are low-risk when the codebase is stable. The main challenge was ensuring accuracy -- every claim in the docs was verified against the actual source code (entity fields, route paths, store operators, Docker config).

### Patterns Demonstrated

- **Senior-level requirements writing:** Assumptions are not hidden -- they are explicit with rationale. Out-of-scope items include reasoning, not just a list.
- **Architecture documentation as interview prep:** The RxJS rationale table is designed for the "tell me about your RxJS choices" question. Each row is a complete answer.
- **README as user empathy:** Two setup paths (Docker, manual) cover both "I just want to see it" and "I want to develop" reviewers. Under-2-minute scan, under-5-minute setup.

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

**Plan 05-03 -- Final Polish (End-to-End Smoke Test, Code Cleanup, Verification)**

Performed the final quality gate before submission: scanned all source files for debug artifacts, verified both backend and frontend build cleanly, ran end-to-end API smoke tests against all endpoints, validated Docker configuration, and confirmed documentation accuracy.

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| Keep seed runner console.log statements | Legitimate startup information for developer visibility -- not debug artifacts | Remove all console.log -- would lose useful startup feedback |
| No code changes needed | All source files were already clean from prior phases -- no TODO, no debugger, no any types, no commented-out code | Preemptive reformatting -- would pollute git diff without fixing actual issues |
| Verify all API edge cases (400, 404) | Confirms Zod validation and Express error handler work correctly for invalid inputs | Happy-path only testing -- misses validation coverage |

### Tricky Parts & Solutions

**No issues encountered.** The codebase was already production-ready from prior phases. Both `tsc --noEmit` and `ng build --configuration production` passed with zero errors and zero warnings on first run. All 8 API endpoints returned expected response shapes and status codes.

### Verification Results

| Check | Result |
|-------|--------|
| Backend `tsc --noEmit` | Zero errors |
| Frontend `ng build --configuration production` | Zero errors, zero warnings |
| `console.log` audit | Only 4 legitimate startup/seed messages |
| TODO/FIXME/HACK scan | Zero found |
| debugger statement scan | Zero found |
| `any` type scan | Zero found |
| Health endpoint (`/health`) | 200 -- `{"status":"ok","events":510}` |
| Events endpoint (`/api/events`) | 200 -- paginated response with data array |
| Errors-per-vehicle (`/api/aggregations/errors-per-vehicle`) | 200 -- vehicle aggregation array |
| Top codes (`/api/aggregations/top-codes`) | 200 -- top 10 codes array |
| Critical vehicles (`/api/aggregations/critical-vehicles`) | 200 -- critical vehicles array |
| Invalid level (`?level=INVALID`) | 400 -- Zod validation rejection |
| Negative page (`?page=-1`) | 400 -- Zod validation rejection |
| Nonexistent route (`/api/nonexistent`) | 404 -- Express error handler |
| `docker compose config` | Validates without errors |
| `.dockerignore` coverage | node_modules, dist, .db, .planning, .claude, .git |
| Secrets scan | No passwords, API keys, or credentials in tracked files |

### Patterns Demonstrated

- **Production readiness checklist:** Systematic scan for debug artifacts, build verification, API smoke testing, Docker validation, documentation review
- **Edge case testing:** All three error categories (validation 400, not-found 404, success 200) verified with curl
- **Clean git state:** No untracked sensitive files, .dockerignore covers all build artifacts

---

## Phase 6: Vehicle Features

**Status:** Complete (1/1 plans)

### What Was Built & Why

**Plan 06-01 — Vehicle Detail Page + Fleet Overview Grid**

Added two new frontend pages and one new backend endpoint to create a drill-down investigation flow: **Fleet Grid** (scan) -> **Vehicle Detail** (investigate) -> **Events Table** (analyze).

**Backend:**
- `VehicleSummary` and `VehicleTopCode` interfaces in `backend/src/types/index.ts`
- `validateParams()` middleware in `backend/src/middleware/validate.ts` — same pattern as `validateQuery` but for route params, stores result in `res.locals.validatedParams`
- `VehicleService.getVehicleSummary()` — 4 parallel TypeORM queries via `Promise.all`: severity counts (CASE/SUM), first/last seen (MIN/MAX), top 10 codes (GROUP BY), recent 10 events. Returns `VehicleSummary | null`
- `GET /api/vehicles/:vehicleId/summary` with Zod param validation + Swagger docs. Returns 404 if vehicle not found

**Frontend:**
- `VehicleStore` ComponentStore with `loadFleetGrid` effect (combines errors-per-vehicle + critical-vehicles, computes health status) and `loadVehicleDetail` effect (calls vehicle summary endpoint)
- `FleetOverviewComponent` — smart component at `/vehicles` with responsive CSS Grid (`repeat(auto-fill, minmax(280px, 1fr))`) of vehicle cards
- `VehicleCardComponent` — dumb component with `@Input vehicle`, `@Output vehicleClick`, keyboard accessible (`tabindex="0"`, `role="button"`, Enter/Space handlers)
- `VehicleDetailComponent` — smart component at `/vehicles/:id` with breadcrumb, health header, 5-stat row, error code breakdown, recent events table, "View All Events" link
- All vehicle click targets updated: dashboard critical vehicle clicks, dashboard bar chart labels, events table vehicleId column — all route to `/vehicles/:id`

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| `Promise.all` for 4 parallel queries | All queries are independent (scoped by vehicleId) — parallel execution reduces latency ~3x vs sequential | Sequential queries — unnecessary wait time |
| Separate `VehicleStore` from `DiagnosticsStore` | Single responsibility — fleet/vehicle state is independent of event filtering state. Prevents cross-contamination and unnecessary re-renders | Extend DiagnosticsStore — would bloat state shape and couple unrelated concerns |
| Health status computed in store, not component | Business logic belongs in the store. Components read derived selectors — no logic duplication if multiple components need health status | Compute in template — violates smart/dumb split, duplicates logic |
| Grid health: critical-vehicles endpoint; Detail health: errorCount threshold | Grid uses 24h window business rule (existing endpoint). Detail uses all-time count (simpler, shows overall health) | Same logic for both — would require adding 24h window to vehicle summary endpoint |
| `validateParams()` as separate middleware | Route params vs query params are structurally different (`req.params` vs `req.query`). Separate middleware keeps the contract clear | Extend `validateQuery` with a second parameter — conflates two different validation targets |

### Tricky Parts & Solutions

**No blocking issues encountered.** Both backend `tsc --noEmit` and frontend `ng build --configuration production` passed with zero errors on first attempt. The VehicleStore follows the exact same RxJS patterns as DiagnosticsStore (inner `catchError` returning `EMPTY`, `takeUntilDestroyed`, `switchMap` for API calls).

### RxJS Patterns — Vehicle Features

The VehicleStore introduces one new pattern while reusing all existing ones:

- **`combineLatest` in `loadFleetGrid` effect:** Combines `getErrorsPerVehicle()` and `getCriticalVehicles()` responses to compute health status. The grid needs both datasets — errors-per-vehicle for counts and critical-vehicles for the "in critical list" check. `combineLatest` ensures both responses are available before computing cards.
- **`effect<string>` typed trigger in `loadVehicleDetail`:** The effect accepts a `string` (vehicleId) as input — type-safe trigger unlike the void trigger in `loadFleetGrid`. `switchMap` on the vehicleId stream means navigating to a different vehicle cancels the previous load.
- **Derived selector for health status:** `detailHealthStatus$` is a `select()` that derives `VehicleHealthStatus` from `vehicleDetail$` — computed property, not stored state.

### Patterns Demonstrated

- **Promise.all for parallel queries:** Backend service pattern for independent data fetching — reduces latency proportional to query count
- **Two-store architecture:** DiagnosticsStore (events/aggregations) + VehicleStore (fleet/vehicle) — separation by domain, not by view
- **Dumb component with keyboard accessibility:** VehicleCardComponent handles Enter/Space keys, has `role="button"` and `aria-label` — full WCAG compliance
- **Cross-view navigation refactor:** All vehicle click targets across 3 existing views updated to route to `/vehicles/:id` — consistent user mental model
- **Breadcrumb navigation:** VehicleDetailComponent reads `:id` from `ActivatedRoute.paramMap` and provides hierarchical navigation context

---

## Phase 7: UI/UX Polish & Filter Improvements

**Status:** Complete (iterative improvements across multiple sessions)

### What Was Built & Why

A series of user-driven UX improvements addressing professional polish, filter transparency, case sensitivity, search functionality, and data diversity.

**UI/UX Structural Improvements:**
- **ActiveFiltersBarComponent** — New shared dumb component showing active filter chips (pill-shaped badges) with a "Clear all" button. Added to both Dashboard and Events pages to provide constant filter context.
- **Dashboard section grouping** — Reorganized into 3 labeled sections: "Filtered Results" (responds to all filters), "Fleet-Wide Overview" (date range only), and "Critical Vehicles". Each section has a subtitle explaining its filter scope.
- **Section dividers** — Added `<hr class="section-divider">` between major sections across Dashboard and Vehicle Detail pages.
- **Filter panel active state** — Blue border, blue legend text, and subtle glow when any filter is active (`filter-panel--active` CSS modifier).
- **Toast notifications** — `NotificationService.show()` called on filter apply/reset with descriptive messages (e.g., "Filters applied: Vehicle: BMW-1003, Severity: ERROR").
- **Result summary bar** — Events page shows context-aware count text ("Showing 12 of 45 filtered events" vs "Showing 493 total events").
- **Severity label rename** — ERROR severity now displays as "CRITICAL" via a `DISPLAY_LABELS` map in SeverityBadgeComponent, reducing confusion between the severity level name and its user-facing label.

**Vehicle Search Bar:**
- **FleetOverviewComponent** — Added live search bar with SVG magnifying glass icon, autocomplete dropdown (up to 6 suggestions), clear button, and filter status count.
- Client-side filtering via `BehaviorSubject<string>` + `combineLatest` with `fleetCards$`.
- Keyboard support: Enter submits and dismisses dropdown, Escape closes dropdown, click outside closes suggestions.

**Filter & Backend Fixes:**
- **Case-insensitive filtering** — All backend WHERE clauses now use `UPPER()` on both sides for vehicleId and code. Zod level validation uses `.transform(v => v.toUpperCase()).pipe(z.enum(...))` for case-insensitive input.
- **Error code filter on topCodes** — Added `code` parameter to the top-codes aggregation endpoint (backend route + service + Zod schema). Frontend store now passes all filters (vehicleId, code, level) to the topCodes API.
- **Conditional Most Common Code card** — Hidden when code filter is active (redundant data). Total Events card expands to fill the row via `summary-cards--half` CSS class toggle.

**Seed Data Diversification:**
- Updated log parser regex from `VH-\d{4}` to `[A-Z][A-Z0-9]+-\d{4}` for flexible vehicle ID formats.
- Regenerated `seed.log` with 493 events across 26 vehicles using 8 fleet prefixes (BMW, MNI, RR, X5, I4, M3, IX, S7).
- Intentional clustering: BMW-1003, X5-4002, M3-6001 have concentrated errors for critical vehicle detection testing.

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| `UPPER()` in SQL for case-insensitive matching | Database-level normalization ensures consistency regardless of client input casing. Works with SQLite's `UPPER()` function | Frontend `.toUpperCase()` before sending — would miss direct API calls |
| Zod `.transform().pipe()` for level enum | Normalizes user input to uppercase before the enum check — accepts `error`, `Error`, `ERROR` | Separate preprocessing middleware — unnecessary when Zod handles it |
| `DISPLAY_LABELS` map for severity display | Decouples the backend enum value (`ERROR`) from user-facing text (`CRITICAL`). Easy to change display without affecting business logic | Rename backend enum — would require database migration and break existing queries |
| Client-side vehicle search (not server-side) | Fleet grid data is already loaded — no additional API call needed. BehaviorSubject + combineLatest gives instant results | Server-side search — adds unnecessary latency for an already-loaded dataset |
| Section grouping with subtitles | Users couldn't tell which filters affected which data. Explicit labels ("Responds to all active filters" / "Only date range filters apply") eliminate confusion | Tooltip-based explanation — easy to miss, poor discoverability |
| Hide Most Common Code when filtering by code | When you've already specified a code filter, the "Most Common Code" card is redundant — it would just show the code you typed | Always show — wastes space with redundant information |

### Tricky Parts & Solutions

**Autocomplete dropdown wouldn't dismiss on Enter:** Users were trapped in the search bar — they had to select a suggestion to escape. Fixed by adding `(keydown.enter)="onSearchSubmit($event)"` which closes the dropdown, blurs the input, and filters the grid. Also added `(keydown.escape)="onDismissSuggestions()"` for keyboard-only users.

**TypeORM `findBy({ field: undefined })` pitfall with UPPER():** When adding `UPPER()` to WHERE clauses, the undefined-guard pattern remains critical. The `UPPER()` wrapping is only applied when the parameter has a defined value — `if (params.vehicleId !== undefined)` before `qb.andWhere('UPPER(event.vehicleId) = UPPER(:vehicleId)', ...)`.

**Docker volume with seed data changes:** After regenerating `seed.log` with diverse vehicle IDs, `docker compose up --build` wouldn't reflect new data because the old SQLite database persisted in the named volume. Required `docker compose down -v` to remove the volume and force a fresh seed.

### RxJS Patterns — Vehicle Search

- **`BehaviorSubject<string>` for search term:** Starts with empty string `''`. `next()` called on each `(input)` event. Late subscribers get the current search term immediately.
- **`combineLatest([fleetCards$, searchTerm$])` for filtered results:** Both streams must be available for filtering. When either the fleet data loads or the search term changes, the filter re-runs.
- **Pure `map` transform for filtering:** `cards.filter(c => c.vehicleId.toUpperCase().includes(needle))` — case-insensitive client-side filter using `toUpperCase()` on both sides.

### Patterns Demonstrated

- **Active filter visualization:** Filter chips provide constant context about what filters are applied — standard enterprise dashboard UX pattern.
- **Progressive disclosure:** Dashboard sections labeled by filter scope — users understand data relationships without reading documentation.
- **Case-insensitive SQL:** `UPPER()` applied uniformly at the database layer — ensures consistent behavior regardless of input source.
- **Conditional UI based on filter state:** `hasCodeFilter$` observable drives template `@if` blocks — reactive UI that adapts to current filter context.
- **Keyboard-accessible search:** Enter/Escape/blur handlers ensure the search bar is fully usable without a mouse.
- **Diverse seed data:** Multiple vehicle ID prefixes enable realistic testing of search, filtering, and aggregation features.

---
*Last updated: 2026-02-22 (Phase 7)*
