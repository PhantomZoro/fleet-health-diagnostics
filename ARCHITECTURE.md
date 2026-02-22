# Fleet Health & Diagnostics Console — Architecture

## Overview

Monorepo, two services, one shared SQLite database:

```
fleet-health-diagnostics/
  backend/    Express 5 API server (TypeScript, TypeORM, SQLite)
  frontend/   Angular 19 SPA (standalone components, NgRx ComponentStore)
```

In Docker, nginx serves the Angular build and proxies `/api` requests to the backend container. In development, Angular CLI's proxy config (`proxy.conf.json`) forwards `/api` to `localhost:3000`.

---

## Backend

### Layer Structure

```
HTTP Request
    |
    v
  Routes          Parse request, validate with Zod, format response
    |
    v
  Services         Business logic, TypeORM queries, aggregation SQL
    |
    v
  Entities          TypeORM models with column indexes
    |
    v
  SQLite (better-sqlite3)
```

Routes don't contain query logic. Services don't touch `req`/`res`. Clean separation = testable business logic.

### Data Model

One entity — `DiagnosticEvent`:

| Column      | Type       | Indexed | Notes                                      |
| ----------- | ---------- | ------- | ------------------------------------------ |
| `id`        | integer    | PK      | Auto-generated                             |
| `timestamp` | datetime   | Yes     | When the event happened                    |
| `vehicleId` | varchar(10)| Yes     | e.g., `BMW-1003`                            |
| `level`     | varchar(5) | Yes     | `ERROR`, `WARN`, or `INFO`                 |
| `code`      | varchar(10)| Yes     | OBD-II code (e.g., `P0420`)               |
| `message`   | text       | No      | Human-readable description                 |

All four filterable columns are indexed for fast WHERE clause combos.

### API

| Method | Path                                   | What it does                                     | Query Params                                        |
| ------ | -------------------------------------- | ------------------------------------------------ | --------------------------------------------------- |
| GET    | `/api/events`                          | Paginated, filterable event list                 | `vehicleId`, `code`, `level`, `from`, `to`, `page`, `limit` |
| GET    | `/api/vehicles/:vehicleId/summary`     | Full vehicle profile with counts, codes, events  | None (vehicleId in path)                            |
| GET    | `/api/aggregations/errors-per-vehicle` | Error/warn/info counts by vehicle                | `from`, `to`                                        |
| GET    | `/api/aggregations/top-codes`          | Top 10 most frequent codes                       | `level`, `from`, `to`, `vehicleId`, `code`          |
| GET    | `/api/aggregations/critical-vehicles`  | Vehicles with 3+ ERRORs in trailing 24h          | None                                                |
| GET    | `/health`                              | Health check with event count                    | None                                                |
| GET    | `/api-docs`                            | Swagger UI                                       | None                                                |

### Validation

Query params go through Zod schemas in a `validateQuery` middleware (route params use `validateParams`). The flow:

1. Run `safeParse` against the route's Zod schema
2. Fail? Return 400 with structured error details
3. Pass? Store the parsed, type-coerced result in `res.locals.validated`

Route handlers just read from `res.locals` with full type safety — no raw string parsing.

### Case-Insensitive Filtering

All text filters (`vehicleId`, `code`, `level`) are case-insensitive. The backend uses `UPPER()` on both sides of the SQL comparison. For `level`, Zod also normalizes to uppercase via `.transform(v => v.toUpperCase())` before the enum check, so `error`, `Error`, and `ERROR` all work.

### Vehicle Summary Endpoint

`GET /api/vehicles/:vehicleId/summary` fires 4 queries in parallel with `Promise.all`:

1. Severity counts — `SUM(CASE WHEN level = 'X' THEN 1 ELSE 0 END)`
2. Time range — `MIN/MAX(timestamp)` for first/last seen
3. Top 10 codes — `GROUP BY code, level ORDER BY count DESC LIMIT 10`
4. Recent 10 events — `ORDER BY timestamp DESC LIMIT 10`

All scoped to the given vehicle. Returns 404 if no events exist.

### Seed Pipeline

On first startup, the backend parses `data/seed.log` (~493 entries across 26 vehicles with 8 fleet prefixes: BMW, MNI, RR, X5, I4, M3, IX, S7) through a regex-based parser, maps them to entities, and bulk-inserts in chunks of 100 (SQLite variable limit). A count guard prevents re-seeding on restarts. The regex supports flexible vehicle ID formats: `[A-Z][A-Z0-9]+-\d{4}`.

---

## Frontend

### Component Tree

```
AppComponent
  +-- <nav> sidebar (Dashboard, Vehicles, Events)
  +-- <router-outlet>
  |     +-- DashboardComponent (lazy)
  |     |     +-- FilterPanelComponent
  |     |     +-- ActiveFiltersBarComponent
  |     |     +-- LoadingSpinnerComponent
  |     |     +-- SeverityBadgeComponent
  |     |     +-- SeverityLegendComponent
  |     |     Sections: Filtered Results | Fleet Overview | Critical Vehicles
  |     |
  |     +-- FleetOverviewComponent (lazy)        [/vehicles]
  |     |     +-- VehicleCardComponent (x N)
  |     |     +-- LoadingSpinnerComponent
  |     |     Search bar with live autocomplete
  |     |
  |     +-- VehicleDetailComponent (lazy)        [/vehicles/:id]
  |     |     +-- SeverityBadgeComponent
  |     |     +-- LoadingSpinnerComponent
  |     |
  |     +-- EventsComponent (lazy)               [/events]
  |           +-- FilterPanelComponent
  |           +-- ActiveFiltersBarComponent
  |           +-- SeverityBadgeComponent
  |           +-- SeverityLegendComponent
  |           +-- PaginationComponent
  |           +-- LoadingSpinnerComponent
  |
  +-- ToastComponent (global)
```

### Smart vs Dumb Components

| Component                | Type  | How it gets data                                                 |
| ------------------------ | ----- | ---------------------------------------------------------------- |
| `DashboardComponent`     | Smart | Injects `DiagnosticsStore`, reads via `async` pipe               |
| `FleetOverviewComponent` | Smart | Injects `VehicleStore`, calls `loadFleetGrid()`                  |
| `VehicleDetailComponent` | Smart | Injects `VehicleStore`, reads route param, calls `loadVehicleDetail()` |
| `EventsComponent`        | Smart | Injects `DiagnosticsStore`, reads via `async` pipe               |
| `VehicleCardComponent`   | Dumb  | `@Input()` card data, `@Output()` click                         |
| `FilterPanelComponent`   | Dumb  | `@Input()` initial filters, `@Output()` apply/reset             |
| `ActiveFiltersBarComponent`| Dumb | `@Input()` filters, `@Output()` clearAll — shows filter chips   |
| `SeverityBadgeComponent` | Dumb  | `@Input()` level string, renders colored badge                   |
| `PaginationComponent`    | Dumb  | `@Input()` total/page/limit, `@Output()` page change            |
| `LoadingSpinnerComponent`| Dumb  | `@Input()` visibility flag                                       |
| `ToastComponent`         | Dumb  | Injects `NotificationService` (global singleton)                 |

Smart components own the store. Dumb components are reusable and testable in isolation — they only talk through inputs and outputs.

### Dashboard Sections

Three sections, each responding to different filters:

1. **Filtered Results** — Responds to all filters (vehicleId, code, level, date range). Shows total events, most common code (hidden when filtering by code), and top error codes.
2. **Fleet-Wide Overview** — Only date range filters apply here. Total vehicles, critical count, severity legend, errors-per-vehicle bar chart.
3. **Critical Vehicles** — Vehicles with 3+ critical events in the trailing 24h window.

### Vehicle Search

The Fleet Overview page has a live search bar. Filtering is client-side: a `BehaviorSubject` for the search term combines with the fleet cards observable via `combineLatest` to produce filtered results. Autocomplete shows up to 6 matches. Enter dismisses the dropdown, Escape closes it, clicking a suggestion navigates to that vehicle.

### Store Data Flow

```
User action (filter change, page click)
    |
    v
Smart Component --> Store.updater (setFilters, setPage)
                        |
                        v
                    combineLatest (filters + page)
                        |
                        v
                    debounceTime(300)
                        |
                        v
                    switchMap --> API service --> HTTP GET
                        |                           |
                        v                           v
                    catchError + EMPTY         JSON response
                    (set error state,               |
                     stream stays alive)            v
                        +-------- patchState <-- tap (update state)
                                      |
                                      v
                                Selector (distinctUntilChanged + shareReplay)
                                      |
                                      v
                                async pipe in template --> DOM update
```

Each smart component provides its store at the component level (`providers: [DiagnosticsStore]`), so every route gets its own store instance that dies when you navigate away. No stale state.

Two stores:
- **DiagnosticsStore** — Events, pagination, filters, dashboard aggregations. Used by Dashboard and Events.
- **VehicleStore** — Fleet grid and vehicle detail. `loadFleetGrid` combines errors-per-vehicle + critical-vehicles to compute health status. `loadVehicleDetail` calls the summary endpoint. Used by Fleet Overview and Vehicle Detail.

Health status logic: **CRITICAL** = appears in critical-vehicles list (grid) or has errorCount >= 3 (detail). **WARNING** = has errors but not critical. **HEALTHY** = zero errors.

### RxJS Operator Choices

| Operator               | Where                       | Why, and what would go wrong otherwise                                                           |
| ---------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `switchMap`            | `loadEventsEffect`          | Cancels in-flight request when new filters arrive. `mergeMap` would let stale responses overwrite newer ones. |
| `debounceTime(300)`    | Filter-to-API pipeline      | Stops an API call per keystroke. 300ms feels instant but batches rapid changes.                    |
| `combineLatest`        | Filters + page merge        | Both filter and page changes should trigger a fetch. `withLatestFrom` would miss one of them.     |
| `distinctUntilChanged` | All selectors               | Skips re-renders when a state slice hasn't actually changed.                                      |
| `shareReplay(1)`       | All selectors               | Late subscribers (like an `async` pipe behind `*ngIf`) get the last value instead of missing it.  |
| `catchError` + `EMPTY` | Inside inner `switchMap`    | Catches HTTP errors without killing the outer stream. An outer `catchError` would permanently break the effect. |
| `takeUntilDestroyed`   | Component subscriptions     | Auto-unsubscribe on destroy. Replaces the old `ngOnDestroy` + Subject dance.                     |
| `take(1)`              | `ActivatedRoute.queryParams`| One-shot read of initial query params. Prevents a leak from the never-completing observable.       |

### Error Handling

A functional HTTP interceptor (`httpErrorInterceptor`) catches failed API responses, extracts a useful message, logs it, and re-throws so the store's inner `catchError` can set error state. A global `NotificationService` + `ToastComponent` shows errors to the user.

---

## Trade-offs

| Decision             | Chose                    | Over                 | Why                                                                                       |
| -------------------- | ------------------------ | -------------------- | ----------------------------------------------------------------------------------------- |
| Backend framework    | Express 5               | NestJS               | Lighter. Shows architecture understanding without hiding it behind decorators.             |
| State management     | ComponentStore           | Full NgRx Store      | Right-sized for a single-feature app. Way less boilerplate.                               |
| Database             | SQLite + TypeORM         | PostgreSQL           | Zero config, single file, perfect for a containerized demo. TypeORM still gives you real ORM patterns. |
| Module resolution    | NodeNext (ESM)           | CommonJS             | Modern Node standard. `.js` extensions on imports, future-proof.                          |
| CSS approach         | CSS custom properties    | SCSS variables       | Inspectable in DevTools, changeable at runtime, no rebuild for token changes.             |
| Change detection     | OnPush everywhere        | Default              | Fewer unnecessary re-renders. Works naturally with `async` pipe.                          |
| Store scope          | Component-level          | Root singleton        | Fresh store per route. No stale state when navigating.                                    |

---

## Docker Setup

Multi-stage builds for both services:

- **Backend** (`backend/Dockerfile`): Stage 1 compiles TypeScript. Stage 2 installs production deps only (`npm ci --omit=dev`) — needed because `better-sqlite3` is a native module that must compile in the runtime image. Copies compiled JS and seed data.

- **Frontend** (`frontend/Dockerfile`): Stage 1 builds Angular (`ng build --configuration production`). Stage 2 uses `nginx:alpine` to serve the static build and proxy `/api` + `/api-docs` to the backend.

- **docker-compose.yml** ties them together on a shared `fleet-network` bridge. A named volume (`backend-data`) keeps the SQLite DB across restarts. Backend runs with `NODE_ENV=production` (disables TypeORM's `synchronize`).
