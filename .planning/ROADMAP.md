# Roadmap: Connected Fleet Health & Diagnostics Console

## Overview

This project builds a fleet diagnostics console for operations engineers in five sequential phases. The backend data layer comes first because the Angular ComponentStore effects have a hard dependency on running API endpoints — nothing can be integrated until there is data to query. From there, the REST API surface is completed in full before any frontend work begins, eliminating integration surprises mid-build. The frontend is built in two stages: state and services first (the dependency), then views second (the consumer). Docker and documentation close the project, validated only after the application logic is confirmed working.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Backend Data Layer** - Parse, store, and seed diagnostic events into SQLite
- [ ] **Phase 2: Backend API Layer** - Full query and aggregation API with validation, error handling, and Swagger
- [ ] **Phase 3: Frontend Foundation** - Angular scaffold, shared models, API service, and ComponentStore
- [ ] **Phase 4: Frontend Views** - Events table and aggregated dashboard wired to reactive state
- [ ] **Phase 5: Integration and Delivery** - Docker containerization, documentation, and submission polish

## Phase Details

### Phase 1: Backend Data Layer
**Goal**: Operations engineers' diagnostic events exist in a queryable SQLite database, populated from realistic log data on first startup
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. `GET /health` returns `{ status: "ok", events: N }` where N is approximately 500
  2. The SQLite database file exists on disk and contains events with correct fields (timestamp, vehicleId, level, code, message)
  3. Events span 15-20 distinct vehicle IDs, real OBD-II codes, and all three severity levels (ERROR/WARN/INFO)
  4. Restarting the server does not duplicate events (count guard is working)
**Plans**: TBD

Plans:
- [ ] 01-01: Project scaffolding — monorepo skeleton, backend package.json, tsconfig, entry point
- [ ] 01-02: DiagnosticEvent entity, TypeORM DataSource, SQLite config with WAL mode and indexes
- [ ] 01-03: LogParser (regex-based) + seed log file with ~500 realistic OBD-II events
- [ ] 01-04: SeedRunner with count guard, startup wiring, /health endpoint

### Phase 2: Backend API Layer
**Goal**: The full REST API surface is queryable with combinable filters, returns correct aggregations, validates inputs, and is self-documented at /api-docs
**Depends on**: Phase 1
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06
**Success Criteria** (what must be TRUE):
  1. `GET /api/events?vehicleId=X&level=ERROR&from=...&to=...` returns only matching events with correct pagination envelope
  2. `GET /api/aggregations/critical-vehicles` returns only vehicles with 3+ ERROR events in the last 24 hours relative to current runtime
  3. Invalid query params (bad level value, non-ISO date, negative page) return HTTP 400 with a readable error message
  4. The Swagger UI loads at `/api-docs` and documents all endpoints with params and response schemas
  5. All four aggregation endpoints return data consistent with the seeded database contents
**Plans**: TBD

Plans:
- [ ] 02-01: GET /api/events with QueryBuilder, combinable filters, pagination
- [ ] 02-02: Aggregation endpoints (errors-per-vehicle, top-codes, critical-vehicles)
- [ ] 02-03: Zod validation middleware, global error handler, 404 handler
- [ ] 02-04: Swagger/OpenAPI docs with swagger-jsdoc + swagger-ui-express v5

### Phase 3: Frontend Foundation
**Goal**: The Angular application runs, proxies to the backend, and the DiagnosticsStore manages all state using the required RxJS patterns — demonstrating debounce, switchMap cancellation, and combineLatest
**Depends on**: Phase 2
**Requirements**: STATE-01, STATE-02, STATE-03, STATE-04, STATE-05
**Success Criteria** (what must be TRUE):
  1. The Angular dev server runs at localhost:4200 and `/api/*` requests are correctly proxied to the backend
  2. Browser network tab shows API calls fire 300ms after the last filter change, not on every keystroke
  3. Rapidly changing filters shows only one in-flight request at a time — previous requests are visibly cancelled (XHR abort in network tab)
  4. The DiagnosticsStore exposes `events$`, `aggregations$`, `loading$`, `error$`, and `filters$` observables that components can subscribe to
**Plans**: TBD

Plans:
- [ ] 03-01: Angular project scaffold, proxy config, NgRx ComponentStore install, routing skeleton
- [ ] 03-02: Shared TypeScript models (DiagnosticEvent, EventFilters, PaginatedResponse, AggregationResult)
- [ ] 03-03: DiagnosticsApiService — HttpClient wrappers returning Observable<T> for all endpoints
- [ ] 03-04: DiagnosticsStore — state shape, updaters, effects with debounceTime + switchMap + combineLatest + tapResponse

### Phase 4: Frontend Views
**Goal**: Operations engineers can search, filter, browse raw events, and view aggregated diagnostics — all with correct loading states, severity color coding, and reactive updates
**Depends on**: Phase 3
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05
**Success Criteria** (what must be TRUE):
  1. The filter panel accepts vehicle ID, error code, severity, and date range inputs and triggers debounced API calls visible in the network tab
  2. The events table shows timestamp, vehicle, severity badge (red/orange/blue), code, and message — with working pagination
  3. The dashboard shows summary cards, errors-per-vehicle list, top error codes, and critical vehicles — all driven from aggregation endpoints
  4. Clicking a critical vehicle on the dashboard navigates to the events view with that vehicle's ID pre-filled in the filter
  5. A loading indicator appears while any fetch is in flight; an empty state message appears when filters return no results
**Plans**: TBD

Plans:
- [ ] 04-01: Shared components — FilterPanel, SeverityBadge, PaginationControls, LoadingSpinner
- [ ] 04-02: EventsComponent — events table wired to store, severity badges, pagination, loading/empty states
- [ ] 04-03: DashboardComponent — summary cards, aggregation lists, critical vehicles with click-to-filter nav
- [ ] 04-04: HttpErrorInterceptor, error toast notifications, OnPush change detection audit

### Phase 5: Integration and Delivery
**Goal**: The entire application runs from a single `docker-compose up`, is fully documented for the BMW reviewer, and is clean enough to represent senior-level work
**Depends on**: Phase 4
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04
**Success Criteria** (what must be TRUE):
  1. `docker-compose up` from a clean clone starts both services and the app is accessible at localhost:4200 with data loaded
  2. The REQUIREMENTS.md document reads as a business-facing spec with assumptions and out-of-scope items clearly stated
  3. The ARCHITECTURE.md explains the backend layered architecture, NgRx ComponentStore data flow, and explicitly justifies RxJS operator choices (switchMap vs mergeMap, debounceTime, tapResponse)
  4. The README.md allows a reviewer to run the project from scratch with no prior context
**Plans**: TBD

Plans:
- [ ] 05-01: Backend Dockerfile (multi-stage, Node 20 LTS) + frontend Dockerfile (multi-stage, nginx:alpine)
- [ ] 05-02: docker-compose.yml with shared network, nginx proxy_pass to backend container
- [ ] 05-03: REQUIREMENTS.md (business requirements, assumptions, out of scope)
- [ ] 05-04: ARCHITECTURE.md (backend concept, frontend concept, RxJS pattern rationale)
- [ ] 05-05: README.md (overview, prerequisites, quick start, docker start)
- [ ] 05-06: End-to-end smoke test, debug cleanup, code formatting pass

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Data Layer | 0/4 | Not started | - |
| 2. Backend API Layer | 0/4 | Not started | - |
| 3. Frontend Foundation | 0/4 | Not started | - |
| 4. Frontend Views | 0/4 | Not started | - |
| 5. Integration and Delivery | 0/6 | Not started | - |
