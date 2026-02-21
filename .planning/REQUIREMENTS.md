# Requirements: Fleet Health & Diagnostics Console

**Defined:** 2026-02-21
**Core Value:** Operations engineers can search, filter, and explore vehicle diagnostic events across multiple dimensions and immediately see which vehicles need attention.

## v1 Requirements

### Data Ingestion

- [ ] **DATA-01**: System parses structured log files into typed model (timestamp, vehicleId, level, code, message)
- [ ] **DATA-02**: System seeds ~500 realistic events across 15-20 vehicles with real OBD-II codes on first startup
- [ ] **DATA-03**: Events stored in SQLite via TypeORM with indexes on vehicleId, code, level, timestamp

### REST API

- [ ] **API-01**: GET /api/events returns raw events with combinable filters (vehicleId, code, level, from, to) and pagination (page, limit)
- [ ] **API-02**: GET /api/aggregations/errors-per-vehicle returns error/warn counts grouped by vehicle, filterable by time range
- [ ] **API-03**: GET /api/aggregations/top-codes returns most frequent error codes with counts, filterable by level and time range
- [ ] **API-04**: GET /api/aggregations/critical-vehicles returns vehicles with 3+ ERROR events in last 24h
- [ ] **API-05**: Invalid query params return 400 with clear error messages
- [ ] **API-06**: Swagger/OpenAPI docs served at /api-docs

### Frontend State

- [ ] **STATE-01**: NgRx ComponentStore manages filters, events, aggregations, loading, and error state as observables
- [ ] **STATE-02**: Filter changes debounced (debounceTime) before triggering API calls
- [ ] **STATE-03**: In-flight requests cancelled on new filter change (switchMap)
- [ ] **STATE-04**: Filters and page combined into single API call (combineLatest)
- [ ] **STATE-05**: Selectors use shareReplay and distinctUntilChanged to prevent redundant calls

### Frontend Views

- [ ] **VIEW-01**: Search/filter panel with vehicle ID, error code, severity, and time range inputs
- [ ] **VIEW-02**: Raw events table with timestamp, vehicle, severity, code, message columns and pagination
- [ ] **VIEW-03**: Severity badges color-coded (red=ERROR, orange=WARN, blue=INFO)
- [ ] **VIEW-04**: Aggregated dashboard with summary cards, errors per vehicle, top codes, critical vehicles
- [ ] **VIEW-05**: Loading states while fetching, empty state when no results

### Deliverables

- [ ] **DOC-01**: Requirements document with assumptions
- [ ] **DOC-02**: Architecture/concept document (backend + frontend)
- [ ] **DOC-03**: README with setup instructions and prerequisites
- [ ] **DOC-04**: Docker containerization (Dockerfile + docker-compose)

## v2 Requirements

### Enhancements

- **ENH-01**: Click critical vehicle to cross-navigate to filtered events view
- **ENH-02**: Sortable table columns (client-side)
- **ENH-03**: Responsive layout for tablet (768px)
- **ENH-04**: Keyboard navigation and ARIA labels

## Out of Scope

| Feature | Reason |
|---------|--------|
| WebSocket real-time streaming | Seed data sufficient; assignment says "near-real time" not "real time" |
| User authentication | Internal ops tool, not mentioned in assignment |
| Charts/visualizations (Chart.js, D3) | Simple lists and bars suffice; avoids library bloat |
| Unit/integration tests | Not explicitly required; prioritize working features |
| Full NgRx Store | Over-engineered for single-feature app; ComponentStore is right-sized |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| API-01 | Phase 2 | Pending |
| API-02 | Phase 2 | Pending |
| API-03 | Phase 2 | Pending |
| API-04 | Phase 2 | Pending |
| API-05 | Phase 2 | Pending |
| API-06 | Phase 2 | Pending |
| STATE-01 | Phase 3 | Pending |
| STATE-02 | Phase 3 | Pending |
| STATE-03 | Phase 3 | Pending |
| STATE-04 | Phase 3 | Pending |
| STATE-05 | Phase 3 | Pending |
| VIEW-01 | Phase 4 | Pending |
| VIEW-02 | Phase 4 | Pending |
| VIEW-03 | Phase 4 | Pending |
| VIEW-04 | Phase 4 | Pending |
| VIEW-05 | Phase 4 | Pending |
| DOC-01 | Phase 5 | Pending |
| DOC-02 | Phase 5 | Pending |
| DOC-03 | Phase 5 | Pending |
| DOC-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-21 after roadmap creation — all 23 v1 requirements confirmed mapped*
