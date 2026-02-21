# Architecture Research

**Domain:** Fleet vehicle diagnostics console (Express.js + TypeORM + SQLite backend, Angular 17+ frontend)
**Researched:** 2026-02-21
**Confidence:** HIGH — stack is fully determined by assignment constraints; patterns verified via Context7 (NgRx) and official TypeORM docs

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Angular 17+)                    │
│                        localhost:4200                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────────────────────────┐  │
│  │   AppShell      │  │         Routing Layer                │  │
│  │   (nav/layout)  │  │  /events → EventsFeature             │  │
│  └────────┬────────┘  │  /dashboard → DashboardFeature       │  │
│           │           └──────────────┬───────────────────────┘  │
│  ┌────────┴────────────────────────┐ │                           │
│  │        Shared Components        │ │                           │
│  │  FilterPanel | SeverityBadge    │ │                           │
│  │  PaginationControls | Spinner   │ │                           │
│  └─────────────────────────────────┘ │                           │
│                                      ↓                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Feature Components                       │  │
│  │  ┌────────────────────┐  ┌────────────────────────────┐   │  │
│  │  │  EventsComponent   │  │  DashboardComponent        │   │  │
│  │  │  (raw events table)│  │  (aggregated summary cards)│   │  │
│  │  └─────────┬──────────┘  └──────────────┬─────────────┘   │  │
│  └────────────┼─────────────────────────────┼─────────────────┘  │
│               │                             │                    │
│               ↓                             ↓                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              DiagnosticsStore (NgRx ComponentStore)        │  │
│  │  State: { filters, events, total, page,                    │  │
│  │           aggregations, loading, error }                   │  │
│  │  Updaters: setFilters | setPage | resetFilters             │  │
│  │  Effects: loadEvents$ | loadAggregations$                  │  │
│  │  Selectors: events$ | filters$ | loading$ | error$         │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │              DiagnosticsApiService (HttpClient)            │  │
│  │  getEvents(filters, page): Observable<PaginatedResponse>   │  │
│  │  getErrorsPerVehicle(): Observable<AggregationResult[]>    │  │
│  │  getTopCodes(): Observable<AggregationResult[]>            │  │
│  │  getCriticalVehicles(): Observable<VehicleSummary[]>       │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│         (via dev proxy)     │  HTTP /api/*                       │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │   REST API layer   │
                    │   (Express.js)     │
                    │   localhost:3000   │
                    └─────────┬──────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                        BACKEND                                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     Express App                             │ │
│  │  index.ts — server setup, CORS, JSON, error handler mount  │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│  ┌───────────────────────┴────────────────────────────────────┐ │
│  │                    Middleware Layer                          │ │
│  │  validateQuery (Zod) | errorHandler | 404 fallback          │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│  ┌───────────────────────┴────────────────────────────────────┐ │
│  │                     Routes Layer                            │ │
│  │  /api/events            → EventsRouter                      │ │
│  │  /api/aggregations/*    → AggregationsRouter                │ │
│  │  /api-docs              → SwaggerUI                         │ │
│  │  /health                → HealthRouter                      │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│  ┌───────────────────────┴────────────────────────────────────┐ │
│  │                    Services Layer                            │ │
│  │  EventsService          — query + filter logic              │ │
│  │  AggregationsService    — groupBy + critical logic          │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│  ┌───────────────────────┴────────────────────────────────────┐ │
│  │                   Data Access Layer                          │ │
│  │  TypeORM DataSource     — DataSource config + connection    │ │
│  │  DiagnosticEvent entity — column definitions + indexes      │ │
│  │  Repositories           — TypeORM Repository<Entity>        │ │
│  │  QueryBuilder           — dynamic WHERE clause construction │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│  ┌───────────────────────┴────────────────────────────────────┐ │
│  │                    Database Layer                            │ │
│  │  SQLite (fleet.db)  — file-based, no separate process       │ │
│  │  Indexes on vehicleId, code, level, timestamp               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Seeding Pipeline                          │ │
│  │  seed log file → LogParser → DiagnosticEvent[] → DB insert  │ │
│  │  Runs once on startup when DB is empty                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `index.ts` | Express app bootstrap, CORS, JSON body parsing, mount middleware and routers | All routers, ErrorHandler |
| `EventsRouter` | Route definitions for `GET /api/events` | EventsService, validateQuery middleware |
| `AggregationsRouter` | Route definitions for `/api/aggregations/*` | AggregationsService |
| `EventsService` | Build dynamic QueryBuilder from filter params, return paginated results | TypeORM Repository |
| `AggregationsService` | GROUP BY queries for errors-per-vehicle, top-codes, critical vehicles logic | TypeORM DataSource |
| `DiagnosticEvent` (entity) | ORM mapping, column types, index declarations | TypeORM DataSource |
| `LogParser` | Regex parse of raw log lines into typed `DiagnosticEvent[]` | Used by seed script |
| `SeedRunner` | On-startup check + batch insert of parsed seed data | DataSource, LogParser |
| `ErrorHandler` (middleware) | Catch-all Express error handler, shape structured `{error, statusCode}` response | Mounted last in Express chain |
| `validateQuery` (middleware) | Zod schema validation of query params, return 400 on failure | Mounted before route handlers |
| `DiagnosticsApiService` | Angular HttpClient wrapper — one method per backend endpoint, returns `Observable<T>` | HttpClient, DiagnosticsStore |
| `DiagnosticsStore` | NgRx ComponentStore — single source of truth for filters, events, aggregations, loading, error | DiagnosticsApiService |
| `EventsComponent` | Raw events table view — subscribes to store selectors, dispatches filter/page changes | DiagnosticsStore, FilterPanel, SeverityBadge |
| `DashboardComponent` | Aggregated summary view — subscribes to aggregation selectors | DiagnosticsStore |
| `FilterPanel` (shared) | Emits filter form values, reused across both feature views | DiagnosticsStore (via parent) |
| `HttpErrorInterceptor` | Global Angular HTTP error catch, surfaces to store error state or toast | DiagnosticsStore, ToastService |

---

## Recommended Project Structure

```
fleet-health-diagnostics/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── data-source.ts       # TypeORM DataSource init (SQLite path, entities, sync)
│   │   ├── entities/
│   │   │   └── DiagnosticEvent.ts   # @Entity with @Column, @Index decorators
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts      # Global Express error handler (last in chain)
│   │   │   └── validateQuery.ts     # Zod schema validation middleware factory
│   │   ├── routes/
│   │   │   ├── events.router.ts     # GET /api/events with query params
│   │   │   ├── aggregations.router.ts # GET /api/aggregations/*
│   │   │   └── health.router.ts     # GET /health
│   │   ├── services/
│   │   │   ├── events.service.ts    # Dynamic QueryBuilder, pagination logic
│   │   │   └── aggregations.service.ts # GROUP BY, critical vehicle calculation
│   │   ├── parser/
│   │   │   └── log-parser.ts        # Regex parse of [timestamp][VEHICLE_ID:x]... format
│   │   ├── seed/
│   │   │   ├── seed.log             # Generated log file (~500 events)
│   │   │   └── seed-runner.ts       # Check empty DB → parse → batch insert
│   │   ├── types/
│   │   │   └── index.ts             # Shared TS interfaces (EventFilters, PaginatedResult)
│   │   └── index.ts                 # Express app setup, middleware mount, server listen
│   ├── data/
│   │   └── fleet.db                 # SQLite database (git-ignored)
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── frontend/
│   └── src/app/
│       ├── core/
│       │   ├── models/
│       │   │   └── diagnostic-event.model.ts  # TS interfaces: DiagnosticEvent, EventFilters, etc.
│       │   ├── services/
│       │   │   └── diagnostics-api.service.ts # HttpClient wrapper, Observable<T> returns
│       │   └── interceptors/
│       │       └── http-error.interceptor.ts  # Global HTTP error catch
│       ├── features/
│       │   ├── events/
│       │   │   ├── events.component.ts        # Smart component, injects store
│       │   │   └── events.routes.ts           # Lazy route definition
│       │   └── dashboard/
│       │       ├── dashboard.component.ts     # Smart component, injects store
│       │       └── dashboard.routes.ts        # Lazy route definition
│       ├── shared/
│       │   ├── filter-panel/
│       │   │   └── filter-panel.component.ts  # Dumb component, emits filter changes
│       │   ├── severity-badge/
│       │   │   └── severity-badge.component.ts
│       │   ├── loading-spinner/
│       │   │   └── loading-spinner.component.ts
│       │   └── pagination-controls/
│       │       └── pagination-controls.component.ts
│       ├── store/
│       │   └── diagnostics.store.ts           # NgRx ComponentStore — single store for app
│       ├── app.component.ts                   # Shell with nav sidebar + router-outlet
│       └── app.routes.ts                      # Root routes redirecting to /events and /dashboard
│
├── docs/
│   ├── REQUIREMENTS.md
│   └── ARCHITECTURE.md
├── docker-compose.yml
└── README.md
```

### Structure Rationale

- **`backend/src/services/`:** Business logic isolated from HTTP transport. Routes delegate to services; services have no knowledge of `req`/`res`. This makes services independently testable and keeps route handlers thin.
- **`backend/src/entities/`:** TypeORM entity definitions separate from business logic. The `DiagnosticEvent` entity is the single source of truth for the database schema. Collocating indexes here avoids schema drift.
- **`backend/src/parser/`:** The log parser is a pure function (input: string → output: typed objects). Isolating it means it can be run independently in tests or from CLI without bootstrapping the Express app.
- **`backend/src/seed/`:** Seeding is a startup concern, not a route concern. Separating it prevents seed logic leaking into production code paths.
- **`frontend/src/core/`:** Infrastructure that is app-wide and not tied to any feature — API service, models, interceptors. Components never import directly from `core/` except via the store.
- **`frontend/src/features/`:** Each feature is self-contained with its own component and lazy route. Features know about the store; the store does not know about features.
- **`frontend/src/shared/`:** Presentational (dumb) components. They accept `@Input()` and emit `@Output()` only. They have zero dependency on the store or API service.
- **`frontend/src/store/`:** Single `DiagnosticsStore` for the entire application. This is appropriate at this scale — one feature domain, one store. If the app grew to multiple unrelated feature domains, each domain would get its own store.

---

## Architectural Patterns

### Pattern 1: Express Layered Architecture (Routes → Services → Data Access)

**What:** Request enters via an Express router, is validated by middleware, delegated to a service for business logic, and the service uses TypeORM to query the database. The route handler only shapes the HTTP response.

**When to use:** Always in this project. Every endpoint follows this exact chain.

**Trade-offs:** Slight indirection for simple endpoints, but enforces testability and separation of concerns. Routers stay thin; services stay pure.

**Example:**
```typescript
// routes/events.router.ts
router.get('/events', validateQuery(eventFiltersSchema), async (req, res, next) => {
  try {
    const result = await eventsService.getEvents(req.validatedQuery);
    res.json(result);
  } catch (err) {
    next(err); // delegate to global error handler
  }
});

// services/events.service.ts
async getEvents(filters: EventFilters): Promise<PaginatedResult<DiagnosticEvent>> {
  const qb = this.repo.createQueryBuilder('event');
  if (filters.vehicleId) qb.andWhere('event.vehicleId = :vehicleId', { vehicleId: filters.vehicleId });
  if (filters.level)     qb.andWhere('event.level = :level', { level: filters.level });
  if (filters.from)      qb.andWhere('event.timestamp >= :from', { from: filters.from });
  const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();
  return { data, total, page: filters.page, limit: filters.limit };
}
```

### Pattern 2: NgRx ComponentStore as Single App-Level Store

**What:** A single `DiagnosticsStore` (extending `ComponentStore`) holds all reactive state for the application — filters, event list, pagination, aggregations, loading flag, and error. Both feature views (`EventsComponent`, `DashboardComponent`) inject this store directly.

**When to use:** This project has one feature domain with shared filter state. ComponentStore is the right choice — less boilerplate than full NgRx Store, still provides reactive selectors and effects, and is appropriate when state does not need to persist across URL changes.

**Trade-offs:** ComponentStore lacks Redux DevTools and global action dispatching. Acceptable at this scale. Full NgRx Store would be overkill for a single feature; a plain service would lack the observable ergonomics needed to demonstrate RxJS patterns.

**Example:**
```typescript
// store/diagnostics.store.ts
@Injectable({ providedIn: 'root' })
export class DiagnosticsStore extends ComponentStore<DiagnosticsState> {
  constructor(private api: DiagnosticsApiService) {
    super(initialState);
    // Auto-trigger loadEvents when filters or page changes
    this.loadEvents(this.filtersAndPage$);
  }

  // Selectors
  readonly events$ = this.select(s => s.events);
  readonly loading$ = this.select(s => s.loading);
  readonly filters$ = this.select(s => s.filters);
  readonly total$ = this.select(s => s.total);
  private readonly filtersAndPage$ = this.select(
    this.filters$,
    this.select(s => s.page),
    (filters, page) => ({ filters, page }),
    { debounce: true }  // wait for state to settle before emitting
  );

  // Updaters
  readonly setFilters = this.updater((state, filters: Partial<EventFilters>) => ({
    ...state, filters: { ...state.filters, ...filters }, page: 1
  }));
  readonly setPage = this.updater((state, page: number) => ({ ...state, page }));
  readonly resetFilters = this.updater(state => ({ ...state, filters: initialFilters, page: 1 }));

  // Effect — switchMap cancels in-flight requests on new filter/page emission
  readonly loadEvents = this.effect(
    (params$: Observable<{ filters: EventFilters; page: number }>) =>
      params$.pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap(() => this.patchState({ loading: true, error: null })),
        switchMap(({ filters, page }) =>
          this.api.getEvents(filters, page).pipe(
            tapResponse({
              next: result => this.patchState({ events: result.data, total: result.total, loading: false }),
              error: err => this.patchState({ loading: false, error: err.message })
            })
          )
        )
      )
  );
}
```

### Pattern 3: Smart/Dumb Component Split

**What:** Feature components (`EventsComponent`, `DashboardComponent`) are "smart" — they inject the store and wire up observables. Shared components (`FilterPanel`, `SeverityBadge`, `PaginationControls`) are "dumb" — they accept `@Input()` data and emit `@Output()` events only. No store dependency in shared components.

**When to use:** Always. This is the standard Angular component architecture.

**Trade-offs:** Slightly more boilerplate at the feature component layer, but shared components become trivially reusable and testable in isolation. Both the events table view and dashboard view reuse `FilterPanel` without duplication.

### Pattern 4: Zod Validation at the API Boundary

**What:** A middleware factory wraps Zod schema validation. Applied per-route, it validates `req.query` against a typed schema and attaches the parsed result to `req.validatedQuery`. On failure, it responds `400` before the route handler runs.

**When to use:** Every endpoint that accepts query parameters. Validation is a boundary concern, not a service concern.

**Trade-offs:** Zod adds a small dependency (~12kb), but provides TypeScript-native type inference from schemas, eliminating a separate type declaration for query params.

**Example:**
```typescript
// middleware/validateQuery.ts
export const validateQuery = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid query parameters', details: result.error.flatten() });
  }
  (req as any).validatedQuery = result.data;
  next();
};
```

---

## Data Flow

### Backend Request Flow (GET /api/events)

```
HTTP GET /api/events?vehicleId=ABC&level=ERROR&page=2
    ↓
validateQuery middleware (Zod) — 400 if invalid
    ↓
EventsRouter handler
    ↓
EventsService.getEvents(validatedParams)
    ↓
TypeORM QueryBuilder — dynamic .andWhere() chain
    ↓
SQLite (fleet.db)
    ↓
[DiagnosticEvent[], total] ← getManyAndCount()
    ↓
{ data, total, page, limit } ← shaped in service
    ↓
res.json(result) ← shaped in route handler
```

### Frontend Filter-to-Display Flow

```
User changes filter input (FilterPanel)
    ↓
@Output() filterChange emitted to EventsComponent
    ↓
DiagnosticsStore.setFilters(newFilters)  [Updater]
    ↓
filtersAndPage$ selector emits (debounced — waits for state to settle)
    ↓
loadEvents effect triggered
    ↓
debounceTime(300) — waits 300ms for user to stop typing
    ↓
distinctUntilChanged — suppresses duplicate emissions
    ↓
switchMap — cancels any in-flight HTTP request
    ↓
DiagnosticsApiService.getEvents(filters, page)  → HTTP GET /api/events
    ↓
tapResponse: patchState({ events, total, loading: false })
    ↓
events$ selector emits new value
    ↓
EventsComponent AsyncPipe re-renders table
```

### Seeding Flow (Startup, One-Time)

```
index.ts starts
    ↓
DataSource.initialize() — creates fleet.db if absent
    ↓
SeedRunner.run()
    ↓
COUNT(*) from diagnostic_event → if 0:
    ↓
LogParser.parse(seed.log) → DiagnosticEvent[]
    ↓
repository.save(events, { chunk: 100 }) — batch insert
    ↓
Server begins accepting requests
```

### State Management Flow

```
DiagnosticsStore (ComponentStore)
    │
    ├── filters$ ──┐
    ├── page$    ──┼── combined via select() ──→ filtersAndPage$ (debounced)
    │              │                                    │
    │              └────────────────────────────────────┘
    │                                                   ↓
    │                                          loadEvents effect
    │                                                   │
    │                              switchMap (cancels stale) → HTTP call
    │                                                   │
    ├── events$ ←──────────────────────── patchState on success
    ├── total$  ←──────────────────────── patchState on success
    ├── loading$ ←─────────────────────── patchState before/after call
    └── error$  ←──────────────────────── patchState on error
```

---

## Suggested Build Order (Dependencies Between Components)

The build must proceed backend-first because the frontend requires a running API to verify real integration.

```
Phase 1 — Backend Data Layer (no dependencies)
  1a. DiagnosticEvent entity + TypeORM DataSource config
  1b. LogParser (pure function, no DB dependency)
  1c. SeedRunner (depends on 1a + 1b)
  1d. /health endpoint to verify DB populated

Phase 2 — Backend API Layer (depends on Phase 1)
  2a. EventsService + dynamic QueryBuilder
  2b. EventsRouter + validateQuery middleware
  2c. AggregationsService (GROUP BY queries)
  2d. AggregationsRouter
  2e. ErrorHandler middleware
  2f. Swagger/OpenAPI docs

Phase 3 — Frontend Foundation (depends on Phase 2 API being runnable)
  3a. Angular project scaffold + proxy config
  3b. Core models (interfaces for DiagnosticEvent, EventFilters, etc.)
  3c. DiagnosticsApiService (HttpClient wrappers)
  3d. DiagnosticsStore (ComponentStore with state, updaters, effects)
  3e. App shell + routing (two routes)

Phase 4 — Frontend Views (depends on Phase 3)
  4a. Shared components (FilterPanel, SeverityBadge, PaginationControls)
  4b. EventsComponent (raw events table, wires FilterPanel + store)
  4c. DashboardComponent (summary cards + aggregation views)
  4d. HttpErrorInterceptor + loading/error states

Phase 5 — Integration + Delivery (depends on Phase 4)
  5a. End-to-end smoke test (backend + frontend together)
  5b. Docker (backend Dockerfile, frontend Dockerfile + nginx, docker-compose)
  5c. Documentation (REQUIREMENTS.md, ARCHITECTURE.md, README.md)
```

**Critical dependency constraint:** `DiagnosticsStore` (Phase 3d) must be built before any feature component (Phase 4), because feature components inject the store. The store in turn depends on `DiagnosticsApiService` (Phase 3c) which depends on the core models (Phase 3b). This is a strict linear chain within the frontend.

**Parallelism opportunity:** Phases 1 and 3 foundations (models + interfaces) can be drafted in parallel, since the TypeScript interfaces can be defined before the API is functional. However, real integration testing requires the backend API to be running.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (assignment) | SQLite file DB, single Express process, single Angular SPA — exactly right for scope |
| 10K events/day | Add indexes (already planned on vehicleId, code, level, timestamp) — SQLite handles this well |
| 100K+ events | Migrate to PostgreSQL (TypeORM DataSource config change only); add connection pooling |
| Multiple teams/features | Split DiagnosticsStore into feature-scoped stores; consider full NgRx Store for cross-feature state |
| Real-time requirement | Add WebSocket layer (Socket.io) for live event push; store adds incoming stream handling |

### Scaling Priorities

1. **First bottleneck (if it applies):** SQLite write locks under concurrent writes. Mitigation: WAL mode (`PRAGMA journal_mode=WAL`). For this assignment this is not a concern — read-heavy workload with one-time seed insert.
2. **Second bottleneck:** Aggregation queries become slow as table grows. Mitigation: Materialized views or scheduled rollup tables. Not needed at assignment scale.

---

## Anti-Patterns

### Anti-Pattern 1: Business Logic in Route Handlers

**What people do:** Write TypeORM queries directly inside `router.get()` callbacks, including filter construction and aggregation math.

**Why it's wrong:** Route handlers grow to hundreds of lines; logic cannot be reused across routes; the service layer disappears and testing requires a full HTTP server.

**Do this instead:** Route handlers call a service method with validated params and call `res.json()` on the result. Services own all query and aggregation logic.

### Anti-Pattern 2: catchError at the Outer Observable Level in Effects

**What people do:** Place `catchError` at the outermost pipe in a ComponentStore effect, outside the `switchMap`.

**Why it's wrong:** An outer `catchError` terminates the effect's observable stream on first error. Subsequent filter changes no longer trigger API calls — the effect is dead until the component is destroyed and re-created.

**Do this instead:** Place `catchError` (or `tapResponse`) inside the inner observable returned by `switchMap`, so only the inner HTTP stream terminates on error while the outer trigger stream remains alive.

```typescript
// WRONG — effect dies on first HTTP error
this.effect((filters$) => filters$.pipe(
  switchMap(f => this.api.getEvents(f)),
  catchError(err => { /* effect stream is now dead */ return EMPTY; })
));

// CORRECT — only inner stream ends on error; effect stays alive
this.effect((filters$) => filters$.pipe(
  switchMap(f =>
    this.api.getEvents(f).pipe(
      tapResponse({ next: ..., error: err => this.patchState({ error: err.message }) })
    )
  )
));
```

### Anti-Pattern 3: No Debounce on Filter Changes

**What people do:** Wire filter input changes directly to store updaters with no debounce, triggering an API call on every keystroke.

**Why it's wrong:** Typing "P0300" fires 5 API calls in rapid succession. Without `switchMap`, responses arrive out of order. With `switchMap`, the previous request is cancelled but the backend still receives the calls.

**Do this instead:** Apply `debounceTime(300)` before the `switchMap` in the `loadEvents` effect, or use the ComponentStore's `{ debounce: true }` selector option on the combined `filtersAndPage$` selector. Both the selector debounce and the effect-level `debounceTime` are applied in this project for belt-and-suspenders protection.

### Anti-Pattern 4: Directly Coupling Feature Components to DiagnosticsApiService

**What people do:** Inject `DiagnosticsApiService` directly into `EventsComponent` and subscribe to HTTP calls in the component.

**Why it's wrong:** Filter state cannot be shared between the events view and the dashboard view. Loading state, error state, and current filter values are duplicated. Navigating between views resets all state.

**Do this instead:** All HTTP calls flow through `DiagnosticsStore`. Feature components inject the store only. The store manages the single source of truth for all shared state.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| SQLite (fleet.db) | TypeORM DataSource — file path in `data-source.ts` | DB file git-ignored; created on first startup |
| Angular dev server → Express | `proxy.conf.json` — `/api/*` proxied to `localhost:3000` | Dev only; in Docker, nginx reverse-proxies to backend container |
| Docker network | Both services on same bridge network in `docker-compose.yml` | Frontend nginx uses `http://backend:3000` as upstream |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Angular component ↔ DiagnosticsStore | RxJS Observables via `async` pipe and store methods | No direct component-to-component communication for shared state |
| DiagnosticsStore ↔ DiagnosticsApiService | `Observable<T>` return values; store subscribes via effects | Service is stateless — no caching, no state; store owns all state |
| Express route ↔ EventsService | Direct method call (async/await) | Services are instantiated once; no dependency injection framework |
| EventsService ↔ TypeORM | `getRepository(DiagnosticEvent)` + QueryBuilder | Repository is obtained from DataSource; services hold repository reference |
| LogParser ↔ SeedRunner | Pure function call: `parseLog(fileContent): DiagnosticEvent[]` | Parser has zero side effects; SeedRunner owns the DB insert |

---

## Sources

- **NgRx ComponentStore — effects, updaters, selectors, debounce:** Context7 `/ngrx/platform` (HIGH confidence — official NgRx docs)
  - [ComponentStore Effect Pattern](https://ngrx.io/guide/component-store/effect)
  - [ComponentStore Debounced Selectors](https://ngrx.io/guide/component-store/read)
- **TypeORM QueryBuilder + DataSource + Repository pattern:** Context7 `/n8n-io/typeorm` (HIGH confidence — official TypeORM docs)
  - [TypeORM Select Query Builder](https://typeorm.io/docs/query-builder/select-query-builder/)
  - [TypeORM Repository API](https://typeorm.io)
- **NgRx ComponentStore vs full NgRx Store:** [ngrx.io Comparison Guide](https://ngrx.io/guide/component-store/comparison) (HIGH confidence — official)
- **Express.js layered architecture (Routes → Services → Data):** [Layered Architecture in Node.js](https://medium.com/@ankitpartap24/layered-architecture-in-node-js-5ef94e846ec4), [Toptal Express Architecture](https://www.toptal.com/express-js/nodejs-typescript-rest-api-pt-2) (MEDIUM confidence — verified against standard patterns)
- **Angular 17+ standalone component folder structure:** [Angular 2025 Features Approach](https://www.ismaelramos.dev/blog/angular-2025-project-structure-with-the-features-approach/), [Angular University Standalone](https://blog.angular-university.io/angular-standalone-components/) (MEDIUM confidence — community best practice, consistent with angular.dev official guidance)
- **RxJS catchError placement in switchMap:** [Angular Best Practice: RxJS Error Handling](https://www.intertech.com/angular-best-practice-rxjs-error-handling/), [NgRx tapResponse pattern](https://ngrx.io/guide/component-store/effect) (HIGH confidence for tapResponse — official NgRx; MEDIUM for Intertech source)

---

*Architecture research for: Fleet Health Diagnostics Console (Express.js + TypeORM + SQLite / Angular 17+ + NgRx ComponentStore)*
*Researched: 2026-02-21*
