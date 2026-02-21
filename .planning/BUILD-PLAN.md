# Connected Fleet Health & Diagnostics Console — Build Plan

## Context

BMW senior fullstack developer assignment. Build a fleet diagnostics console where operations engineers monitor vehicle health, search diagnostic events, and explore error patterns. Greenfield project — no existing code.

**Tech decisions locked:**
- Backend: Express.js + TypeScript
- Database: SQLite + TypeORM
- Frontend: Angular 17+ (standalone components)
- State: NgRx ComponentStore + RxJS
- Docker: Yes (docker-compose)

---

## Monorepo Structure

```
fleet-health-diagnostics/
├── backend/
│   ├── src/
│   │   ├── config/            # database, app config
│   │   ├── entities/          # TypeORM entities
│   │   ├── middleware/        # error handler, validation
│   │   ├── routes/            # Express routers
│   │   ├── services/          # business logic layer
│   │   ├── parser/            # log file parser
│   │   ├── seed/              # realistic data generator
│   │   ├── types/             # shared TypeScript interfaces
│   │   └── index.ts           # entry point + server setup
│   ├── data/                  # sample log files
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/app/
│   │   ├── core/              # API service, interceptors, models
│   │   ├── features/
│   │   │   ├── events/        # raw events table view
│   │   │   └── dashboard/     # aggregated summary view
│   │   ├── shared/            # reusable components (filter panel, severity badge, etc.)
│   │   └── store/             # NgRx ComponentStore for diagnostics
│   ├── package.json
│   └── Dockerfile
├── docs/
│   ├── REQUIREMENTS.md
│   └── ARCHITECTURE.md
├── docker-compose.yml
└── README.md
```

---

## Phase 1: Project Scaffolding & Data Layer

**Goal:** Working backend that can parse, store, and seed diagnostic events.

### Tasks:

1. **Initialize git repo + monorepo skeleton**
   - `git init`, `.gitignore`, root `README.md` (placeholder)
   - Create `backend/` and `frontend/` directories

2. **Backend project setup**
   - `package.json` with Express, TypeORM, SQLite3, TypeScript, ts-node-dev
   - `tsconfig.json` with strict mode
   - Entry point (`src/index.ts`) with basic Express server + CORS

3. **Define DiagnosticEvent entity**
   - TypeORM entity: `id`, `timestamp`, `vehicleId`, `level` (ERROR/WARN/INFO), `code`, `message`
   - Proper column types, indexes on `vehicleId`, `code`, `level`, `timestamp`

4. **Build log parser**
   - Regex-based parser for format: `[timestamp] [VEHICLE_ID:xxx] [LEVEL] [CODE:xxx] [message]`
   - Returns typed `DiagnosticEvent[]`
   - Handle malformed lines gracefully (skip + log warning)

5. **Create seed data generator**
   - Generate ~500 realistic events across 15-20 vehicles
   - Use real OBD-II codes (P0300, U0420, P0171, etc.) and BMW-relevant messages
   - Distribute across severity levels: ~15% ERROR, ~30% WARN, ~55% INFO
   - Spread over a 7-day time window
   - Output as structured log file in `backend/data/`

6. **Database connection + seeding on startup**
   - TypeORM DataSource config pointing to `data/fleet.db`
   - On startup: if DB empty, parse seed log file and insert events
   - Verify with a simple `GET /health` endpoint

### Verify:
- `npm run dev` starts server on port 3000
- `GET /health` returns `{ status: "ok", events: <count> }`
- SQLite file created with ~500 events

---

## Phase 2: Backend API Layer

**Goal:** Full query + aggregation API with validation, error handling, and Swagger docs.

### Tasks:

7. **Events query endpoint — `GET /api/events`**
   - Query params: `vehicleId`, `code`, `level`, `from`, `to`, `page`, `limit`
   - All filters optional, combinable
   - TypeORM QueryBuilder for dynamic WHERE clauses
   - Return: `{ data: Event[], total: number, page: number, limit: number }`

8. **Aggregation endpoints**
   - `GET /api/aggregations/errors-per-vehicle` — count of ERROR/WARN events grouped by vehicleId, filterable by time range
   - `GET /api/aggregations/top-codes` — most frequent error codes with count, filterable by level and time range
   - `GET /api/aggregations/critical-vehicles` — vehicles with 3+ ERROR events in the last 24h (document this definition)

9. **Input validation**
   - Validate query params: `level` must be ERROR|WARN|INFO, dates must be valid ISO strings, `page`/`limit` must be positive integers
   - Return 400 with clear error messages for invalid params
   - Use a lightweight validation approach (zod or manual)

10. **Error handling middleware**
    - Global error handler: catch-all for unhandled errors
    - Structured error responses: `{ error: string, details?: any, statusCode: number }`
    - 404 handler for unknown routes

11. **Swagger/OpenAPI documentation**
    - Use `swagger-jsdoc` + `swagger-ui-express`
    - Document all endpoints with param descriptions, response schemas, example values
    - Serve at `GET /api-docs`

### Verify:
- All filter combinations work: `?vehicleId=1234`, `?code=P0300&level=WARN`, `?from=...&to=...`
- Pagination works: `?page=2&limit=10`
- Aggregation endpoints return correct grouped data
- Invalid params return 400 with helpful messages
- Swagger UI loads at `/api-docs`

---

## Phase 3: Angular Frontend Foundation

**Goal:** Angular app with API service, store, and basic routing.

### Tasks:

12. **Angular project setup**
    - `ng new frontend --standalone --style=scss --routing`
    - Angular 17+ with standalone components
    - Configure proxy to backend (`proxy.conf.json` for dev)
    - Install `@ngrx/component-store`

13. **Core models + API service**
    - TypeScript interfaces: `DiagnosticEvent`, `EventFilters`, `PaginatedResponse`, `AggregationResult`
    - `DiagnosticsApiService` — HttpClient methods for all backend endpoints
    - Return `Observable<T>` from all methods

14. **NgRx ComponentStore — `DiagnosticsStore`**
    - State shape: `{ filters, events, total, page, aggregations, loading, error }`
    - Updaters: `setFilters()`, `setPage()`, `resetFilters()`
    - Effects: `loadEvents` (triggered by filter/page changes), `loadAggregations`
    - Selectors: `events$`, `filters$`, `loading$`, `error$`, `aggregations$`, `total$`
    - Key RxJS patterns:
      - `debounceTime(300)` on filter changes
      - `switchMap` for API calls (cancel in-flight on new filter)
      - `combineLatest` to merge filters + page into single API call
      - `shareReplay(1)` on selectors
      - `catchError` with error state recovery
      - `distinctUntilChanged` to prevent redundant API calls

15. **App shell + routing**
    - Two routes: `/events` (raw events table), `/dashboard` (aggregated view)
    - App layout: sidebar nav + main content area
    - Minimal global styles (CSS variables for theming)

### Verify:
- App runs on `localhost:4200`
- Proxy forwards `/api/*` to backend
- Store initializes and loads data on app start
- Console shows API calls being made

---

## Phase 4: Frontend Views & Features

**Goal:** Two complete views — events table + dashboard — with filter panel and reactive state.

### Tasks:

16. **Shared filter panel component**
    - Vehicle ID input (text, supports comma-separated for multiple)
    - Error code input
    - Severity dropdown (multi-select: ERROR, WARN, INFO)
    - Date range picker (from/to)
    - "Apply" button + "Reset" link
    - Emits filter changes to store
    - Reusable across both views

17. **Events table view (`/events`)**
    - Data table: timestamp, vehicle ID, severity, code, message
    - Severity column with color-coded badges (red/orange/blue)
    - Sortable columns (client-side is fine)
    - Pagination controls (page size selector + prev/next)
    - Shows total result count
    - Loading skeleton while fetching
    - Empty state when no results

18. **Dashboard summary view (`/dashboard`)**
    - Top row: summary cards (total events, total vehicles, critical vehicles count, most common code)
    - Errors per vehicle — horizontal bar list or simple chart
    - Top error codes — ranked list with counts and severity breakdown
    - Critical vehicles section — list of vehicles with high error rates, click to filter events view
    - All data driven from aggregation endpoints

19. **Loading/error states**
    - HTTP interceptor for global error handling
    - Toast/notification for API errors
    - Loading spinner overlay on data areas
    - Retry capability on failure

20. **Responsive layout + accessibility**
    - CSS Grid/Flexbox layout that works on desktop and tablet
    - Semantic HTML (`<main>`, `<nav>`, `<table>`, `<section>`)
    - ARIA labels on interactive elements
    - Keyboard navigation for filter panel and table

### Verify:
- Filter changes trigger debounced API calls
- Rapid filter changes cancel previous requests (switchMap working)
- Pagination works correctly
- Dashboard cards show accurate aggregated data
- Layout doesn't break at 768px width
- Tab through filter panel works

---

## Phase 5: Integration, Docker & Documentation

**Goal:** Everything runs together, is containerized, and fully documented for submission.

### Tasks:

21. **End-to-end smoke test**
    - Start backend, verify seed data loaded
    - Start frontend, verify data displays
    - Test all filter combinations
    - Test aggregation views
    - Fix any integration issues

22. **Docker setup**
    - `backend/Dockerfile` — multi-stage build (build TS -> run compiled JS)
    - `frontend/Dockerfile` — multi-stage build (ng build -> nginx serve)
    - `docker-compose.yml` — both services, port mapping, shared network
    - Frontend nginx config to proxy API calls to backend container

23. **REQUIREMENTS.md**
    - Business requirements derived from the scenario (5-8 items)
    - Assumptions made (data format, "critical" definition, pagination defaults, etc.)
    - Out of scope / what I'd add with more time

24. **ARCHITECTURE.md**
    - Backend concept: Express layered architecture, TypeORM + SQLite, API design decisions, data model diagram
    - Frontend concept: Component architecture, NgRx ComponentStore data flow, RxJS patterns used and why, view descriptions
    - Key trade-off explanations (why Express over NestJS, why ComponentStore over full NgRx, etc.)

25. **README.md**
    - Project overview (1 paragraph)
    - Prerequisites (Node 18+, npm, optionally Docker)
    - Quick start: `npm install && npm run dev` for both
    - Docker start: `docker-compose up`
    - What works, what I'd do next
    - Screenshot of the running app (take one at the end)

26. **Final cleanup + git history**
    - Clean up any debug code
    - Ensure consistent code formatting
    - Make sure git history tells a clean story (one feature per commit)

### Verify:
- `docker-compose up` starts both services and app is accessible
- README instructions work from a clean clone
- Swagger docs accessible
- All documentation reads naturally and explains reasoning
- No leftover TODO comments or debug logs

---

## Execution Order Summary

| Phase | Focus | Depends On |
|-------|-------|------------|
| 1 | Backend scaffolding + data layer | Nothing |
| 2 | REST API + validation + Swagger | Phase 1 |
| 3 | Angular app + store + services | Phase 1 (needs running API) |
| 4 | Frontend views + features | Phase 3 |
| 5 | Docker + docs + polish | Phase 4 |

**Total tasks: 26** across 5 phases. Each task is atomic and committable.

---

## Interview Preparation Notes

After each phase, update `docs/BUILD_LOG.md` with:
- What was built and why
- Key decisions made during implementation
- Any tricky parts and how they were solved
- RxJS patterns used and why (this is what they'll grill you on)
