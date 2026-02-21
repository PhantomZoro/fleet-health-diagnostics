# Fleet Health & Diagnostics Console -- Architecture

## System Overview

The application is a monorepo with two independently deployable services and a shared SQLite database:

```
fleet-health-diagnostics/
  backend/    Express 5 API server (TypeScript, TypeORM, SQLite)
  frontend/   Angular 19 SPA (standalone components, NgRx ComponentStore)
```

In production (Docker), nginx serves the Angular build and reverse-proxies `/api` requests to the backend container. In development, Angular CLI's proxy config (`proxy.conf.json`) forwards `/api` to `localhost:3000`.

---

## Backend Architecture

### Layered Architecture

```
HTTP Request
    |
    v
  Routes          Receive request, apply Zod validation middleware, format response
    |
    v
  Services         Business logic, TypeORM QueryBuilder queries, aggregation SQL
    |
    v
  Entities          TypeORM-decorated models with column indexes
    |
    v
  SQLite (better-sqlite3)
```

Each layer has a single responsibility. Routes never contain query logic. Services never access `req`/`res`. This separation makes the business logic testable independently of HTTP concerns.

### Data Model

The single entity is `DiagnosticEvent`:

| Column      | Type       | Indexed | Description                                |
| ----------- | ---------- | ------- | ------------------------------------------ |
| `id`        | integer    | PK      | Auto-generated primary key                 |
| `timestamp` | datetime   | Yes     | When the diagnostic event occurred         |
| `vehicleId` | varchar(10)| Yes     | Vehicle identifier (e.g., `VH-1001`)       |
| `level`     | varchar(5) | Yes     | Severity: `ERROR`, `WARN`, or `INFO`       |
| `code`      | varchar(10)| Yes     | OBD-II diagnostic code (e.g., `P0420`)     |
| `message`   | text       | No      | Human-readable event description           |

All four filterable columns are indexed to support efficient WHERE clause combinations.

### API Design

| Method | Path                                   | Description                                      | Key Query Params                                    |
| ------ | -------------------------------------- | ------------------------------------------------ | --------------------------------------------------- |
| GET    | `/api/events`                          | Paginated, filterable event list                 | `vehicleId`, `code`, `level`, `from`, `to`, `page`, `limit` |
| GET    | `/api/aggregations/errors-per-vehicle` | Error/warn/info counts grouped by vehicle        | `from`, `to`                                        |
| GET    | `/api/aggregations/top-codes`          | Top 10 most frequent diagnostic codes            | `level`, `from`, `to`                               |
| GET    | `/api/aggregations/critical-vehicles`  | Vehicles with 3+ ERRORs in trailing 24h window   | None                                                |
| GET    | `/health`                              | Health check with event count                    | None                                                |
| GET    | `/api-docs`                            | Swagger UI (auto-generated from JSDoc)           | None                                                |

### Validation

All query parameters are validated through Zod schemas in a `validateQuery` middleware. The middleware:

1. Parses `req.query` against the route's Zod schema via `safeParse`
2. Returns 400 with structured error details on failure
3. Stores the parsed (and type-coerced) result in `res.locals.validated` on success

This pattern keeps route handlers clean -- they read from `res.locals.validated` with full type safety rather than parsing raw query strings.

### Seed Pipeline

On first startup, the backend parses `data/seed.log` (510 lines of structured log entries) through a regex-based log parser, maps entries to `DiagnosticEvent` entities, and bulk-inserts them in chunks of 100 to respect SQLite variable limits. A count guard prevents re-seeding on subsequent starts.

---

## Frontend Architecture

### Component Tree

```
AppComponent
  +-- <nav> sidebar (Dashboard, Events links)
  +-- <router-outlet>
  |     +-- DashboardComponent (lazy loaded)
  |     |     +-- FilterPanelComponent
  |     |     +-- LoadingSpinnerComponent
  |     |     +-- SeverityBadgeComponent
  |     |
  |     +-- EventsComponent (lazy loaded)
  |           +-- FilterPanelComponent
  |           +-- SeverityBadgeComponent
  |           +-- PaginationComponent
  |           +-- LoadingSpinnerComponent
  |
  +-- ToastComponent (global, in app shell)
```

### Smart / Dumb Component Split

| Component            | Type  | Data Access                          |
| -------------------- | ----- | ------------------------------------ |
| `DashboardComponent` | Smart | Injects `DiagnosticsStore`, reads selectors via `async` pipe |
| `EventsComponent`    | Smart | Injects `DiagnosticsStore`, reads selectors via `async` pipe |
| `FilterPanelComponent` | Dumb | `@Input()` for initial filters, `@Output()` for apply/reset events |
| `SeverityBadgeComponent` | Dumb | `@Input()` level string, renders colored badge |
| `PaginationComponent` | Dumb | `@Input()` total/page/limit, `@Output()` page change |
| `LoadingSpinnerComponent` | Dumb | `@Input()` visibility flag |
| `ToastComponent`     | Dumb | Injects `NotificationService` (global singleton) |

Smart components are the only ones that know about the store. Dumb components are fully reusable and testable in isolation.

### NgRx ComponentStore Data Flow

```
User Action (filter change, page click)
    |
    v
Smart Component -----> Store.updater (setFilters, setPage)
                           |
                           v
                       State change triggers combineLatest
                           |
                           v
                       debounceTime(300)
                           |
                           v
                       switchMap ---> DiagnosticsApiService ---> HTTP GET /api/...
                           |                                          |
                           v                                          v
                       catchError + EMPTY                        JSON response
                       (error state, stream survives)                 |
                           |                                          v
                           +--------- patchState <-------- tap (update state)
                                          |
                                          v
                                    Selector (distinctUntilChanged + shareReplay)
                                          |
                                          v
                                    async pipe in template ---> DOM update
```

Each smart component provides `DiagnosticsStore` at the component level (`providers: [DiagnosticsStore]`), giving each route its own isolated store instance whose lifecycle is tied to the component. This avoids stale state when navigating between views.

### RxJS Operator Rationale

| Operator               | Where Used                  | Why This Over Alternatives                                                                                       |
| ---------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `switchMap`            | `loadEventsEffect`          | Cancels in-flight request when a new filter arrives. `mergeMap` would allow stale responses to overwrite newer ones. `concatMap` would queue requests, showing outdated data while waiting. |
| `debounceTime(300)`    | Filter-to-API pipeline      | Prevents an API call per keystroke. 300ms balances responsiveness with server load -- fast enough to feel instant, slow enough to batch rapid changes. |
| `combineLatest`        | Filters + page merge        | Both filter changes AND page changes should trigger a re-fetch. `withLatestFrom` would only trigger on one source, missing the other. |
| `distinctUntilChanged` | All selectors               | Prevents re-render when a state update does not change a specific slice. Uses reference equality, which is sufficient because state is replaced (not mutated). |
| `shareReplay(1)`       | All selectors               | Late subscribers (e.g., `async` pipe in a template behind `*ngIf`) receive the last emitted value. Without it, template bindings would miss emissions that occurred before subscription. |
| `catchError` + `EMPTY` | Inside inner `switchMap`    | Catches HTTP errors without killing the outer effect stream. An outer `catchError` would permanently unsubscribe the effect, making all future filter changes silently ignored. |
| `takeUntilDestroyed`   | Component subscriptions     | Automatic unsubscribe on component destroy. Replaces the manual `ngOnDestroy` + `Subject.next()` + `complete()` pattern with a single operator. |
| `take(1)`              | `ActivatedRoute.queryParams`| One-shot read of initial query params (e.g., vehicleId from dashboard click-through). Prevents a memory leak from the never-completing `queryParams` observable. |

### Error Handling

A functional HTTP interceptor (`httpErrorInterceptor`) catches all failed API responses, extracts meaningful error messages, logs them to the console, and re-throws so the store's inner `catchError` can update the error state. A global `NotificationService` + `ToastComponent` displays transient error notifications to the user.

---

## Key Trade-offs

| Decision             | Chosen                   | Alternative          | Rationale                                                                                 |
| -------------------- | ------------------------ | -------------------- | ----------------------------------------------------------------------------------------- |
| Backend framework    | Express 5               | NestJS               | Lighter weight, shows raw architecture understanding without framework magic              |
| State management     | ComponentStore           | Full NgRx Store      | Right-sized for a single-feature app, less boilerplate (no actions/reducers/effects files) |
| Database             | SQLite + TypeORM         | PostgreSQL           | Zero-config, single-file DB, perfect for containerized demo. TypeORM provides production-like ORM patterns. |
| Module resolution    | NodeNext (ESM)           | CommonJS             | Modern Node.js standard, `.js` extensions on imports, future-proof                        |
| CSS approach         | CSS custom properties    | SCSS variables       | Browser-inspectable, runtime-changeable, no build step for token changes                  |
| Change detection     | OnPush on all components | Default              | Reduces unnecessary change detection cycles; works naturally with `async` pipe             |
| Store scope          | Component-level providers| Root-level singleton  | Isolated store per route avoids stale state; lifecycle tied to component                  |

---

## Docker Architecture

The application uses a multi-stage Docker build for both services:

- **Backend** (`backend/Dockerfile`): Stage 1 compiles TypeScript (`tsc`). Stage 2 installs production dependencies only (`npm ci --omit=dev`) -- this is required because `better-sqlite3` is a native module that must compile in the runtime image. Copies compiled JS and seed data.

- **Frontend** (`frontend/Dockerfile`): Stage 1 builds the Angular app (`ng build --configuration production`). Stage 2 uses `nginx:alpine` to serve the static build and reverse-proxy `/api` and `/api-docs` to the backend container.

- **docker-compose.yml** orchestrates both services on a shared `fleet-network` bridge network. A named volume (`backend-data`) persists the SQLite database across container restarts. The backend runs with `NODE_ENV=production`, which disables TypeORM's `synchronize` mode.
