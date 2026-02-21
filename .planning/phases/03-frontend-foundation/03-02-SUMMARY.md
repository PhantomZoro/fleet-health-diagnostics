---
phase: 03-frontend-foundation
plan: 02
subsystem: ui
tags: [angular, typescript, http-client, models, interfaces, rxjs]

requires:
  - phase: 03-01-frontend-foundation
    provides: provideHttpClient configured in app.config.ts, Angular 19 standalone project ready for services

provides:
  - DiagnosticEvent interface with DiagnosticLevel type (timestamp as string for JSON)
  - EventFilters interface with optional vehicleId, code, level, from, to
  - Generic PaginatedResponse<T> interface matching backend response shape
  - ErrorsPerVehicle, TopCode, CriticalVehicle aggregation interfaces
  - Barrel export at core/models/index.ts re-exporting all models
  - DiagnosticsApiService with getEvents, getErrorsPerVehicle, getTopCodes, getCriticalVehicles methods

affects:
  - 03-03 (DiagnosticsStore injects DiagnosticsApiService and uses all model interfaces for typed state)
  - 04-02 (EventsComponent uses DiagnosticEvent, EventFilters, PaginatedResponse via store)
  - 04-03 (DashboardComponent uses ErrorsPerVehicle, TopCode, CriticalVehicle via store)

tech-stack:
  added: []
  patterns:
    - "Dynamic HttpParams pattern: build params with .set() only for truthy values — skips undefined and empty strings"
    - "Barrel export: core/models/index.ts re-exports all interfaces from single import path"
    - "inject() function for DI in Angular 19 services"
    - "Generic interface: PaginatedResponse<T> works with any entity type"

key-files:
  created:
    - frontend/src/app/core/models/diagnostic-event.model.ts
    - frontend/src/app/core/models/event-filters.model.ts
    - frontend/src/app/core/models/paginated-response.model.ts
    - frontend/src/app/core/models/aggregation.model.ts
    - frontend/src/app/core/models/index.ts
    - frontend/src/app/core/services/diagnostics-api.service.ts

key-decisions:
  - "timestamp: string on frontend (not Date) — JSON serialization converts Date to ISO string"
  - "Truthy checks for HttpParams — skips both undefined AND empty strings, matching Zod backend validation"
  - "inject() over constructor injection — Angular 19 preferred pattern for standalone services"
  - "providedIn: root — tree-shakeable singleton for API service"
  - "Base URL /api — Angular dev proxy rewrites to localhost:3000, same code works in prod"

patterns-established:
  - "Core directory convention: frontend/src/app/core/models/ and core/services/ for shared infrastructure"
  - "Model interface per domain entity with single barrel re-export"
  - "API service: one service class per backend resource group, typed Observable returns"

requirements-completed:
  - STATE-01

duration: 5min
completed: 2026-02-21
---

# Phase 3 Plan 02: Shared Models + API Service Summary

**TypeScript interfaces mirroring backend API shapes and a typed HttpClient service with dynamic query params for all 4 endpoints**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-21T12:56:45Z
- **Completed:** 2026-02-21T13:02:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Five model interfaces in `core/models/` matching backend response shapes exactly (verified against `backend/src/types/index.ts`)
- `DiagnosticEvent` uses `timestamp: string` (not `Date`) — correct for JSON serialization from backend
- Generic `PaginatedResponse<T>` works with any entity type
- `DiagnosticsApiService` with 4 typed methods — all return `Observable<T>`, no `any` types
- Dynamic `HttpParams` building — undefined and empty-string values skipped to avoid sending `?field=undefined` to backend
- Barrel export `index.ts` provides single import path for all models
- Angular build confirms zero TypeScript errors across all new files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared TypeScript model interfaces** - `6032314` (feat)
2. **Task 2: Create DiagnosticsApiService with HttpClient methods** - `0128b26` (feat)

**Plan metadata:** docs(03-02): complete shared models and API service plan

## Files Created/Modified

- `frontend/src/app/core/models/diagnostic-event.model.ts` — DiagnosticEvent interface, DiagnosticLevel type alias
- `frontend/src/app/core/models/event-filters.model.ts` — EventFilters with optional vehicleId, code, level, from, to
- `frontend/src/app/core/models/paginated-response.model.ts` — Generic PaginatedResponse<T> with data, total, page, limit
- `frontend/src/app/core/models/aggregation.model.ts` — ErrorsPerVehicle, TopCode, CriticalVehicle interfaces
- `frontend/src/app/core/models/index.ts` — Barrel re-export of all model interfaces
- `frontend/src/app/core/services/diagnostics-api.service.ts` — DiagnosticsApiService with 4 typed HttpClient methods

## Decisions Made

- `timestamp: string` on frontend (not `Date`) — JSON.stringify() converts backend entity's `Date` fields to ISO strings over the wire. Frontend receives strings; treating them as `Date` would require manual parsing everywhere.
- Truthy checks (`if (filters.vehicleId)`) over `!== undefined` — also skips empty strings, matching backend Zod validation that rejects empty strings and avoids sending malformed query params.
- `inject()` function DI — Angular 19 standalone preferred pattern; cleaner than constructor injection for services that don't need `super()` calls.
- Base URL `/api` — works in dev (proxy rewrites to `localhost:3000/api`) and prod (nginx routes `/api` to backend) without environment-specific URLs.

## Deviations from Plan

None - plan executed exactly as written. Backend types matched the expected shapes precisely.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All model interfaces available at `import { DiagnosticEvent, EventFilters, PaginatedResponse, ErrorsPerVehicle, TopCode, CriticalVehicle } from '../models'`
- `DiagnosticsApiService` injectable and ready for use in `DiagnosticsStore` (Plan 03-03)
- `provideHttpClient()` already configured in `app.config.ts` from Plan 03-01 — service will work immediately

## Self-Check: PASSED

All 6 files verified present. Task commits `6032314` and `0128b26` confirmed. Angular build passes without TypeScript errors. Dynamic HttpParams pattern implemented for all filter parameters.

---
*Phase: 03-frontend-foundation*
*Completed: 2026-02-21*
