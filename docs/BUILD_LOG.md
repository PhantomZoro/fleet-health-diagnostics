# Build Log

Chronological record of what was built, why, and how. Written for interview preparation — each phase entry covers the talking points BMW interviewers will likely probe.

---

## Phase 1: Backend Data Layer

**Status:** Complete (4/4 plans complete)

### What Was Built & Why

**Plan 01-01 — Project Scaffolding & Entity Setup**

Established the backend monorepo foundation: Express 5 server with TypeScript strict mode, TypeORM DataSource connected to SQLite via better-sqlite3, and the DiagnosticEvent entity with indexed columns ready for data insertion.

The scaffold is intentionally minimal — no routes yet, just the foundation that subsequent plans (parser, seeder, endpoints) build on top of.

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| NodeNext module resolution | Required for ESM compatibility with TypeORM entity imports (.js extensions) | CommonJS — would lose ESM benefits |
| better-sqlite3 driver | Synchronous SQLite driver, better TypeORM support than the standard sqlite3 | sqlite3 (async, more friction with TypeORM) |
| synchronize:true in DataSource | Dev convenience — auto-creates tables on startup without migrations | Manual migrations — over-engineered for dev/demo |
| tsx over ts-node-dev | esbuild-based, zero ESM/CJS friction, faster startup | ts-node-dev — slower, known ESM issues |
| Four indexed columns | timestamp, vehicleId, level, code all filterable — indexes prevent full table scans | No indexes — unacceptable at 500+ rows |

### Tricky Parts & Solutions

**TypeORM minimatch vulnerability in transitive deps:** TypeORM 0.3.x depends on glob@3-10 which depends on minimatch <10.2.1 (ReDoS vulnerability). The `npm audit fix --force` fix would downgrade to typeorm@0.0.1 (breaking change). Accepted the risk — the vulnerability is in CLI glob matching, not runtime query execution. Not exploitable in our use case.

**NodeNext + .js import extensions:** With `"moduleResolution": "NodeNext"`, TypeScript requires `.js` extensions on relative imports even for `.ts` files. Entity import in database.ts uses `'../entities/diagnostic-event.entity.js'` — this is correct for NodeNext.

**reflect-metadata must be first import:** TypeORM decorators require `reflect-metadata` to be imported before any decorated class. Placed at top of `index.ts` as the very first import.

### Patterns Demonstrated

- **Layered directory structure:** `routes/` → `services/` → `entities/` directories created from the start, establishing the architecture pattern
- **TypeORM column typing without any:** All entity columns use explicit types (`'datetime'`, `'varchar'`, `'text'`) — no `any` types anywhere per strict mode requirement
- **Non-null assertion on entity fields:** TypeORM initializes decorated fields — using `!` assertion is idiomatic and avoids false TypeScript errors
- **Index decorator on all filterable fields:** Each queryable dimension (timestamp, vehicleId, level, code) gets `@Index()` — database-first performance thinking

**Plan 01-02 — Log Parser, Seed Data, Seed Runner & Health Endpoint**

Built the complete data pipeline: a regex-based log parser that extracts structured fields from log lines, a 500-event seed file with realistic OBD-II diagnostic codes across 20 BMW vehicles, a startup seeder with duplicate protection, and a health check endpoint to verify the database is populated.

This completes Phase 1 — the server now starts, initializes the database, parses and seeds realistic diagnostic data, and serves a health endpoint confirming the event count.

### Key Decisions (Plan 01-02)
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| Structured log format with bracketed fields | Clean regex extraction, each field delimited — realistic yet parseable | CSV/JSON — less realistic for diagnostic logs |
| parseLogLine returns null for bad lines | Graceful degradation — malformed lines skip with warning, parser never throws | Throw on bad lines — too brittle for real log data |
| Count guard in seeder (not upsert) | Simpler than unique constraints for seed-only scenario — check count, skip if > 0 | Upsert with unique key — unnecessary complexity |
| Chunk insert (100 per batch) | SQLite max 999 variables — 100 entities × 6 columns = 600 per batch, safe margin | Single insert — would hit variable limit at 167+ entities |
| Events unsorted in seed.log | Realistic — logs arrive out of order in production systems | Sorted by timestamp — would be unrealistic |

### Tricky Parts & Solutions (Plan 01-02)

**No issues encountered.** The plan was well-specified and executed cleanly. The regex pattern matched all 500 seed lines with zero parse failures.

### Patterns Demonstrated (Plan 01-02)

- **Router-per-domain:** Each route group (health, future events, future aggregations) exports its own Express Router, mounted in index.ts — keeps routing modular
- **Functional + OO parser API:** `parseLogLine()` and `parseLogFile()` as pure functions, plus `LogParser` class wrapper — consumer chooses style
- **Seed idempotency via count guard:** `repo.count() > 0` check before seeding — simple, effective, no schema changes needed
- **Async bootstrap sequence:** DataSource.initialize() → seedDatabase() → express.listen() — ordered startup ensures DB is ready before accepting requests

---

## Phase 2: Backend API Layer

**Status:** Not started

### What Was Built & Why
_To be filled after phase completion_

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| | | |

### Tricky Parts & Solutions
_Problems encountered during implementation and how they were resolved_

### Patterns Demonstrated
_Architecture and code patterns established in this phase_

---

## Phase 3: Frontend Foundation

**Status:** Not started

### What Was Built & Why
_To be filled after phase completion_

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| | | |

### Tricky Parts & Solutions
_Problems encountered during implementation and how they were resolved_

### RxJS Patterns — Deep Dive

This is the section BMW will grill on. Each pattern with the exact reasoning:

#### `switchMap` for API calls
- **Where:** ComponentStore effect that loads events on filter change
- **Why switchMap, not mergeMap:** When filters change rapidly, we want to cancel the previous in-flight HTTP request and only keep the latest one. `mergeMap` would let all requests complete, potentially showing stale results if an older request resolves after a newer one.
- **Why not concatMap:** We don't need guaranteed ordering — we only care about the latest filter state. `concatMap` would queue requests unnecessarily.

#### `debounceTime(300)` on filter changes
- **Where:** Before the `switchMap` in the events loading effect
- **Why 300ms:** Prevents firing an API call on every keystroke in the vehicle ID input. Waits until the user pauses typing. 300ms is the sweet spot — fast enough to feel responsive, slow enough to avoid unnecessary requests.
- **Why not throttleTime:** `throttleTime` emits the first value immediately, then ignores for the duration. We want the opposite — wait for the user to stop, then emit the final value.

#### `combineLatest` for merging filter dimensions
- **Where:** Combining `filters$` and `page$` streams into a single API call trigger
- **Why combineLatest:** We need the latest value from BOTH streams to construct the API call. When either changes, we want to re-fetch with the current state of both.
- **Why not withLatestFrom:** `withLatestFrom` only emits when the source emits, treating the other as passive. We want either filter OR page changes to trigger a fetch.

#### `tapResponse` for error handling (NOT `catchError`)
- **Where:** Inside the `switchMap` pipe in ComponentStore effects
- **Why not catchError on outer stream:** This is a critical gotcha. If you put `catchError` on the outer effect observable, it completes the stream on first error — all future filter changes are silently ignored. The effect is permanently dead.
- **How tapResponse works:** It's an NgRx helper that wraps the inner observable with error handling. Errors are caught and handled without killing the outer effect stream.

#### `takeUntilDestroyed()` for cleanup
- **Where:** Any component that subscribes to observables in `constructor` or `ngOnInit`
- **Why:** Automatically unsubscribes when the component is destroyed. Replaces the old `ngOnDestroy` + `Subject` + `takeUntil` pattern. Cleaner, less boilerplate, impossible to forget.

#### `distinctUntilChanged` + `shareReplay(1)` on selectors
- **Where:** All ComponentStore selectors (`events$`, `filters$`, `loading$`, etc.)
- **Why distinctUntilChanged:** Prevents re-renders when the selected value hasn't actually changed. Without it, every state update would trigger all subscribers even if their slice didn't change.
- **Why shareReplay(1):** Ensures late subscribers get the current value immediately. Without it, a component subscribing after the initial emission would see nothing until the next state change.

---

## Phase 4: Frontend Views

**Status:** Not started

### What Was Built & Why
_To be filled after phase completion_

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| | | |

### Tricky Parts & Solutions
_Problems encountered during implementation and how they were resolved_

### Component Architecture
- **Smart vs Dumb split:** Smart components (EventsComponent, DashboardComponent) inject the store. Dumb components (FilterPanel, SeverityBadge, Pagination) use only @Input/@Output.
- **Why OnPush everywhere:** Reduces change detection cycles. Angular only checks the component when its inputs change or an event fires within it. Critical for performance with large event tables.
- **Why standalone components:** Angular 19 default. No NgModules needed. Each component declares its own imports. Simpler dependency graph, better tree-shaking.

---

## Phase 5: Integration & Delivery

**Status:** Not started

### What Was Built & Why
_To be filled after phase completion_

### Key Decisions
| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| | | |

### Tricky Parts & Solutions
_Problems encountered during implementation and how they were resolved_

### Docker Architecture
_Multi-stage build strategy, nginx configuration, container networking_

---

## Interview Quick Reference

### "Why did you choose X over Y?"

| Choice | Reasoning |
|--------|-----------|
| Express over NestJS | Shows raw architecture decisions — layered service pattern is MY choice, not framework magic. NestJS decorators hide too much for a senior assessment. |
| ComponentStore over NgRx Store | Right-sized for single-feature app. Full Store (actions/reducers/effects/selectors) is over-engineered when you have one data domain. ComponentStore still demonstrates observable state patterns. |
| SQLite + TypeORM over lowdb | Real SQL with indexes, QueryBuilder, proper ORM patterns. lowdb is just a JSON file — doesn't demonstrate database thinking. |
| Zod over class-validator | TypeScript-native, works at runtime AND compile time. Clean error messages for API responses. class-validator requires decorators and reflect-metadata. |
| tsx over ts-node-dev | esbuild-based, zero ESM/CJS friction. ts-node-dev uses TypeScript compiler which is slower and has module resolution issues. |
| Seed via log parser | Proves the parser works on real data format. Synthetic `repository.save()` calls don't demonstrate anything. The parser IS a feature. |

### "Walk me through the data flow"

1. User types in filter panel -> `@Output` emits `EventFilters`
2. Smart component calls `store.setFilters(filters)` -> updater writes to state
3. `filters$` selector emits (distinctUntilChanged skips if same)
4. `combineLatest([filters$, page$])` fires -> `debounceTime(300)` waits
5. `switchMap` cancels any in-flight request, fires new `api.getEvents()`
6. `tapResponse` handles success (update state) or error (set error state)
7. `events$` selector emits -> smart component template re-renders via `async` pipe

### "How do you handle errors?"

- **Backend:** Global Express error handler returns `{ error, statusCode, details? }`. Zod validation errors include field-level details. Express 5 catches async errors natively — no wrapper needed.
- **Frontend:** HTTP interceptor catches errors -> pushes to notification service -> toast auto-dismisses after 5s. ComponentStore effects use `tapResponse` so the effect stream survives errors.
- **Critical pitfall avoided:** Never `catchError` on outer effect stream — it kills the stream permanently.

---
*Last updated: 2026-02-21*
