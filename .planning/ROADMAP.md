# Roadmap

Backend first (frontend depends on running APIs), then frontend state before views (views consume store), Docker + docs last (validates everything works together).

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
│   │   ├── seed/              # seed runner
│   │   ├── types/             # shared TypeScript interfaces
│   │   └── index.ts           # entry point
│   ├── data/                  # seed log file + SQLite DB
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/app/
│   │   ├── core/              # API service, interceptors, models
│   │   ├── features/
│   │   │   ├── events/        # raw events table view
│   │   │   └── dashboard/     # aggregated summary view
│   │   ├── shared/            # reusable components (filter panel, badge, etc.)
│   │   └── store/             # NgRx ComponentStore
│   ├── package.json
│   └── Dockerfile
├── docs/
│   ├── REQUIREMENTS.md
│   └── ARCHITECTURE.md
├── docker-compose.yml
└── README.md
```

---

## Phase 1: Backend Data Layer

**Goal**: Diagnostic events exist in a queryable SQLite database, populated from realistic log data on first startup.

**Requirements satisfied:**
- DATA-01: Parse structured log files into typed model
- DATA-02: Seed ~500 realistic events across 15-20 vehicles on first startup
- DATA-03: Store in SQLite via TypeORM with indexes

**Plans:** 1/2 plans executed

Plans:
- [ ] 01-01-PLAN.md — Scaffold backend project, TypeORM entity, and database config
- [ ] 01-02-PLAN.md — Log parser, seed data, seed runner, and health endpoint

**Phase 1 Success Criteria:**
1. `GET /health` returns `{ status: "ok", events: N }` where N ~ 500
2. SQLite file exists with correct fields (timestamp, vehicleId, level, code, message)
3. Events span 15-20 vehicles, real OBD-II codes, all three severity levels
4. Server restart does not duplicate events

---

## Phase 2: Backend API Layer

**Goal**: Full REST API with combinable filters, aggregations, validation, and Swagger docs.

**Requirements satisfied:**
- API-01: GET /api/events with combinable filters + pagination
- API-02: Errors per vehicle aggregation
- API-03: Top error codes aggregation
- API-04: Critical vehicles aggregation
- API-05: Input validation with 400 responses
- API-06: Swagger at /api-docs

**Plans:** 2 plans

Plans:
- [ ] 02-01-PLAN.md — Events query endpoint with validation middleware and error handling
- [ ] 02-02-PLAN.md — Aggregation endpoints and Swagger documentation

**Phase 2 Success Criteria:**
1. `GET /api/events?vehicleId=X&level=ERROR&from=...&to=...` returns only matching events with pagination envelope
2. `GET /api/aggregations/critical-vehicles` returns vehicles with 3+ ERRORs in last 24h
3. Invalid params (bad level, non-ISO date, negative page) return 400 with readable message
4. Swagger UI loads at `/api-docs` and documents all endpoints
5. All aggregation endpoints return data consistent with seeded DB

---

## Phase 3: Frontend Foundation

**Goal**: Angular app runs, proxies to backend, ComponentStore manages all state with required RxJS patterns.

**Requirements satisfied:**
- STATE-01: ComponentStore manages filters, events, aggregations, loading, error as observables
- STATE-02: Filter changes debounced (debounceTime 300ms)
- STATE-03: In-flight requests cancelled on new filter (switchMap)
- STATE-04: Filters + page combined into single API call (combineLatest)
- STATE-05: Selectors use shareReplay + distinctUntilChanged

**Plans:** 3/3 plans complete

Plans:
- [x] 03-01-PLAN.md — Angular project scaffold, app shell, routing, and global styles
- [ ] 03-02-PLAN.md — Shared TypeScript models and DiagnosticsApiService
- [ ] 03-03-PLAN.md — DiagnosticsStore with full RxJS pattern demonstration

### Plan 03-01: Angular Project Scaffold

New Angular 19 project with routing and proxy.

- `ng new frontend --standalone --style=scss --routing --skip-tests`
- `frontend/proxy.conf.json` — proxy `/api/*` to `http://localhost:3000`
- Update `angular.json` to use proxy config in `serve` target
- Install `@ngrx/component-store@^19.0.0` (NOT `latest` — that's Angular 21 aligned)
- Two route stubs: `/events` and `/dashboard`, redirect `/` to `/dashboard`
- App shell: `<nav>` sidebar with route links + `<main>` with `<router-outlet>`

### Plan 03-02: Shared Models + API Service

TypeScript interfaces and HttpClient wrappers.

- `frontend/src/app/core/models/`:
  - `diagnostic-event.model.ts` — DiagnosticEvent interface
  - `event-filters.model.ts` — EventFilters interface (vehicleId?, code?, level?, from?, to?)
  - `paginated-response.model.ts` — `{ data: T[], total, page, limit }`
  - `aggregation.model.ts` — interfaces for each aggregation response
- `frontend/src/app/core/services/diagnostics-api.service.ts`:
  - `getEvents(filters, page, limit): Observable<PaginatedResponse<DiagnosticEvent>>`
  - `getErrorsPerVehicle(from?, to?): Observable<ErrorsPerVehicle[]>`
  - `getTopCodes(level?, from?, to?): Observable<TopCode[]>`
  - `getCriticalVehicles(): Observable<CriticalVehicle[]>`
  - Build query params from filters, skip undefined values

### Plan 03-03: DiagnosticsStore

NgRx ComponentStore with full RxJS pattern demonstration.

- `frontend/src/app/store/diagnostics.store.ts`:
  - **State:** `{ filters: EventFilters, events: DiagnosticEvent[], total: number, page: number, limit: number, aggregations: {...}, loading: boolean, error: string | null }`
  - **Updaters:** `setFilters(filters)`, `setPage(page)`, `resetFilters()`
  - **Selectors:** `events$`, `filters$`, `loading$`, `error$`, `total$`, `aggregations$` — all with `distinctUntilChanged()` + `shareReplay(1)`
  - **Effects:**
    - `loadEvents` — triggered by `combineLatest([filters$, page$]).pipe(debounceTime(300), switchMap(([filters, page]) => api.getEvents(filters, page)))` — uses `tapResponse` for success/error (NOT outer catchError)
    - `loadAggregations` — triggered by filter changes, similar pattern
  - **Key patterns to demonstrate:** debounceTime, switchMap (cancel in-flight), combineLatest (merge dimensions), tapResponse (error recovery), takeUntilDestroyed (cleanup)

### Plan 03-04: App Shell + Routing

Navigation and layout.

- App component with sidebar `<nav>` (Dashboard link, Events link) + `<main>` content
- Route config: `/dashboard` (default), `/events`
- Global SCSS: CSS custom properties for colors (BMW-inspired: `--primary: #1C69D4`, `--error: #D32F2F`, `--warn: #F57C00`, `--info: #1976D2`)
- Basic responsive: sidebar collapses on mobile

**Phase 3 Success Criteria:**
1. Angular dev server at localhost:4200, `/api/*` proxied to backend
2. Network tab shows API calls fire 300ms after last filter change, not per keystroke
3. Rapid filter changes show only one in-flight request (previous cancelled)
4. Store exposes `events$`, `aggregations$`, `loading$`, `error$`, `filters$`

---

## Phase 4: Frontend Views

**Goal**: Operations engineers can search, filter, browse events, and view aggregated diagnostics with loading states and severity coloring.

**Requirements satisfied:**
- VIEW-01: Filter panel with vehicle ID, error code, severity, time range
- VIEW-02: Events table with pagination
- VIEW-03: Severity badges (red/orange/blue)
- VIEW-04: Dashboard with summary cards, aggregation lists, critical vehicles
- VIEW-05: Loading + empty states

**Plans:** 3/4 plans executed

Plans:
- [ ] 04-01-PLAN.md — Shared UI components (FilterPanel, SeverityBadge, Pagination, LoadingSpinner)
- [ ] 04-02-PLAN.md — Events view with table, filters, pagination, and states
- [ ] 04-03-PLAN.md — Dashboard view with summary cards, aggregation lists, and critical vehicle navigation
- [ ] 04-04-PLAN.md — HTTP error interceptor, toast notifications, and polish audit

**Phase 4 Success Criteria:**
1. Filter panel triggers debounced API calls visible in network tab
2. Events table shows severity badges (red/orange/blue), pagination works
3. Dashboard shows summary cards + aggregation lists from real API data
4. Clicking critical vehicle navigates to events view with vehicle ID pre-filled
5. Loading indicator while fetching, empty state when no results

---

## Phase 5: Integration & Delivery

**Goal**: Runs from `docker-compose up`, fully documented for BMW reviewer, clean senior-level submission.

**Requirements satisfied:**
- DOC-01: Requirements document with assumptions
- DOC-02: Architecture/concept document
- DOC-03: README with setup instructions
- DOC-04: Docker containerization

### Plan 05-01: Docker

Containerize both services.

- `backend/Dockerfile` — multi-stage: build TS with tsc → run with Node 20 alpine
- `frontend/Dockerfile` — multi-stage: `ng build --configuration production` → serve with nginx:alpine
- `frontend/nginx.conf` — serve static files, `proxy_pass /api` to backend container
- `docker-compose.yml` — both services, backend port 3000, frontend port 4200, shared network

### Plan 05-02: Documentation

Three deliverable documents.

- `docs/REQUIREMENTS.md`:
  - Business requirements (5-8 items derived from scenario)
  - Assumptions (log format, critical definition, pagination defaults, seed data approach)
  - Out of scope with reasoning
- `docs/ARCHITECTURE.md`:
  - Backend concept: layered architecture diagram, TypeORM + SQLite, API design, data model
  - Frontend concept: component tree, NgRx ComponentStore data flow, RxJS operator choices with explicit rationale (switchMap vs mergeMap, debounceTime, tapResponse vs catchError)
  - Key trade-offs (Express vs NestJS, ComponentStore vs Store)
- `README.md`:
  - Project overview (1 paragraph)
  - Prerequisites (Node 20+, npm 10+, optionally Docker)
  - Quick start: manual dev setup
  - Docker start: `docker-compose up`
  - What works + what I'd add with more time

### Plan 05-03: Final Polish

End-to-end smoke test and cleanup.

- Start both services, verify full flow works
- Test all filter combinations and edge cases
- Remove debug code, console.logs, TODO comments
- Consistent code formatting
- Verify git history tells a clean story

**Phase 5 Success Criteria:**
1. `docker-compose up` from clean clone → app accessible at localhost:4200 with data
2. REQUIREMENTS.md reads as business-facing spec with assumptions
3. ARCHITECTURE.md explains backend + frontend + RxJS operator rationale
4. README allows reviewer to run from scratch with no prior context

---

## Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 1. Backend Data Layer | Complete | 2 plans |
| 2. Backend API Layer | Complete | 2 plans |
| 3. Frontend Foundation | Complete | 3 plans |
| 4. Frontend Views | 3/4 | In Progress|  | 5. Integration & Delivery | Not started | 0/3 plans |
