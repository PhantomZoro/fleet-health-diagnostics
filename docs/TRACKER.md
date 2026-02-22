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
- [x] **05-03 Final Polish** — End-to-end smoke test, cleanup, formatting, git history review

## Phase 6: Vehicle Features
> Fleet overview grid and vehicle detail pages with dedicated health profiles and drill-down navigation.

- [x] **06-01 Vehicle Detail + Fleet Grid** — Backend vehicle summary endpoint, VehicleStore, fleet overview grid with health cards, vehicle detail page with stats/codes/events, navigation updates across all views

## Phase 7: UI/UX Polish & Filter Improvements
> Professional-grade UX: filter transparency, case-insensitive search, active filter context, dashboard section grouping, vehicle search with autocomplete, diverse seed data.

- [x] **07-01 UI Structure & Filter Transparency** — ActiveFiltersBarComponent, dashboard section grouping (Filtered Results / Fleet-Wide / Critical), section dividers, filter panel active state indicator, toast notifications on filter apply/reset
- [x] **07-02 Vehicle Search Bar** — Live search with autocomplete dropdown, BehaviorSubject + combineLatest client-side filtering, keyboard support (Enter/Escape), clear button, filter status count
- [x] **07-03 Filter Scope & Severity Labels** — Most Common Code responds to vehicleId/level filters, ERROR renamed to CRITICAL display label, cards regrouped by filter scope
- [x] **07-04 Case-Insensitive Filtering** — UPPER() on all backend WHERE clauses (vehicleId, code), Zod transform for level enum, conditional Most Common Code card, error code filter on topCodes endpoint
- [x] **07-05 Seed Data Diversification** — Flexible vehicle ID regex, 493 events across 26 vehicles with 8 fleet prefixes (BMW, MNI, RR, X5, I4, M3, IX, S7)
- [x] **07-06 Documentation & User Guide** — USER_GUIDE.md, updated ARCHITECTURE.md, updated BUILD_LOG.md

---

## Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 1. Backend Data Layer | Complete | 4/4 |
| 2. Backend API Layer | Complete | 2/2 |
| 3. Frontend Foundation | Complete | 4/4 |
| 4. Frontend Views | Complete | 4/4 |
| 5. Integration & Delivery | Complete | 3/3 |
| 6. Vehicle Features | Complete | 1/1 |
| 7. UI/UX Polish & Filters | Complete | 6/6 |

**Overall: 24/24 plans complete**

---
*Last updated: 2026-02-22 (Phase 7)*
