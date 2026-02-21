---
phase: 03-frontend-foundation
plan: 03
subsystem: ui
tags: [angular, ngrx, component-store, rxjs, state-management, observables]

requires:
  - phase: 03-02-frontend-foundation
    provides: DiagnosticsApiService with typed HttpClient methods for all 4 endpoints; model interfaces (DiagnosticEvent, EventFilters, PaginatedResponse, ErrorsPerVehicle, TopCode, CriticalVehicle)

provides:
  - DiagnosticsState interface with filters, events, total, page, limit, aggregations, loading, error
  - AggregationState sub-interface for errorsPerVehicle, topCodes, criticalVehicles
  - initialState constant with safe defaults
  - DiagnosticsStore ComponentStore with setFilters, setPage, resetFilters updaters
  - 7 typed selectors all with distinctUntilChanged + shareReplay(1)
  - loadEventsEffect: combineLatest + debounceTime(300) + switchMap + catchError inside inner pipe
  - loadAggregationsEffect: debounce + switchMap + combineLatest for all 3 aggregation endpoints

affects:
  - 03-04 (App shell may inject store for route-level state init)
  - 04-02 (EventsComponent provides DiagnosticsStore, uses events$, filters$, total$, page$, loading$, error$)
  - 04-03 (DashboardComponent provides DiagnosticsStore, uses aggregations$, loading$, error$)

tech-stack:
  added: []
  patterns:
    - "ComponentStore pattern: @Injectable() without providedIn — provided at component level for isolated instances per route"
    - "Effect auto-wiring in constructor: private methods called after super(initialState)"
    - "Inner-pipe error isolation: catchError inside switchMap returns EMPTY — outer stream stays alive"
    - "combineLatest for filter dimensions: any single dimension change triggers re-fetch with all current values"
    - "takeUntilDestroyed(destroyRef): inject(DestroyRef) + takeUntilDestroyed for automatic cleanup without ngOnDestroy"

key-files:
  created:
    - frontend/src/app/store/diagnostics-state.model.ts
    - frontend/src/app/store/diagnostics.store.ts

key-decisions:
  - "catchError inside switchMap inner pipe returns EMPTY — tapResponse removed from @ngrx/component-store v19, identical behavior"
  - "combineLatest([filters$, page$, limit$]) not withLatestFrom — both filter AND page changes should trigger re-fetch"
  - "@Injectable() without providedIn — ComponentStore per-feature instance pattern, not singleton"
  - "Effects wired in constructor after super(initialState) — state initialized before subscriptions begin"

patterns-established:
  - "Store state model: separate diagnostics-state.model.ts for DiagnosticsState interface and initialState"
  - "Selector pipeline: this.select(fn).pipe(distinctUntilChanged(), shareReplay(1)) on all exposed observables"
  - "Effect pattern: combineLatest → debounceTime(300) → tap(setLoading) → switchMap → tap(success) + catchError(error, EMPTY)"

requirements-completed:
  - STATE-01
  - STATE-02
  - STATE-03
  - STATE-04
  - STATE-05

duration: 6min
completed: 2026-02-21
---

# Phase 3 Plan 03: DiagnosticsStore Summary

**NgRx ComponentStore with 7 typed selectors, 3 updaters, and 2 effects demonstrating debounceTime, switchMap, combineLatest, distinctUntilChanged, shareReplay, and takeUntilDestroyed — all correctly applied**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-21T13:03:00Z
- **Completed:** 2026-02-21T13:09:27Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- `DiagnosticsState` interface with 8 state fields and `AggregationState` sub-interface for nested aggregation data
- `initialState` constant providing safe defaults (empty filters, empty arrays, page 1, limit 20, loading false)
- `DiagnosticsStore` extending `ComponentStore<DiagnosticsState>` — `@Injectable()` without `providedIn` (component-level provision)
- 3 typed updaters: `setFilters` (resets page to 1), `setPage`, `resetFilters`
- 7 selectors all with `distinctUntilChanged()` + `shareReplay(1)` — satisfies STATE-05
- `loadEventsEffect`: `combineLatest([filters, page, limit])` → `debounceTime(300)` → `tap(loading)` → `switchMap` → success + `catchError` inside inner pipe — satisfies STATE-02, STATE-03, STATE-04
- `loadAggregationsEffect`: same pattern for 3 aggregation endpoints combined via inner `combineLatest`
- Both effects use `takeUntilDestroyed(this.destroyRef)` — automatic cleanup without `ngOnDestroy`
- Angular build passes with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: DiagnosticsStore with full RxJS pattern demonstration** - `f3ccbca` (feat)

**Plan metadata:** `[final-commit-hash]` (docs: complete DiagnosticsStore plan)

## Files Created/Modified

- `frontend/src/app/store/diagnostics-state.model.ts` — DiagnosticsState + AggregationState interfaces, initialState constant
- `frontend/src/app/store/diagnostics.store.ts` — DiagnosticsStore with updaters, selectors, and effects

## Decisions Made

- `catchError` inside `switchMap` inner pipe (not `tapResponse`) — `tapResponse` was removed from `@ngrx/component-store` v19. The equivalent is `catchError` scoped to the inner observable returning `EMPTY`. The outer stream stays alive for future filter/page emissions. Identical semantics to `tapResponse`.
- `combineLatest([filters$, page$, limit$])` for event loading — three independent state slices; any changing triggers re-fetch with all current values. Using `withLatestFrom` would only trigger on filter changes, ignoring page-only changes.
- Effects wired in constructor via private methods called after `super(initialState)` — state is initialized before subscriptions begin, prevents the "state not initialized" error.
- `@Injectable()` without `providedIn` — ComponentStore pattern. Each feature route provides its own store instance via `providers: [DiagnosticsStore]` in the component metadata. State is isolated per route.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced `tapResponse` from `@ngrx/component-store` with `catchError` inside inner pipe**
- **Found during:** Task 1 (implementation)
- **Issue:** `tapResponse` is not exported from `@ngrx/component-store` v19.2.1. The public API was checked — no `tapResponse` export. It was moved to `@ngrx/operators` (a separate package not installed in this project).
- **Fix:** Used `catchError` inside the `switchMap` inner pipe returning `EMPTY`. This is the exact same stream-safe pattern — errors are caught in the inner observable scope without reaching the outer stream. Outer stream continues emitting on future filter/page changes.
- **Files modified:** `frontend/src/app/store/diagnostics.store.ts`
- **Verification:** Angular build passes. `catchError` appears on lines 113 and 147 — both inside `switchMap` inner pipe, never on outer stream. No `mergeMap`, no `any`, no `providedIn: 'root'`.
- **Committed in:** `f3ccbca` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — library API version divergence)
**Impact on plan:** Required for correctness. The fix produces identical runtime behavior to `tapResponse`. No scope creep.

## Issues Encountered

None beyond the `tapResponse` API change documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `DiagnosticsStore` ready to be provided in feature components via `providers: [DiagnosticsStore]`
- All 7 selectors available as typed `Observable<T>` for async pipe binding
- `setFilters`, `setPage`, `resetFilters` updaters ready for filter panel and pagination components
- `aggregations$` selector provides the nested `AggregationState` for dashboard widgets
- State flows: filter input → `setFilters()` → `filters$` emits → `debounceTime(300)` → `switchMap` → API → `events$` emits → template re-renders

## Self-Check

- `frontend/src/app/store/diagnostics-state.model.ts` — exists, contains `DiagnosticsState`, `AggregationState`, `initialState`
- `frontend/src/app/store/diagnostics.store.ts` — exists, contains `DiagnosticsStore extends ComponentStore`
- Commit `f3ccbca` — verified in git log
- Angular build — PASSED (zero TypeScript errors)
- Required patterns present: `debounceTime(300)`, `switchMap`, `combineLatest`, `distinctUntilChanged()`, `shareReplay(1)`, `takeUntilDestroyed`
- Anti-patterns absent: no `mergeMap`, no `any`, no `providedIn: 'root'`, no outer `catchError`

## Self-Check: PASSED

---
*Phase: 03-frontend-foundation*
*Completed: 2026-02-21*
