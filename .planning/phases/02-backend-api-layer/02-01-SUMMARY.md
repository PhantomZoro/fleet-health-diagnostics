# Plan 02-01 Summary — Events Query Endpoint

## What Was Done

Built `GET /api/events` with combinable filters (vehicleId, code, level, from, to), pagination, Zod validation middleware, and global error handling.

## Artifacts Created

| File | Purpose |
|------|---------|
| `backend/src/services/event.service.ts` | EventService.queryEvents() with TypeORM QueryBuilder, dynamic WHERE clauses |
| `backend/src/routes/events.router.ts` | GET /api/events route with @openapi JSDoc annotation |
| `backend/src/middleware/validate.ts` | Generic Zod validateQuery() middleware + eventsQuerySchema |
| `backend/src/middleware/error-handler.ts` | Global errorHandler (500) + notFoundHandler (404) |
| `backend/src/types/index.ts` | Added PaginatedResponse<T> and EventQueryParams interfaces |

## Key Decisions

- **QueryBuilder over repository.findBy:** `findBy({ field: undefined })` silently returns ALL rows — QueryBuilder with explicit `!== undefined` guards is safe.
- **res.locals.validated pattern:** Zod middleware parses and coerces query params, stores result on `res.locals.validated` — route handlers get clean typed data.
- **Express 5 native async:** No asyncHandler wrapper needed — Express 5 catches async errors natively.

## Verification Results

- 510 events, page=1, limit=20 default pagination works
- All 5 filters combinable (vehicleId, code, level, from, to)
- Invalid level → 400, negative page → 400
- Unknown routes → 404 JSON
