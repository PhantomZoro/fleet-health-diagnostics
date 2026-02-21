# Feature Tracker

## Phase 1: Backend Data Layer
> Diagnostic events exist in a queryable SQLite database, populated from realistic log data on first startup.

- [x] **01-01 Project Scaffolding** — Monorepo skeleton with working Express 5 server, TypeScript strict mode, tsx dev runner
- [x] **01-02 Entity + Database Config** — TypeORM DiagnosticEvent entity with indexed fields, SQLite DataSource with WAL mode
- [x] **01-03 Log Parser + Seed Data** — Regex parser for structured log format, ~500 realistic events across 15-20 vehicles with OBD-II codes
- [x] **01-04 Seed Runner + Health Endpoint** — Startup seeder with duplicate protection, `GET /health` returns event count

## Phase 2: Backend API Layer
> Full REST API with combinable filters, aggregations, validation, and Swagger docs.

- [x] **02-01 Events Query Endpoint** — `GET /api/events` with dynamic filtering (vehicleId, code, level, date range) + pagination + Zod validation + error handling
- [x] **02-02 Aggregation Endpoints + Swagger** — Three aggregation endpoints + OpenAPI docs at `/api-docs` with JSDoc annotations

## Phase 3: Frontend Foundation
> Angular app runs, proxies to backend, ComponentStore manages all state with required RxJS patterns.

- [x] **03-01 Angular Project Scaffold** — Angular 19 standalone, SCSS, proxy config, route stubs
- [x] **03-02 Shared Models + API Service** — TypeScript interfaces, HttpClient wrappers for all endpoints
- [x] **03-03 DiagnosticsStore** — NgRx ComponentStore with debounceTime, switchMap, combineLatest, tapResponse, takeUntilDestroyed
- [x] **03-04 App Shell + Routing** — Sidebar navigation, BMW-inspired CSS custom properties, responsive layout *(completed as part of 03-01)*

## Phase 4: Frontend Views
> Operations engineers can search, filter, browse events, and view aggregated diagnostics.

- [x] **04-01 Shared UI Components** — FilterPanel, SeverityBadge, Pagination, LoadingSpinner (all OnPush, dumb components)
- [x] **04-02 Events View** — Smart component with events table, filter panel, pagination, loading/empty states
- [x] **04-03 Dashboard View** — Summary cards, errors-per-vehicle bars, top codes list, critical vehicles with navigation
- [x] **04-04 Error Handling + Polish** — HTTP interceptor, toast notifications, semantic HTML audit, keyboard nav

## Phase 5: Integration & Delivery
> Runs from `docker-compose up`, fully documented for BMW reviewer.

- [x] **05-01 Docker** — Multi-stage Dockerfiles (backend + frontend), nginx proxy, docker-compose
- [x] **05-02 Documentation** — REQUIREMENTS.md, ARCHITECTURE.md, README.md
- [ ] **05-03 Final Polish** — End-to-end smoke test, cleanup, formatting, git history review

---

## Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 1. Backend Data Layer | Complete | 4/4 |
| 2. Backend API Layer | Complete | 2/2 |
| 3. Frontend Foundation | Complete | 4/4 |
| 4. Frontend Views | Complete | 4/4 |
| 5. Integration & Delivery | In progress | 2/3 |

**Overall: 16/17 plans complete**

---
*Last updated: 2026-02-21 (05-02)*
