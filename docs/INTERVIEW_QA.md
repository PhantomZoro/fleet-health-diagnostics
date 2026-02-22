# Interview Q&A — Fleet Health Diagnostics

Anticipated interviewer questions organized by phase. Answers use analogies and first-principles explanations so you can genuinely understand and riff on them in conversation — not just memorize bullets.

---

## Phase 1: Backend Data Layer

### Q: Why Express 5 instead of NestJS?

Think of it like cooking. NestJS is a meal-kit service — it gives you pre-portioned ingredients, step-by-step instructions, and a specific pan to use. You'll get a good meal, but the interviewer can't tell if you *understand cooking* or if you're just good at following instructions.

Express is like shopping at the market and cooking from scratch. I chose to organize my code into layers myself: **routes** (the waiter taking orders), **services** (the chef doing the cooking), and **entities** (the ingredients in the pantry). This three-layer pattern isn't Express forcing me to do it — it's *my architectural decision*. That's exactly what a senior developer assessment should show.

There's also a practical reason: Express 5 (the latest major version) now handles async errors natively. In Express 4, if your route handler had an `async function` that threw an error, Express wouldn't catch it — you needed a wrapper called `asyncHandler`. Express 5 fixed this. Your `async` route throws? Express catches it and sends it to the error handler. One less thing to worry about.

### Q: Why SQLite instead of PostgreSQL?

Imagine you're building a demo kitchen to show your cooking skills. You don't need a commercial oven — a home oven proves you can cook just as well. SQLite is that home oven.

SQLite is a **file-based database**. Instead of running a separate database server (like Postgres or MySQL), the entire database lives in a single file on disk — `fleet.db` in our case. There's zero setup: no installing a database server, no creating users, no connection strings with passwords. The BMW reviewer can clone the repo and run it immediately.

But here's the key: **the patterns I use are production-grade**. I still have:
- Proper entity definitions with typed columns
- Indexes on every column we'll filter by (so queries are fast)
- A QueryBuilder for dynamic filtering (not string concatenation)
- Chunked bulk inserts to respect database limits

If you wanted to swap to PostgreSQL tomorrow, you'd change *one config object* (the DataSource). No code changes needed. That's the beauty of using an ORM — the database is an implementation detail, not a structural decision.

### Q: Why TypeORM over Prisma or Drizzle?

These are all ORMs — tools that let you talk to a database using TypeScript objects instead of writing raw SQL strings.

**TypeORM** uses decorators (the `@Column()`, `@Entity()` annotations you see on entity classes). If you've used Java/Spring or C#/.NET, this feels familiar. The entity class IS the table definition. You look at the class, you see the database schema. One file, one truth.

**Prisma** takes a different approach: you write a separate `schema.prisma` file in its own language, then run a code generator that produces TypeScript types. This adds a build step and means your "truth" is in two places — the schema file and the generated code. For a small project, that's unnecessary overhead.

**Drizzle** is the new kid — lightweight, great TypeScript inference. But it's newer, less battle-tested with SQLite edge cases, and the TypeORM QueryBuilder is more expressive for the kind of dynamic filtering we need in Phase 2 (where the user can combine any filters in any order).

### Q: Why better-sqlite3 over the standard sqlite3 driver?

This is about *synchronous vs asynchronous* operations, which is a fundamental concept.

The standard `sqlite3` npm package is **asynchronous** — when you ask it to run a query, it says "I'll get back to you" and runs it in the background via callbacks. This was designed for network databases where queries take time.

But SQLite isn't a network database. It's a local file. Queries take microseconds. Making them async adds complexity for no benefit — and worse, it can confuse TypeORM's internal operations (like `synchronize`, which needs to create tables in a specific order).

`better-sqlite3` is **synchronous** — ask a question, get the answer immediately. It's like the difference between texting someone in the same room vs. just talking to them. Since SQLite is *right there* on your disk, synchronous is the natural fit. It's also 2-3x faster for reads because there's no event-loop overhead.

### Q: Why `synchronize: true` — isn't that dangerous?

**Yes, in production. Absolutely.**

Here's what `synchronize: true` does: every time the server starts, TypeORM looks at your entity classes and compares them to the actual database tables. If they don't match, it **modifies the tables to match your code**. Added a column? It adds it. Renamed one? It *drops the old column and creates a new one* — losing all the data in that column.

So why use it? Because this is a **dev/demo app with disposable data**. The seed runner repopulates the database from scratch on every clean start. There's nothing to lose. And the alternative — writing migration files (`CREATE TABLE`, `ALTER TABLE`) — is the right production practice but adds overhead that doesn't demonstrate anything useful in a coding assignment.

In the Docker production build, I set `synchronize: false`. If this were a real app with real data, I'd use TypeORM's migration system, which generates SQL files you review and run explicitly.

### Q: Walk me through how the data gets into the database.

Picture a factory assembly line:

**Step 1 — Open the factory (Database Init)**
The server starts and calls `AppDataSource.initialize()`. This connects to SQLite and — because `synchronize: true` — checks that the `diagnostic_event` table exists with the right columns. If not, it creates it. Think of this as "make sure the warehouse is set up before we start filling it."

**Step 2 — Check if we already have inventory (Count Guard)**
`seedDatabase()` asks: "How many events are in the database?" If the answer is more than zero, it says "Already seeded, skipping" and moves on. This is why restarting the server doesn't double the data. It's like checking if the shelves are already stocked before ordering more.

**Step 3 — Read the shipping manifest (Parse Log File)**
It reads `data/seed.log` — a text file with 500 lines, each looking like:
```
[2026-02-14T08:23:15.000Z] [VEHICLE_ID:VH-1001] [ERROR] [CODE:P0300] Random/multiple cylinder misfire detected
```

**Step 4 — Unpack each item (Parse Each Line)**
`parseLogFile()` splits the text into lines. For each line, `parseLogLine()` runs a regex (a pattern matcher) that extracts five fields: timestamp, vehicleId, level, code, and message. If a line doesn't match the pattern (blank, malformed), it returns `null` and logs a warning. No crashes — just "hey, line 47 looked weird, skipping it."

**Step 5 — Put items on shelves (Bulk Insert)**
The parsed entries are converted to `DiagnosticEvent` entity objects and saved to the database in batches of 100. Why batches? Because SQLite can only handle ~999 "?" placeholders per SQL statement, and each event uses 6 (one per column). 100 events x 6 columns = 600 placeholders, safely under the limit.

**Step 6 — Open for business (Start Express)**
Finally, Express starts listening on port 3000. `GET /health` confirms everything worked by returning the event count.

### Q: Why chunk the inserts at 100?

When TypeORM inserts rows, it builds an SQL statement like:
```sql
INSERT INTO diagnostic_event (timestamp, vehicleId, level, code, message)
VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), ...
```

Each `?` is a **bind variable** — a placeholder that gets safely filled with your data (this prevents SQL injection). SQLite has a hard limit: **999 bind variables per statement**. It's compiled into the SQLite C library and can't be changed at runtime.

Each `DiagnosticEvent` has 5 insertable columns (id is auto-generated), so:
- 100 events = 500 variables (safe)
- 200 events = 1000 variables (BOOM — crashes with a cryptic error)

I picked 100 because it's a clean, round number with comfortable headroom. In production with more columns, you'd calculate: `Math.floor(999 / numberOfColumns)`.

### Q: What happens with a malformed log line?

Imagine a mail sorter at a post office. Most envelopes have proper addresses. Some are blank. Some have coffee stains that make the address unreadable. The sorter doesn't throw all the mail on the floor because of one bad envelope — it puts the bad one aside and keeps going.

That's exactly how the parser works:
- `parseLogLine("garbage text")` → returns `null` (not an error, just "I don't understand this")
- `parseLogFile(content)` → for each line that returns `null`, it logs `console.warn('Skipping malformed line 47: garbage text')` and continues
- The final result is an array of only the successfully parsed entries

This is called **graceful degradation**. The system does the best it can with what it's given, rather than failing completely because of one bad input. In production, you'd also track malformed-line metrics to detect if your log format changed upstream.

### Q: Why did you index those four columns?

Think of a database table like a huge phone book. Without indexes, every query is like reading the entire phone book start to finish to find what you want. That's called a **full table scan**.

An index is like the alphabetical tabs on the side of the phone book — it lets the database jump directly to the section it needs.

I indexed the four columns that users will filter by:
- **`timestamp`** — "Show me events from last Tuesday" → the database uses the index to jump to Tuesday's section
- **`vehicleId`** — "Show me all events for VH-1001" → jump directly to that vehicle's entries
- **`level`** — "Show me only ERRORs" → jump to the ERROR section
- **`code`** — "Show me all P0300 errors" → jump to that error code

At 500 rows, the speed difference is negligible (milliseconds either way). But at production scale — millions of events — a full table scan could take seconds while an indexed lookup takes milliseconds. Adding indexes upfront shows I'm thinking about the data access patterns from day one, not bolting on performance fixes later.

The tradeoff? Indexes take extra disk space and make *writes* slightly slower (because the database has to update the index too). For a read-heavy diagnostic dashboard, that's an obvious win.

### Q: Why NodeNext module resolution with .js extensions?

This is one of the most confusing parts of modern TypeScript, so let me break it down.

JavaScript historically had no module system. You just dumped scripts on a page. Then two systems emerged:
- **CommonJS** (`require()` / `module.exports`) — used by Node.js
- **ESM** (`import` / `export`) — the official JavaScript standard

TypeScript can compile to either. We're using ESM because it's the modern standard and TypeORM works better with it.

Here's the weird part: when you write `import { Foo } from './foo.js'` in a `.ts` file, there's no `foo.js` file — you wrote `foo.ts`! But Node doesn't know about TypeScript. When Node *runs* the compiled code, it sees `./foo.js` and looks for that file. TypeScript compiles `foo.ts` into `foo.js`, so the import works.

**NodeNext** module resolution is TypeScript's way of saying "I'll behave exactly like Node does when resolving imports." Node requires file extensions. So TypeScript requires you to write them too, as `.js` (because that's what the output will be).

It feels wrong to write `.js` in a `.ts` file, but it's the correct approach. The alternative — using `CommonJS` mode — would avoid this but creates other headaches with decorator metadata and ESM-only packages.

---

## Phase 2: Backend API Layer

### Q: How does the filtering work on GET /api/events?

Imagine a librarian helping you find books. You might say:
- "I want mystery books" (one filter)
- "I want mystery books published after 2020" (two filters)
- "I want mystery books published after 2020 by a specific author" (three filters)
- Or you might say "Just show me everything" (no filters)

The librarian needs to handle *any combination*. That's what our events endpoint does.

Technically, it uses TypeORM's **QueryBuilder** to construct SQL dynamically:

```typescript
const query = repo.createQueryBuilder('event');

if (vehicleId !== undefined) {
  query.andWhere('event.vehicleId = :vehicleId', { vehicleId });
}
if (level !== undefined) {
  query.andWhere('event.level = :level', { level });
}
if (from !== undefined) {
  query.andWhere('event.timestamp >= :from', { from });
}
// ... and so on
```

Each filter is only added if the user actually provided it. The `andWhere` calls chain together — if you provide vehicleId AND level, you get `WHERE vehicleId = ? AND level = ?`. If you provide nothing, there's no WHERE clause — you get everything.

**Critical pitfall avoided:** TypeORM's simpler `findBy()` method has a trap. If you write `findBy({ vehicleId: undefined })`, you'd expect it to ignore the vehicleId filter. Instead, TypeORM silently returns **ALL rows**. That's a bug that's almost impossible to spot in testing because it looks like it's working — you just get more results than expected. The QueryBuilder approach with explicit `undefined` checks avoids this entirely.

### Q: Why Zod for validation instead of class-validator?

**Validation** means checking that user input is correct before processing it. "Is this a valid date?" "Is this number positive?" "Is 'CRITICAL' a valid severity level?"

**class-validator** (used heavily with NestJS) works with decorators on classes:
```typescript
class QueryDto {
  @IsOptional()
  @IsEnum(['ERROR', 'WARN', 'INFO'])
  level?: string;
}
```
The problem: this class validates at runtime, but TypeScript doesn't know the validation happened. You still need to separately define TypeScript types. Two sources of truth = potential for them to get out of sync.

**Zod** takes a different approach — the schema IS the type:
```typescript
const QuerySchema = z.object({
  level: z.enum(['ERROR', 'WARN', 'INFO']).optional(),
});

type Query = z.infer<typeof QuerySchema>;
// TypeScript now knows: { level?: 'ERROR' | 'WARN' | 'INFO' }
```

One definition → runtime validation AND compile-time types. They can never get out of sync because they're literally the same thing.

Zod also produces beautifully structured error messages:
```json
{
  "error": "Validation failed",
  "details": [
    { "path": ["level"], "message": "Expected 'ERROR' | 'WARN' | 'INFO', received 'CRITICAL'" }
  ]
}
```
These map directly to API 400 responses that frontend developers can parse and display next to form fields.

### Q: How does error handling work in Express 5?

In Express 4, there was an annoying problem. If you wrote:

```typescript
app.get('/events', async (req, res) => {
  const events = await getEventsFromDB(); // This might throw!
  res.json(events);
});
```

And `getEventsFromDB()` threw an error, Express would **not catch it**. The request would just hang forever — no error response, no logging. You had to wrap every route in a `try/catch` or use a helper called `asyncHandler`. Easy to forget, and forgetting meant a silent failure.

**Express 5 fixed this.** It catches rejected promises from async handlers automatically and passes the error to the error-handling middleware. So you can write async routes naturally, and if anything goes wrong, the error flows to one centralized place:

```typescript
// This middleware catches ALL errors (it has 4 arguments — that's how Express knows it's an error handler)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message,
    statusCode,
    details: err.details  // Zod validation details, if any
  });
});
```

Think of it as a safety net at the bottom of a trapeze act. Every route handler is a performer. If anyone falls, the net catches them and handles it gracefully — instead of the audience seeing a disaster.

### Q: What's the "critical vehicles" aggregation logic?

In fleet management, a "critical vehicle" is one that needs immediate attention. We define it as: **a vehicle with 3 or more ERROR-level events in the last 24 hours**.

The SQL behind it is:
```sql
SELECT vehicleId, COUNT(*) as errorCount
FROM diagnostic_event
WHERE level = 'ERROR'
  AND timestamp >= [24 hours before the latest event]
GROUP BY vehicleId
HAVING COUNT(*) >= 3
```

One subtlety: I use "24 hours before the latest event timestamp" rather than "24 hours before *right now*." Why? Because our seed data has fixed timestamps from a specific week. If I used wall clock time, the 24-hour window would be empty (the seed data is "from last week"), and the feature would appear broken in demos. Using the latest event as the anchor makes the demo always work correctly.

In production, you'd use wall clock time (`NOW()`) and possibly make the threshold (3 errors) and window (24 hours) configurable.

### Q: Why swagger-ui-express v5 specifically?

Express 5 changed its internal routing engine (it switched from `path-to-regexp` v1 to v8, which is a complete rewrite). Many Express middlewares that relied on v4 internals broke.

`swagger-ui-express` v4 was one of them — it used Express internals that no longer exist in v5. Version 5 of swagger-ui-express was updated to work with Express 5's new router. If you install v4 with Express 5, you get cryptic middleware errors at startup. This is one of those "I learned this the hard way" things you discover when using Express 5 (which is still relatively new).

---

## Phase 3: Frontend Foundation

### Q: Why NgRx ComponentStore instead of full NgRx Store?

Imagine you're building a filing cabinet for your office.

**Full NgRx Store** is like buying an industrial filing system with 4 separate cabinets:
1. **Actions cabinet** — paper forms for every possible action ("LOAD_EVENTS", "LOAD_EVENTS_SUCCESS", "LOAD_EVENTS_FAILURE", "SET_FILTERS", etc.)
2. **Reducers cabinet** — rule books for how each action changes the files
3. **Effects cabinet** — side-effect handlers (when form X arrives, make this API call)
4. **Selectors cabinet** — pre-defined queries to find specific files

This is powerful for large apps with many teams. The indirection (everything goes through action forms) creates clear boundaries and great debugging (you can replay actions).

**ComponentStore** is like a single smart filing cabinet that handles everything in one place. State, updates, API calls, and queries — all in one class. For an app with **one data domain** (diagnostics), the full NgRx system would mean writing ~15 files for what ComponentStore does in one.

But ComponentStore still uses all the same **RxJS patterns** that matter for the interview: observables, switchMap, debounceTime, combineLatest, error handling. It's not a shortcut — it's right-sizing the solution to the problem.

### Q: Why switchMap and not mergeMap for API calls?

This is one of the most important RxJS concepts. Let me explain with a real scenario.

You're searching for vehicles. You type "VH-10" and the app fires an API request. Then you keep typing: "VH-1001". Now there are potentially two requests in flight.

**With `mergeMap`** (the wrong choice here):
Both requests fly simultaneously. Request 1 ("VH-10") might return 200 results. Request 2 ("VH-1001") returns 15. But what if Request 1 is slower (maybe the database had to scan more rows)? The timeline could be:
1. You type "VH-1001" → Request 2 fires
2. Request 2 comes back → table shows 15 events for VH-1001 (correct!)
3. Request 1 comes back late → table now shows 200 events for "VH-10" (WRONG!)

The user sees a flash of correct results followed by stale results. This is called a **race condition**.

**With `switchMap`** (the right choice):
When Request 2 fires, `switchMap` **cancels** Request 1. It says "I don't care about that old request anymore, I only want the latest." So:
1. You type "VH-1001" → Request 2 fires, Request 1 is cancelled
2. Request 2 comes back → table shows 15 events for VH-1001 (correct, always)

The word "switch" literally means "switch to the new thing and abandon the old thing." It's the perfect operator for search/filter scenarios where only the latest user intent matters.

**When would you use `mergeMap`?** When every request matters independently. Like sending emails — if the user queues 3 emails, you want all 3 to send, not cancel the first two.

### Q: Why debounceTime(300)?

Imagine a really eager assistant. Every time you say a letter, they sprint to the filing cabinet:
- You: "V" → assistant sprints off
- You: "H" → assistant sprints off again
- You: "-" → sprint
- You: "1" → sprint
- You: "0" → sprint
- You: "0" → sprint
- You: "1" → sprint

That's 7 trips to the filing cabinet (7 API calls) when you only needed 1. Most of those intermediate results are useless.

`debounceTime(300)` tells the assistant: **"Wait 300 milliseconds after I stop talking before you go."**
- You type "VH-1001" (takes about 1 second)
- Assistant waits 300ms of silence...
- Then makes ONE trip to the filing cabinet

300ms is the sweet spot from UX research:
- Under 200ms: Still fires too often during normal typing
- 300ms: Catches the natural pause between typing bursts
- Over 500ms: Feels sluggish — user wonders "did it register?"

**Why not `throttleTime`?** `throttleTime(300)` does the opposite — it fires immediately on first keypress, then ignores everything for 300ms. So you'd get the "V" request immediately (useless), then "VH-1" 300ms later (also useless). We don't want the first value — we want the **last** value after the user stops.

### Q: Explain combineLatest for filters + page.

You're at a restaurant with a build-your-own-meal system. You choose:
- **Protein** (filters): chicken, beef, or tofu
- **Side** (page number): rice, salad, or fries

To place an order, the kitchen needs BOTH choices. `combineLatest` is the waiter who watches both choices and places a new order whenever either one changes:

1. You pick chicken + rice → waiter orders "chicken with rice"
2. You change to beef (same side) → waiter orders "beef with rice"
3. You change to salad (same protein) → waiter orders "beef with salad"

In code:
```typescript
combineLatest([filters$, page$])
```

This emits whenever either `filters$` or `page$` changes, always combining the latest value from both. So:
- User changes a filter → API call with new filter + current page
- User clicks "next page" → API call with current filters + new page

**Why not `withLatestFrom`?** It only listens to the LEFT side. `filters$.pipe(withLatestFrom(page$))` would fire when filters change (with the latest page), but clicking "next page" would do NOTHING because page$ is passive. The user clicks page 2, 3, 4 — nothing happens. Only changing a filter would trigger a fetch. That's broken.

### Q: Why tapResponse instead of catchError?

This is the single most common NgRx bug, and it's subtle enough that even experienced developers get bitten.

Think of a ComponentStore effect as a **conveyor belt** in a factory. Items (filter changes) come in one end, pass through a processing station (API call), and come out the other end (state updates).

**The wrong way — `catchError` on the outer stream:**
```typescript
this.loadEvents = this.effect(
  filters$.pipe(
    switchMap(filters => api.getEvents(filters)),
    catchError(err => {  // DON'T DO THIS
      this.setError(err);
      return EMPTY;
    })
  )
);
```

When an error happens, `catchError` replaces the error with `EMPTY` (nothing). But `EMPTY` **completes** the stream. Completing means "this conveyor belt is done forever." The belt stops running. Future filter changes go in one end and... nothing happens. The user changes filters, nothing loads. No error message, no loading spinner — just silence. The effect is permanently dead.

This is extremely hard to debug because it only breaks *after* the first error. During normal testing everything works fine.

**The right way — `tapResponse` inside switchMap:**
```typescript
this.loadEvents = this.effect(
  filters$.pipe(
    switchMap(filters => api.getEvents(filters).pipe(
      tapResponse({
        next: events => this.setEvents(events),
        error: err => this.setError(err),
      })
    ))
  )
);
```

`tapResponse` handles the error *inside the inner pipe* (inside the `switchMap`). The inner observable (one API call) fails and is handled, but the outer conveyor belt keeps running. Next filter change? New API call. The belt never stops.

It's the difference between a factory worker dropping one item (inner error — recoverable) vs. the whole conveyor belt being shut down (outer error — catastrophic).

### Q: How do you handle subscription cleanup?

In Angular, when a component subscribes to an observable, it needs to **unsubscribe** when the component is destroyed (removed from the page). If you forget, the subscription keeps running in the background — a **memory leak** that can cause:
- Increasing memory usage over time
- Stale callbacks running against destroyed components
- Multiple redundant subscriptions if the user navigates back and forth

**The old way** (Angular <16):
```typescript
class MyComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.store.events$.pipe(
      takeUntil(this.destroy$)  // Stop when destroy$ emits
    ).subscribe(...);
  }

  ngOnDestroy() {
    this.destroy$.next();    // Emit "destroy" signal
    this.destroy$.complete(); // Clean up
  }
}
```
Three extra pieces of boilerplate, and forgetting any of them means a leak.

**The new way** (Angular 16+):
```typescript
class MyComponent {
  constructor() {
    this.store.events$.pipe(
      takeUntilDestroyed()  // That's it. Done.
    ).subscribe(...);
  }
}
```

`takeUntilDestroyed()` hooks into Angular's `DestroyRef` system. When the component is removed from the DOM, it automatically unsubscribes. One function call, impossible to forget, no manual cleanup needed.

### Q: What do distinctUntilChanged and shareReplay(1) do on selectors?

These two operators solve different problems. Let me explain each.

**`distinctUntilChanged`** — The "only notify me if something actually changed" operator.

Imagine a weather app showing the temperature. The weather service updates every minute. Most minutes, the temperature hasn't changed. Without `distinctUntilChanged`, your component re-renders every minute even when the value is identical. With it, re-rendering only happens when the temperature actually changes.

In our store, if the user triggers a state update that doesn't change `loading$` (it was `true`, it's still `true`), components watching `loading$` won't re-render. Less unnecessary work.

**`shareReplay(1)`** — The "remember the last value and share it" operator.

Without it, each subscriber gets its own independent execution of the selector pipeline. If 3 components subscribe to `events$`, the selector runs 3 times. Also, if a component subscribes *after* the data was already loaded, it gets nothing — it missed the emission.

With `shareReplay(1)`:
- The selector runs ONCE and the result is shared with all subscribers (efficiency)
- The latest value is "replayed" to new subscribers immediately (no missed data)

The `1` means "remember the last 1 value." Think of it as a billboard: everyone driving by sees the same message, and it stays up until a new message replaces it.

---

## Phase 4: Frontend Views

### Q: What's the smart/dumb component split?

Think of a restaurant kitchen:
- **Smart components** = the head chef. They know the menu, talk to suppliers (the store), decide what to cook, and coordinate everything. They have *knowledge* and *make decisions*.
- **Dumb components** = the kitchen equipment (oven, mixer, cutting board). They do exactly one thing well, they don't know about the menu or suppliers, and any chef can use them.

In code:

**Smart component** (EventsComponent):
```typescript
class EventsComponent {
  private store = inject(DiagnosticsStore);  // Knows about the store
  events$ = this.store.events$;              // Subscribes to state

  onFilterChange(filters: EventFilters) {
    this.store.setFilters(filters);           // Makes decisions
  }
}
```

**Dumb component** (FilterPanel):
```typescript
class FilterPanelComponent {
  @Input() currentFilters!: EventFilters;     // Data comes IN via Input
  @Output() filterChange = new EventEmitter(); // Events go OUT via Output

  // No store, no services, no dependencies
}
```

Why this split?
1. **Reusability**: The FilterPanel can be used in any view, with any store, for any data type
2. **Testability**: Testing the FilterPanel doesn't require mocking a store or HTTP service — just pass inputs, check outputs
3. **Maintainability**: If the state management changes (e.g., you swap ComponentStore for signals), only the smart components change. Dumb components are untouched.

### Q: Why OnPush change detection everywhere?

Angular's **change detection** is how it keeps the UI in sync with the data. When data changes, Angular re-renders the affected parts of the page.

**Default change detection** is like a paranoid security guard. *Every* time anything happens — a click, a keystroke, a timer tick, an HTTP response — the guard checks EVERY component in the entire app. "Did you change? Did you? What about you?" With a table of 500 events, that's 500 row components being checked on every mouse movement. Wasteful.

**OnPush change detection** is like a smart security guard with a notification system. It only checks a component when:
1. One of its `@Input()` references changes (someone passed new data)
2. An event fires inside it (user clicked something IN this component)
3. An `async` pipe gets a new value (the observable emitted)

Everything else? Ignored. The guard doesn't bother checking unless there's a reason to.

For a data table with 500 rows, this is the difference between checking 500 components on every mouse move vs. checking only the 1 component that was actually affected. It's essentially free performance — all you do is add `changeDetection: ChangeDetectionStrategy.OnPush` to the component decorator.

### Q: How does clicking a critical vehicle navigate to the events view?

This is an example of **store-mediated navigation** — the store acts as a communication bridge between two views that never directly talk to each other.

The flow:
1. User is on the **Dashboard** view, sees "VH-1001: 5 errors" in the critical vehicles section
2. They click on VH-1001
3. The Dashboard's smart component does two things:
   ```typescript
   this.store.setFilters({ vehicleId: 'VH-1001' });  // Pre-fill the filter
   this.router.navigate(['/events']);                    // Navigate to events view
   ```
4. The **Events** view loads. Its smart component subscribes to `this.store.filters$`
5. The store already has `vehicleId: 'VH-1001'` in its state
6. The Events view renders with that filter active — showing only VH-1001's events

The Dashboard and Events views don't know about each other. They both know about the store. The store is the single source of truth for "what filters are active." This is a core benefit of centralized state management — views can share state without being coupled.

### Q: How does the error interceptor work?

Think of a postal service. Every letter (HTTP request) your app sends goes through a central post office (the interceptor). The post office checks every response that comes back:

- **Normal response?** Pass it through, nothing to do.
- **Error response (500, 404, etc.)?** Log it, create a notification toast for the user, and then pass the error along so the calling code can also handle it.

```typescript
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError(error => {
      notificationService.showError(error.message);  // Toast for the user
      return throwError(() => error);                  // Re-throw so calling code can react too
    })
  );
};
```

The toast notification system works like this:
1. **NotificationService** maintains a list of active toasts (an observable array)
2. When an error arrives, it pushes a new toast with the message
3. **ToastComponent** (always rendered at the top of the app) subscribes to this list and displays floating notifications
4. Each toast auto-removes after 5 seconds

This is app-wide — every HTTP error gets a user-visible notification without any component having to implement its own error display. You write error handling once, it works everywhere.

---

## Vehicle Features: Fleet Grid + Vehicle Detail

### Q: Why did you add a fleet overview grid and vehicle detail page?

Think about how an operations engineer actually works. Before these pages, the app had two views: a dashboard (aggregated numbers) and an events table (raw data). That's like having a telescope and a microscope but nothing in between.

The **fleet grid** is the middle ground — it answers "which vehicles need attention right now?" at a glance. Each vehicle is a card with a color-coded health status: red for critical, orange for warning, green for healthy. An engineer walks up, scans the grid, and immediately spots the red cards. No filtering, no scrolling through tables — just visual pattern recognition.

The **vehicle detail page** is the investigation screen. You clicked a red card — now you see everything about that vehicle in one place: how many errors, warnings, and info events it has; when it was first and last seen; what error codes keep recurring; and what happened recently. Before this, you'd have to go to the events table, type in the vehicle ID, and mentally piece together the story from rows of data.

The drill-down flow is intentional: **Fleet Grid** (scan the fleet) -> **Vehicle Detail** (investigate one vehicle) -> **Events Table** (deep-dive into specific events). Each step narrows focus. This mirrors how real incident investigation works — start broad, narrow down.

### Q: Why use Promise.all for the vehicle summary endpoint?

The vehicle summary needs four pieces of data: severity counts, time range (first/last seen), top codes, and recent events. These four queries are completely independent — none needs the result of another.

Without `Promise.all`, you'd run them sequentially:
```
Query 1: severity counts     → 5ms
Query 2: first/last seen     → 3ms
Query 3: top 10 codes        → 4ms
Query 4: recent 10 events    → 4ms
Total: 16ms (sequential)
```

With `Promise.all`, they run in parallel:
```
All 4 queries start simultaneously → longest one takes 5ms
Total: ~5ms (parallel)
```

That's a 3x speedup for free. With SQLite on local disk, the absolute numbers are small. But this pattern matters at scale — imagine PostgreSQL with network latency where each query takes 20-50ms. Sequential would be 80-200ms; parallel would be 50ms. For a detail page that users expect to load instantly, that difference is noticeable.

The key requirement for `Promise.all` is that queries are **independent**. If query 3 needed the result of query 1, you couldn't parallelize them. But since all four just filter by `vehicleId`, they can safely run simultaneously.

### Q: How does the health status derivation work?

Health status is a derived property, not stored data. The system computes it differently depending on context:

**In the fleet grid** (FleetOverviewComponent):
- Load two existing endpoints: `errors-per-vehicle` and `critical-vehicles`
- Build a `Set` of critical vehicle IDs
- For each vehicle: if in the critical set → **CRITICAL**, else if errorCount > 0 → **WARNING**, else → **HEALTHY**

**In the vehicle detail** (VehicleDetailComponent):
- Use the vehicle summary's `errorCount`
- If errorCount >= 3 → **CRITICAL**, else if errorCount > 0 → **WARNING**, else → **HEALTHY**

Why different logic? The grid uses the critical-vehicles endpoint which applies the business rule (3+ ERRORs in trailing 24h). The detail page uses a simpler threshold because the vehicle summary doesn't include the 24h window calculation — it shows all-time counts. This is a pragmatic trade-off: the grid gives the "current situation" view, the detail gives the "overall health" view.

The health status is computed in the store, not in the component. The store exposes a `detailHealthStatus$` selector that derives the status from `vehicleDetail$`. Components just read the result — they don't contain business logic.

### Q: Why a separate VehicleStore instead of extending DiagnosticsStore?

Single responsibility. DiagnosticsStore manages events, pagination, filters, and aggregations — that's already a lot of state. Adding fleet grid cards and vehicle detail data would bloat it further and create unnecessary re-renders (changing a filter would trigger selectors for vehicle data that hasn't changed).

VehicleStore is focused: fleet grid loading and vehicle detail loading. Two effects, clean state shape, no cross-contamination with event filtering logic.

Both stores follow the same patterns: `ComponentStore<T>`, component-level `providers`, `switchMap` for API calls, inner `catchError` returning `EMPTY`, `takeUntilDestroyed` for cleanup. The consistency demonstrates that the patterns are understood, not copy-pasted.

There's also a lifecycle benefit: FleetOverviewComponent provides its own VehicleStore. When you navigate away, the store is destroyed. Navigate back, fresh store, fresh data load. No stale fleet cards from 10 minutes ago.

### Q: How does the VehicleCard component stay keyboard accessible?

The card is an `<article>` element with `tabindex="0"` (makes it focusable) and `role="button"` (tells screen readers it's clickable). It handles both `(click)` and `(keydown)` events:

```typescript
onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    this.vehicleClick.emit(this.vehicle.vehicleId);
  }
}
```

`event.preventDefault()` on Space prevents the page from scrolling. The `aria-label` describes the action: "View details for VH-1001".

This is the dumb component pattern in action — the card doesn't know about routing. It emits a `vehicleClick` event, and the smart parent (FleetOverviewComponent) handles navigation. If you wanted to reuse the card in a different context (say, a comparison panel), the navigation would be different but the card component stays unchanged.

### Q: How does the breadcrumb navigation work in the vehicle detail page?

The detail page has a breadcrumb: `Fleet Overview / VH-1001`. "Fleet Overview" is a `routerLink` back to `/vehicles`. The vehicle ID is read from `ActivatedRoute.paramMap`:

```typescript
this.route.paramMap.pipe(
  map(params => params.get('id') ?? '')
).subscribe(vehicleId => {
  if (vehicleId) {
    this.store.loadVehicleDetail(vehicleId);
  }
});
```

This subscribes to `paramMap` (not `params`), which means if the route parameter changes without destroying the component (e.g., browser history navigation), the store loads the new vehicle. The "View All Events" link at the bottom uses `[queryParams]="{ vehicleId: detail.vehicleId }"` to deep-link to the events table pre-filtered for this vehicle.

The navigation hierarchy is: Dashboard (overview) -> Fleet Grid (scan) -> Vehicle Detail (investigate) -> Events (analyze). Every click target throughout the app now routes to `/vehicles/:id` instead of directly to the events table — giving each vehicle a dedicated profile before the user drops into raw event data.

---

## Phase 5: Integration & Delivery

### Q: Walk me through the Docker setup.

Docker packages your app into a "container" — a lightweight, isolated environment that includes everything needed to run. Think of it as shipping a product in a box that includes its own batteries, instructions, and even the air it needs. The receiver doesn't need to install anything.

We have two containers: **backend** and **frontend**. Each uses a **multi-stage build** to keep the final image small.

**Backend Dockerfile** — two stages:
```
Stage 1 ("builder"): Full Node.js image with TypeScript compiler
  → Copy source code
  → Run `npm install` (includes dev dependencies like TypeScript)
  → Run `tsc` to compile TypeScript → JavaScript

Stage 2 ("runner"): Slim Node.js Alpine image (tiny, ~50MB)
  → Copy ONLY the compiled JavaScript + production node_modules
  → TypeScript, type definitions, dev tools? Left behind in Stage 1
  → Result: tiny image with only what's needed to RUN
```

**Frontend Dockerfile** — two stages:
```
Stage 1 ("builder"): Full Node.js image with Angular CLI
  → Run `ng build --configuration production`
  → Angular compiles all TypeScript/SCSS into optimized static files (HTML, CSS, JS bundles)

Stage 2 ("runner"): nginx Alpine image (even tinier, ~20MB)
  → Copy ONLY the static files from Stage 1 into nginx's serving directory
  → nginx serves these files to browsers
  → Also proxies /api/* requests to the backend container
```

**docker-compose.yml** ties them together:
```yaml
services:
  backend:
    build: ./backend
    ports: ["3000:3000"]
  frontend:
    build: ./frontend
    ports: ["4200:80"]
    depends_on: [backend]
```

The BMW reviewer runs `docker-compose up`, waits a minute, opens `localhost:4200`, and the entire app is running. No Node.js installation, no `npm install`, no database setup. That's the power of containerization.

### Q: Why nginx for the frontend instead of serving from the backend?

A common shortcut is to put the compiled Angular files in a `public/` folder on the Express server and have Express serve them. It works, but it's like having your chef also work as the waiter — they can do it, but it's not their job and they'll do it poorly.

**nginx** is purpose-built for serving static files. It's like a specialized vending machine:
- **Compression**: Automatically gzips HTML/CSS/JS files, reducing transfer size by 60-80%
- **Caching headers**: Tells browsers to cache files so repeat visits are instant
- **HTTP/2**: Serves multiple files simultaneously over one connection
- **Tiny footprint**: ~5MB of RAM, handles thousands of concurrent connections

**Express** is built for dynamic API logic — processing requests, querying databases, running business logic. Having it also serve static files wastes its strengths on a job nginx does 10x better.

There's also an architectural benefit: the frontend and backend can **scale independently**. If 1000 users are viewing the dashboard (lots of static file requests) but only making occasional API calls, you can run 5 nginx containers and 1 backend container. With a combined server, you'd have to scale both together.

### Q: What would you add with more time?

In priority order, and here's *why* each one matters:

1. **Unit tests** — Currently, the code's correctness depends on manual testing and TypeScript's type system. Tests would cover the tricky parts: Does the QueryBuilder build the right SQL when only some filters are provided? Does the ComponentStore effect survive an error? Does the parser handle edge cases? I'd use Jest for backend (fast, great mocking) and Angular's built-in Jasmine/Karma for frontend components and store effects.

2. **Real-time updates** — Right now, the dashboard is a snapshot. In a real fleet management system, new diagnostic events arrive constantly. I'd add **Server-Sent Events (SSE)** — simpler than WebSockets for one-way server→client data. The backend pushes new events, the frontend appends them to the store. The dashboard updates live without the user refreshing.

3. **Authentication** — This is an operations tool that shows vehicle diagnostics. In production, you'd want JWT-based auth with role-based access: "viewer" can see data, "admin" can configure thresholds. I didn't add it because the assignment doesn't mention it and it would distract from the core fullstack patterns being demonstrated.

4. **PostgreSQL** — SQLite is perfect for this demo, but production fleet data would be millions of events. PostgreSQL gives you connection pooling (handling hundreds of concurrent API requests), better concurrent write performance, and advanced features like full-text search and JSON columns.

5. **Time-series charts** — Operations engineers think visually. A line chart showing "error frequency over the last 7 days" tells a story that a number can't. I'd use Chart.js (lightweight, good Angular integration) to add a trend line to the dashboard. Spikes in the chart immediately draw attention to problem periods.

6. **CSV/PDF export** — Managers want reports. Adding a "Download as CSV" button on the events table lets users pull filtered data into Excel for further analysis. It's a small feature with high perceived value.

### Q: What assumptions did you make?

Every project makes assumptions — the key is being aware of them and being able to defend them:

- **Log format is consistent**: I designed a structured format `[TIMESTAMP] [VEHICLE:ID] [LEVEL] [CODE:X] message`. Real BMW diagnostic logs are probably more complex — multiple formats, varying fields, possibly binary protocols (like UDS/OBD-II raw frames). For the assignment, a clean text format demonstrates parsing skills without drowning in format complexity. The parser is designed to be swappable — change `parseLogLine()` and everything else still works.

- **"Critical" = 3+ ERRORs in 24h**: This threshold is hardcoded but would be configurable in production. Different fleets might have different sensitivity requirements — a race team might alert on 1 error, a rental fleet might tolerate 5. I'd make this a configurable constant, or even a database setting that admins can adjust.

- **500 events is enough for a demo**: It exercises every feature (filtering, pagination, aggregation, critical vehicles) without making the reviewer wait for data to load. Production would be millions of events, which is why indexes and efficient queries matter even though they're "overkill" at 500 rows.

- **No authentication needed**: The assignment doesn't mention it, and adding auth would shift focus away from the fullstack patterns (RxJS, TypeORM, layered architecture) that the assessment is evaluating. In production, this would be behind BMW's corporate SSO/LDAP.

- **OBD-II codes are representative**: I used 11 real diagnostic codes from all 4 categories (Powertrain, Network, Body, Chassis). Real BMW vehicles have thousands of proprietary codes. The important thing is the *system* handles any code format — `[A-Z]\d{4}` — so adding more codes is a data change, not a code change.

---

## Cross-Cutting Questions

### Q: Why this tech stack specifically?

Every technology in the stack was chosen because it demonstrates a specific skill, not because it's "popular" or "trendy."

| Technology | What it demonstrates |
|------------|---------------------|
| **Express 5** | I can design architecture from scratch — layered services, proper error handling, middleware chains — without a framework doing it for me. NestJS would hide these decisions behind decorators. |
| **TypeORM** | I understand ORM patterns, entity relationships, QueryBuilder for dynamic queries, and database pitfalls (like the `findBy(undefined)` trap). |
| **SQLite** | I can work with real SQL (not just NoSQL). The assignment suggests it, and it proves the patterns work without operational overhead. |
| **Angular 19** | Assignment requirement. Standalone components (no NgModules) is the modern Angular approach, showing I'm current. |
| **ComponentStore** | I know when NOT to over-engineer. Full NgRx Store would be 15+ files of boilerplate for a single data domain. ComponentStore proves all the same reactive patterns in a fraction of the code. |
| **Zod** | TypeScript-native validation that's both a runtime check and a compile-time type. One source of truth, no sync issues between types and validation. |
| **Docker** | The reviewer can run everything with one command. No "works on my machine" — the container IS the machine. Also demonstrates understanding of multi-stage builds and production deployment. |

The key insight: the stack is **deliberately minimal**. Every piece earns its place by demonstrating a skill. There's no Redis (no caching needed), no GraphQL (REST is sufficient), no WebSockets (not in scope). Adding tools you don't need signals over-engineering, not competence.

### Q: How did you ensure code quality without tests?

Multiple layers of safety, each catching a different class of bug:

1. **TypeScript strict mode** — The compiler catches type mismatches, null access, missing returns, and more. No `any` types anywhere means the compiler has full visibility into every function call. Think of strict mode as having a proofreader who reads every sentence — not just for spelling, but for logical consistency.

2. **Zod runtime validation** — All API inputs are validated before reaching business logic. If someone sends `level=CRITICAL` (invalid), Zod rejects it with a clear message before it can cause a downstream error. This is the bouncer at the door.

3. **Layered architecture** — Each layer has one job. Routes don't query the database. Services don't format HTTP responses. Entities don't contain business logic. When each piece does one thing, bugs are isolated — a broken query doesn't affect routing.

4. **Seed data as integration test** — The seed runner exercises the full pipeline on every fresh start: file reading → parsing → validation → database insertion. If any piece is broken, the server fails to start — you know immediately.

5. **Health endpoint as smoke test** — `GET /health` returns the event count. After starting the server, one curl command confirms the entire data layer works end-to-end.

Tests would be the **#1 addition** with more time. Specifically: unit tests on the QueryBuilder logic (most complex backend code), ComponentStore effects (most complex frontend code), and the parser (edge cases with malformed input).

### Q: What's the most interesting technical decision in this project?

The **RxJS operator choices** in the ComponentStore. Here's why.

Most coding decisions have one right answer. "Should I use an index on this column?" — obviously yes. "Should I validate API input?" — obviously yes.

But RxJS operators present a matrix of choices where **each option works but has different behavior**, and the differences only show up under specific conditions (rapid user input, slow networks, error scenarios). Picking the wrong one creates bugs that don't appear in normal testing.

Here's the decision matrix for the events-loading effect alone:

| Decision point | Correct choice | Wrong choice | What goes wrong |
|---|---|---|---|
| How to map filter changes to API calls | `switchMap` | `mergeMap` | Stale results overwrite fresh ones (race condition) |
| How to rate-limit filter changes | `debounceTime(300)` | `throttleTime(300)` | Fires on first keystroke (useless partial query) |
| How to combine filters + page | `combineLatest` | `withLatestFrom` | Page changes are silently ignored |
| How to handle API errors | `tapResponse` (inner) | `catchError` (outer) | Effect stream dies permanently on first error |

Getting all four right means the search experience is responsive, efficient, error-resilient, and correct under rapid input. Getting any single one wrong creates a subtle bug that might not appear until a real user hammers the UI.

This is what separates senior from mid-level: not knowing the operators exist, but knowing **which one and why** for each specific scenario.

---

### Q: Walk me through the full drill-down user journey.

1. Engineer opens `/vehicles` — sees 20 vehicle cards in a responsive grid. Red-bordered cards for critical vehicles jump out visually.
2. Clicks a red card (VH-1005) — navigates to `/vehicles/VH-1005`. Sees: 8 errors, 3 warnings, 2 info events. Top code is P0300 (cylinder misfire) with 4 occurrences. Recent events table shows the last 10 events in chronological order.
3. Wants to see all events — clicks "View All Events" at the bottom. Navigates to `/events?vehicleId=VH-1005`. Events table is pre-filtered.
4. From the Dashboard, clicks a critical vehicle alert — goes directly to `/vehicles/VH-1005` (not events).
5. In the events table, clicks any vehicleId cell — goes to that vehicle's detail page.

Every vehicle ID in the app is now a clickable link to the vehicle detail page. The events table, dashboard bar chart labels, and critical vehicle alerts all route to `/vehicles/:id`. This creates a consistent mental model: "click a vehicle ID = see its profile."

---

*Prepared for BMW senior fullstack developer coding assignment interview.*
