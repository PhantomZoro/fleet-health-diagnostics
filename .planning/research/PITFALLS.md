# Pitfalls Research

**Domain:** Fleet Vehicle Diagnostics Console — Express + TypeORM + SQLite + Angular 17 + NgRx ComponentStore
**Researched:** 2026-02-21
**Confidence:** HIGH (critical pitfalls verified with official docs and Context7; moderate pitfalls verified with multiple community sources)

---

## Critical Pitfalls

### Pitfall 1: catchError Placed on the Outer Observable Kills the Entire Stream

**What goes wrong:**
In NgRx ComponentStore effects, placing `catchError` outside the inner `switchMap` pipe terminates the entire effect stream on the first API error. After one failed request, the store stops reacting to filter changes permanently — no more API calls, silent failure from the user's perspective.

**Why it happens:**
RxJS observables terminate on error by default. Developers unfamiliar with higher-order observable patterns add `catchError` at the top-level pipe assuming it "catches everything." It does — and it ends everything. The ComponentStore effect is an infinite stream; it must never complete.

**How to avoid:**
Always place `catchError` (or the NgRx `tapResponse` operator from `@ngrx/operators`) inside the inner observable pipe, not the outer one:

```typescript
// WRONG — kills the stream on first error
readonly loadEvents = this.effect((trigger$: Observable<EventFilters>) =>
  trigger$.pipe(
    switchMap(filters => this.api.getEvents(filters)),
    catchError(err => { this.setError(err); return EMPTY; }) // stream dies here
  )
);

// CORRECT — only the inner call fails; outer stream continues
readonly loadEvents = this.effect((trigger$: Observable<EventFilters>) =>
  trigger$.pipe(
    switchMap(filters =>
      this.api.getEvents(filters).pipe(
        tapResponse({
          next: (result) => this.setEvents(result),
          error: (err) => this.setError(err),
        })
      )
    )
  )
);
```

**Warning signs:**
- Filter panel updates that stop triggering API calls after a single 500 or network error
- Store loading state stuck as `true` after an error without recovery
- Console shows one error and then silence — no subsequent requests

**Phase to address:** Phase 3 (NgRx ComponentStore implementation)

---

### Pitfall 2: TypeORM `synchronize: true` Left Active Beyond Development

**What goes wrong:**
`synchronize: true` in the DataSource config auto-alters the schema on every app startup. For SQLite this is doubly risky: TypeORM rebuilds entire tables (drop + recreate) to implement schema changes because SQLite's `ALTER TABLE` is limited. Any seed data is silently wiped when an entity changes.

**Why it happens:**
`synchronize: true` is the default getting-started configuration in TypeORM docs and works fine during early development. Developers copy it forward without realising that a stray entity decorator change at startup destroys data and can corrupt a database mid-demo.

**How to avoid:**
Use `synchronize: true` only during Phase 1 scaffolding. Before Phase 2 (API layer with real queries), switch to explicit `synchronize: false` and protect seed data with a guard:

```typescript
// Safe seeding guard — never wipe existing data
const count = await dataSource.getRepository(DiagnosticEvent).count();
if (count === 0) {
  await seedFromLogFile(dataSource);
}
```

For the assignment submission, `synchronize: true` with `dropSchema: false` is acceptable, but gate the seeding call behind a count check so the demo database survives restarts.

**Warning signs:**
- Database returns zero events on second app startup
- `data/fleet.db` timestamp updates every time the dev server restarts
- TypeORM logs `QUERY: DROP TABLE` or `QUERY: CREATE TABLE` on startup

**Phase to address:** Phase 1 (database setup), enforce before Phase 2

---

### Pitfall 3: TypeORM Repository `findBy` With Undefined Filter Values Returns All Rows

**What goes wrong:**
When query params are optional (vehicleId, code, level are all nullable in this API), passing them as `undefined` to `findBy({ vehicleId: undefined })` produces a WHERE clause with no conditions — equivalent to `WHERE 1=1` — returning every row in the table. This is a data leak bug masquerading as a filter.

**Why it happens:**
TypeORM's repository methods strip `undefined` values from the options object before generating SQL. The developer checks `if (vehicleId) { options.vehicleId = vehicleId }` but misses falsy edge cases (empty string `""`, `0`). With dynamic multi-filter APIs this pattern breaks down quickly.

**How to avoid:**
Use `QueryBuilder` for the events endpoint where all filters are optional and combinable. QueryBuilder gives explicit control over when conditions are added:

```typescript
const qb = repo.createQueryBuilder('event');
if (vehicleId) qb.andWhere('event.vehicleId = :vehicleId', { vehicleId });
if (code)      qb.andWhere('event.code = :code', { code });
if (level)     qb.andWhere('event.level = :level', { level });
if (from)      qb.andWhere('event.timestamp >= :from', { from });
if (to)        qb.andWhere('event.timestamp <= :to', { to });
```

Validate at the Zod layer first (reject empty strings) so the service layer never receives ambiguous values.

**Warning signs:**
- `GET /api/events?vehicleId=` returns all 500 events instead of 0
- Aggregation numbers don't change when filters are applied
- Unit tests pass when mocked but integration tests show wrong row counts

**Phase to address:** Phase 2 (events query endpoint, task 7)

---

### Pitfall 4: Async Route Handlers in Express Without Error Propagation to `next()`

**What goes wrong:**
Express does not catch rejected promises from async route handlers automatically (in Express 4, which is current stable). An unhandled async exception crashes the process with `UnhandledPromiseRejectionWarning` instead of returning a 500 to the client. The global error middleware is never invoked.

**Why it happens:**
Developers write `app.get('/api/events', async (req, res) => { ... })` and add a global `app.use((err, req, res, next) => {...})` at the bottom, assuming that handler catches everything. It catches synchronous `throw` but not async rejections without explicit `next(err)`.

**How to avoid:**
Wrap all async handlers:

```typescript
// Utility wrapper — one function, use everywhere
const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Apply to all routes
router.get('/events', asyncHandler(async (req, res) => {
  const events = await eventsService.findAll(req.query);
  res.json(events);
}));
```

Alternatively, install `express-async-errors` (patches Express globally). Note: Express 5 (currently in beta/RC) handles this natively, but Express 4 is the stable version to use here.

**Warning signs:**
- Server crashes on any database error instead of returning 500
- Swagger docs for error responses exist but are never actually returned
- `curl` hangs indefinitely on an endpoint that throws

**Phase to address:** Phase 2 (error handling middleware, task 10) — implement the wrapper before any route

---

### Pitfall 5: Memory Leaks From Unmanaged Subscriptions in Angular Components

**What goes wrong:**
Any `.subscribe()` call inside an Angular component that is not cleaned up leaks memory and causes phantom updates — the destroyed component's subscription fires, tries to update a view that no longer exists, and emits `ExpressionChangedAfterItHasBeenChecked` errors or silent data corruption in the store.

**Why it happens:**
ComponentStore selectors are long-lived observables. When a component subscribes manually (e.g., `this.store.events$.subscribe(...)`) and the user navigates away, the subscription continues. In a diagnostics console with live filter interactions, each navigation without cleanup multiplies the active subscription count.

**How to avoid:**
The assignment uses Angular 17+ standalone components. Use `takeUntilDestroyed` from `@angular/core/rxjs-interop` — it requires no `ngOnDestroy`, hooks into the component's `DestroyRef` automatically:

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export class EventsComponent {
  constructor(private store: DiagnosticsStore) {
    // Automatically unsubscribes on component destroy
    this.store.events$.pipe(takeUntilDestroyed()).subscribe(events => {
      this.localState = events;
    });
  }
}
```

Prefer the `async` pipe in templates — it unsubscribes automatically and pairs perfectly with `OnPush` change detection.

**Warning signs:**
- Browser memory climbs steadily as user switches between `/events` and `/dashboard`
- API calls double on each navigation (multiple active subscriptions triggering effects)
- Angular DevTools shows components with subscription counts > 1 per instance

**Phase to address:** Phase 3 (store + services) and Phase 4 (views)

---

## Moderate Pitfalls

### Pitfall 6: Wrong RxJS Flattening Operator for the Use Case

**What goes wrong:**
The assignment explicitly requires `switchMap` for cancelling in-flight filter requests. Using `mergeMap` instead means concurrent requests all resolve — a user typing quickly into the vehicle ID filter fires 5 parallel requests and the last result to arrive (not necessarily the last sent) wins, corrupting the displayed state. The reverse error: using `exhaustMap` on filter changes means the user's latest filter is silently ignored while a previous request is in-flight.

**Prevention:**
Match operator to intent:
- `switchMap` — filter changes, search queries. Cancel previous, use latest. **Use here.**
- `exhaustMap` — single load-on-init trigger, button that must not be double-submitted
- `concatMap` — ordered operations where sequence matters
- `mergeMap` — fire-and-forget parallel operations (not appropriate for search)

**Phase to address:** Phase 3 (DiagnosticsStore effects)

---

### Pitfall 7: TypeScript Strict Mode Disabled or `any` Used Pervasively

**What goes wrong:**
A BMW senior developer assignment reviewed without `strict: true` in `tsconfig.json` is an immediate red flag. Code littered with `any` bypasses the entire TypeScript value proposition. Reviewers specifically look for: explicit return types on public service methods, `unknown` instead of `any` for error catch clauses, and proper interface/type definitions shared between backend and frontend (or at minimum consistent).

**Prevention:**
Set `strict: true` from project init and never disable it. For error handling:

```typescript
// Avoid: any erases type information
catch (err: any) { this.setError(err.message); }

// Correct: unknown forces explicit type narrowing
catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  this.setError(message);
}
```

Define shared TypeScript interfaces for `DiagnosticEvent`, `PaginatedResponse<T>`, and filter params. The frontend and backend will diverge in shape if each defines its own ad-hoc types.

**Phase to address:** Phase 1 (tsconfig setup) — enforce before writing any business logic

---

### Pitfall 8: Pagination Total Count Using a Separate Slow Query

**What goes wrong:**
The events endpoint returns `{ data, total, page, limit }`. A common implementation fires two queries: one `SELECT * ... LIMIT/OFFSET` and one `SELECT COUNT(*) ...`. When filters change rapidly via the debounced filter panel, this doubles database load. With SQLite's single-writer locking, two overlapping count queries can cause contention.

**Prevention:**
Use TypeORM QueryBuilder's `getManyAndCount()` which executes both in a single round-trip:

```typescript
const [data, total] = await qb
  .skip((page - 1) * limit)
  .take(limit)
  .getManyAndCount();
```

Also: for the aggregation endpoints (`errors-per-vehicle`, `top-codes`), use `GROUP BY` in a single query rather than loading all events and aggregating in JavaScript. Loading 500 rows into memory to count them in JS is a common mistake when the domain is small.

**Phase to address:** Phase 2 (events endpoint and aggregation queries, tasks 7-8)

---

### Pitfall 9: `distinctUntilChanged` Omitted Causing Redundant API Calls

**What goes wrong:**
The ComponentStore effect triggers on every filter state emission. If the filter object is recreated on each render cycle (e.g., reconstructed from form values) without reference equality, `distinctUntilChanged()` with the default reference comparator will not suppress the duplicate. Every route navigation re-loads data even when filters haven't changed.

**Prevention:**
Combine `debounceTime(300)` with `distinctUntilChanged()` using a deep comparator or a serialized key comparison:

```typescript
this.filters$.pipe(
  debounceTime(300),
  distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  switchMap(filters => this.api.getEvents(filters))
)
```

Alternatively, serialize filter state into a string key in the store updater and compare strings (faster than JSON.stringify on every emission).

**Phase to address:** Phase 3 (DiagnosticsStore, task 14)

---

### Pitfall 10: SQLite WAL Mode Not Enabled (Concurrency Under Dev Load)

**What goes wrong:**
SQLite's default journal mode (DELETE) blocks all reads during a write. In development, with the seeder writing 500 rows on startup while Angular's dev server makes API calls, this causes SQLITE_BUSY errors. The symptom is intermittent 500 errors on first page load that are impossible to reproduce reliably.

**Prevention:**
Enable WAL (Write-Ahead Logging) mode immediately after the DataSource is initialized:

```typescript
const dataSource = await AppDataSource.initialize();
await dataSource.query('PRAGMA journal_mode = WAL;');
await dataSource.query('PRAGMA synchronous = NORMAL;');
```

WAL mode allows concurrent reads while a write is in progress, eliminating the startup race condition entirely.

**Phase to address:** Phase 1 (database connection setup, task 6)

---

### Pitfall 11: Swagger Documentation Not Matching Actual API Behavior

**What goes wrong:**
The Swagger docs at `/api-docs` are written once and then drift as endpoints are modified. If a code reviewer tests the API via Swagger and gets a 422 when the docs show a 200, or vice versa, it signals incomplete quality discipline. This is particularly visible on the error responses and pagination shape.

**Prevention:**
Write the Swagger JSDoc annotations on each route at the same time as the route implementation (same commit). Document:
- All query parameter types and valid values (especially the `level` enum: `ERROR | WARN | INFO`)
- The exact pagination response shape: `{ data: DiagnosticEvent[], total: number, page: number, limit: number }`
- Error response shape: `{ error: string, statusCode: number, details?: unknown }`
- The "critical vehicle" definition in the endpoint description (3+ ERROR events in 24h)

**Phase to address:** Phase 2 (Swagger documentation, task 11)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `synchronize: true` in all environments | No migration files to manage | Destroys data on entity change, unusable in production | Development only — Phase 1 |
| `any` on API response shapes | Faster to write | Type errors surface at runtime, not compile time | Never for a senior assignment |
| Load all events in JS then filter | Simpler code | Breaks at 5k+ events, O(n) in memory | Never — SQL does this better |
| `subscribe()` without cleanup | Less boilerplate | Memory leaks accumulate across navigation | Never with manual component subscriptions |
| Hardcoded `limit: 100` without pagination | Simpler frontend | Returns unbounded data sets | Acceptable for aggregation endpoints only |
| Global `catchError` on ComponentStore effect | Fewer nested pipes | Kills effect stream permanently on first error | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Angular dev proxy to Express | Missing `/api` prefix rewrite in `proxy.conf.json` | Set `pathRewrite: { '^/api': '/api' }` and verify backend route prefix matches |
| TypeORM + SQLite file path | Relative path `./data/fleet.db` breaks when process cwd differs | Use `path.resolve(__dirname, '../data/fleet.db')` |
| Angular `HttpClient` + Express CORS | CORS configured only for `GET`, blocks `OPTIONS` preflight on parameterized requests | Configure `cors()` middleware before routes with `methods: ['GET', 'HEAD', 'OPTIONS']` |
| NgRx ComponentStore + `providedIn: 'root'` | Store becomes singleton — state persists across component lifecycle | Provide ComponentStore at component level via `providers: [DiagnosticsStore]` |
| Docker frontend → backend | Frontend container calls `localhost:3000` which resolves to itself | Use service name from docker-compose: `http://backend:3000` — configure via nginx proxy_pass |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `SELECT *` in aggregation queries | All 500+ event rows loaded to compute counts | Use `SELECT vehicleId, COUNT(*) GROUP BY vehicleId` in SQL | At ~2000 events, noticeably slow |
| No database indexes on filter columns | Filter + sort queries do full table scans | Add `@Index()` on `vehicleId`, `level`, `timestamp`, `code` columns | At ~5000 events, query degrades to seconds |
| `debounceTime` too low (< 200ms) | API calls fire on every keystroke | Use `debounceTime(300)` — 300ms is the standard threshold for search inputs | Immediately with a fast typist |
| `shareReplay(1)` on selectors without `refCount` | Memory leak — selector keeps source alive after all subscribers unsubscribe | Use `shareReplay({ bufferSize: 1, refCount: true })` | Subtle — grows with navigation |
| TypeORM `.find()` without `take()` limit | Returns entire table on broad filter queries | Always set a default `limit` (e.g., 50) and enforce max (e.g., 200) | At 500 events (seed data size) — slow response visible |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `cors({ origin: '*' })` with credentials | Overly permissive — any origin can call the API | For an internal ops tool, restrict to `http://localhost:4200` in dev and actual hostname in prod |
| Query params passed directly to SQL without validation | SQL injection via malformed date strings or code values | Validate all inputs with Zod before they reach the service layer; TypeORM parameterized queries are safe but Zod provides the type contract |
| Stack traces in production error responses | Exposes internal paths, dependency versions, query structure | In error middleware: return `{ error: message }` in production, full `stack` only in development (`process.env.NODE_ENV !== 'production'`) |
| Unbounded pagination (`limit=99999`) | Potential DoS by fetching entire database | Cap `limit` at a maximum (200) in Zod validation regardless of what the client requests |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state during filter changes | UI appears frozen — user clicks filter again, doubling requests | Show skeleton/spinner immediately when filters change (before debounce fires) |
| Error state replaces entire view | User loses filter context after a transient error | Show an error toast/banner while keeping the last good data visible |
| Pagination resets to page 1 silently on filter change | User on page 3, changes filter, now on page 3 of new (shorter) results — wrong | Reset page to 1 in the store updater whenever filters change |
| "Critical vehicles" count with no time context | "3 critical vehicles" — since when? | Display the 24-hour window definition next to the count card |
| Empty state indistinguishable from loading | Blank table could be "no data" or "still loading" | Separate loading skeleton from empty state message ("No events match your filters") |

---

## "Looks Done But Isn't" Checklist

- [ ] **Filter panel:** Verify the "Reset" action also resets the store state, not just the form values — a form reset that doesn't update the store leaves the API calls using stale filters.
- [ ] **Pagination:** Verify page resets to 1 when filters change. Displaying page 3 results of a filtered set that only has 2 pages shows an empty table with no explanation.
- [ ] **switchMap cancellation:** Verify in-flight requests are actually cancelled by checking the Network tab — rapid filter changes should show cancelled requests, not multiple completed ones.
- [ ] **Error recovery:** Verify that after a failed API call, the next filter change triggers a fresh request — the stream must still be alive.
- [ ] **Swagger docs:** Verify every endpoint returns the documented response shape by actually calling them via Swagger UI — not just visually reviewing the JSDoc.
- [ ] **Docker build:** Verify `docker-compose up` from a clean `docker-compose down -v` produces a seeded database — the seed guard must run inside the container environment, not rely on a pre-existing `fleet.db` volume.
- [ ] **Critical vehicles definition:** Verify the `GET /api/aggregations/critical-vehicles` endpoint actually filters to the last 24 hours from the current time, not from the seed data's timestamp range.
- [ ] **TypeScript strict:** Verify `tsc --noEmit` passes with zero errors — `ts-node-dev` can mask type errors at runtime.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| catchError on outer stream | LOW | Move catchError inside switchMap pipe; add tapResponse |
| synchronize:true wiped seed data | LOW | Re-run seed; add count guard to prevent future wipes |
| undefined params returning all rows | MEDIUM | Switch from findBy to QueryBuilder; retest all filter combinations |
| Missing async error wrapper | LOW | Add asyncHandler wrapper utility; wrap all existing routes |
| Subscription memory leak discovered late | MEDIUM | Audit all .subscribe() calls; replace with async pipe or takeUntilDestroyed |
| WAL mode not set (intermittent SQLITE_BUSY) | LOW | Add PRAGMA journal_mode=WAL after DataSource.initialize() |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| catchError on outer stream kills effects | Phase 3 (ComponentStore) | Trigger an intentional 500; verify next filter change still fires a request |
| synchronize:true data wipe | Phase 1 (DB setup) | Restart server twice; verify event count unchanged |
| undefined filter params returning all rows | Phase 2 (events endpoint) | Call `GET /api/events?vehicleId=` and verify 0 results or 400 |
| Async Express handler crashes on error | Phase 2 (error middleware) | Trigger a DB error; verify 500 JSON response, server stays up |
| Subscription memory leaks | Phase 3 + 4 (components) | Navigate between routes 10x; check Network tab for multiplied requests |
| Wrong flattening operator | Phase 3 (store effects) | Type rapidly in vehicle ID input; verify only last request completes |
| TypeScript strict violations | Phase 1 (tsconfig) | `tsc --noEmit` with zero errors before Phase 2 begins |
| Pagination total using double query | Phase 2 (events endpoint) | Use getManyAndCount(); verify single SQL round-trip in TypeORM logs |
| distinctUntilChanged missing | Phase 3 (store) | Navigate to /events; verify exactly 1 API call on load, not 2+ |
| SQLite WAL mode missing | Phase 1 (DB setup) | Run seeder and API call simultaneously; no SQLITE_BUSY errors |
| Swagger drift | Phase 2 (docs) | Call every endpoint via Swagger UI; verify responses match schemas |
| Docker networking mistake | Phase 5 (Docker) | `docker-compose up` cold start; frontend successfully fetches data |

---

## Sources

- NgRx ComponentStore effects documentation (Context7 / ngrx/platform): https://github.com/ngrx/platform/blob/main/projects/www/src/app/pages/guide/component-store/effect.md
- NgRx `tapResponse` operator: https://github.com/ngrx/platform/blob/main/projects/www/src/app/pages/guide/operators/operators.md
- TypeORM migrations and synchronize warning: https://typeorm.io/docs/migrations/why/
- TypeORM Repository vs QueryBuilder undefined params: https://medium.com/@bloodturtle/typeorm-repository-pattern-vs-querybuilder-handling-undefined-parameters-0e96fda798cc
- TypeORM QueryBuilder pitfalls: https://medium.com/@bloodturtle/common-pitfalls-with-typeorm-querybuilder-in-nestjs-what-you-need-to-watch-out-for-367f136d39e8
- Express async error handling: https://expressjs.com/en/guide/error-handling.html
- Express async error patterns: https://betterstack.com/community/guides/scaling-nodejs/error-handling-express/
- RxJS catchError inner vs outer: https://blog.angular-university.io/rxjs-error-handling/
- switchMap avoiding bugs: https://ncjamieson.com/avoiding-switchmap-related-bugs/
- Angular takeUntilDestroyed: https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed
- Angular OnPush and async pipe: https://blog.angular-university.io/onpush-change-detection-how-it-works/
- Angular code review common mistakes: https://alex-klaus.com/angular-code-review/
- TypeScript code review red flags: https://kodus.io/en/typescript-code-review-guide/
- SQLite WAL mode: https://www.npmjs.com/package/better-sqlite3 (concurrency section)
- TypeORM performance docs: https://typeorm.io/docs/advanced-topics/performance-optimizing/

---
*Pitfalls research for: Fleet Vehicle Diagnostics Console (Express + TypeORM + SQLite + Angular + NgRx ComponentStore)*
*Researched: 2026-02-21*
