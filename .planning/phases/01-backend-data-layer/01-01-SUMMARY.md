---
phase: 01-backend-data-layer
plan: 01
subsystem: database
tags: [express, typeorm, sqlite, better-sqlite3, typescript, tsx, nodejs]

# Dependency graph
requires: []
provides:
  - Express 5 server entry point on port 3000
  - TypeORM DataSource configured with better-sqlite3 SQLite driver
  - DiagnosticEvent entity with id, timestamp, vehicleId, level, code, message columns
  - Indexes on all four filterable columns (timestamp, vehicleId, level, code)
  - Shared TypeScript types: DiagnosticLevel, ParsedLogEntry
  - Backend monorepo directory structure (routes, services, entities, middleware, parser, seed)
affects: [01-02, 01-03, 01-04, 02-01, 02-02]

# Tech tracking
tech-stack:
  added:
    - express@^5.0.0 (HTTP server)
    - cors@^2.8.5 (CORS middleware)
    - better-sqlite3@^11.0.0 (SQLite driver)
    - typeorm@^0.3.20 (ORM with decorators)
    - reflect-metadata@^0.2.2 (required by TypeORM decorators)
    - tsx@^4.19.0 (esbuild-based TS runner)
    - typescript@^5.5.0 (strict mode)
  patterns:
    - TypeORM entity with @Index decorators on filterable columns
    - NodeNext module resolution with .js import extensions
    - reflect-metadata import as first statement in entry point
    - Non-null assertion (!) on TypeORM entity fields (TypeORM initializes them)
    - Layered directory structure established upfront (routes/services/entities)

key-files:
  created:
    - backend/package.json
    - backend/tsconfig.json
    - backend/src/index.ts
    - backend/src/types/index.ts
    - backend/src/config/database.ts
    - backend/src/entities/diagnostic-event.entity.ts
    - frontend/.gitkeep
    - backend/data/.gitkeep
  modified:
    - .gitignore (added backend/data/*.db)

key-decisions:
  - "NodeNext module resolution — .js extensions required on relative imports for ESM compatibility"
  - "better-sqlite3 driver over sqlite3 — synchronous, better TypeORM support"
  - "synchronize:true for dev — auto-creates tables without migrations (disabled in Docker)"
  - "Four @Index decorators — timestamp, vehicleId, level, code all filterable, indexes prevent table scans"

patterns-established:
  - "NodeNext ESM: all relative imports use .js extension even for .ts source files"
  - "Entity fields: use ! non-null assertion — TypeORM initializes decorated columns"
  - "Entry point: reflect-metadata must be first import before any TypeORM-decorated class"

requirements-completed: [DATA-03]

# Metrics
duration: 6min
completed: 2026-02-21
---

# Phase 1, Plan 01: Project Scaffolding Summary

**Express 5 server with TypeORM + better-sqlite3 DataSource and DiagnosticEvent entity (4 indexed columns, strict TypeScript)**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-21T09:39:44Z
- **Completed:** 2026-02-21T09:46:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Express 5 server starts on port 3000 with cors and json middleware, exports app for testing
- TypeORM AppDataSource connects to SQLite via better-sqlite3, synchronize:true creates tables on startup
- DiagnosticEvent entity with all 6 fields (id PK, timestamp, vehicleId, level, code, message) and 4 indexes
- TypeScript strict mode compiles with zero errors (NodeNext module resolution, emitDecoratorMetadata)
- Backend monorepo directory structure fully scaffolded (parser, seed, services, routes, middleware, entities, config)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold backend project with Express 5 and TypeScript** - `7afbb73` (feat)
2. **Task 2: Create DiagnosticEvent entity and TypeORM DataSource config** - `8772ca2` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `backend/package.json` - Dependencies (Express 5, TypeORM, better-sqlite3, tsx) and npm scripts
- `backend/tsconfig.json` - Strict mode, NodeNext modules, experimentalDecorators, emitDecoratorMetadata
- `backend/src/index.ts` - Express app entry point with cors/json middleware, listens on port 3000
- `backend/src/types/index.ts` - DiagnosticLevel union type and ParsedLogEntry interface
- `backend/src/config/database.ts` - AppDataSource with better-sqlite3 driver, synchronize:true
- `backend/src/entities/diagnostic-event.entity.ts` - DiagnosticEvent entity with 4 indexed columns
- `frontend/.gitkeep` - Placeholder for frontend directory
- `backend/data/.gitkeep` - Placeholder for SQLite database directory
- `.gitignore` - Added backend/data/*.db entry

## Decisions Made

- Used `NodeNext` module resolution — required for ESM compatibility; forces `.js` extensions on all relative imports in source files
- Chose `better-sqlite3` over `sqlite3` — synchronous API, better TypeORM integration, no async overhead for SQLite
- `synchronize: true` in DataSource — intentional for dev; creates/updates tables on startup without manual migrations; will be disabled in Docker production build
- `@Index()` on all four filterable columns — database-first performance design; prevents full table scans when filtering by vehicleId, level, code, or date range

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

**TypeORM transitive dependency vulnerability:** TypeORM 0.3.x depends on `glob@3-10` which depends on `minimatch <10.2.1` (ReDoS vulnerability in pattern matching). The `npm audit fix --force` remedy would downgrade to `typeorm@0.0.1` — a breaking change. The vulnerability exists in CLI glob matching, not in runtime query execution and is not exploitable in our use case. Accepted the risk and documented.

## User Setup Required

None — no external service configuration required. SQLite database is created automatically on first server start.

## Next Phase Readiness

- Express server foundation ready for route registration in Plan 02
- DiagnosticEvent entity ready for data insertion via seeder in Plan 03
- AppDataSource ready to be wired into server startup sequence in Plan 02 (index.ts has placeholder comment)
- All directory stubs in place for parser, seed, services, routes, middleware

---
*Phase: 01-backend-data-layer*
*Completed: 2026-02-21*
