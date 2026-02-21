# Fleet Health & Diagnostics Console

## Project

BMW senior fullstack coding assignment. Fleet diagnostics console for operations engineers to monitor vehicle health, search diagnostic events, and explore error patterns.

## Tech Stack

- **Backend:** Express.js 5.x + TypeScript (strict mode)
- **Database:** SQLite + TypeORM 0.3.x
- **Frontend:** Angular 19 (standalone components, SCSS)
- **State:** NgRx ComponentStore + RxJS
- **Validation:** Zod v4
- **Dev server:** tsx (not ts-node-dev)
- **Docs:** swagger-jsdoc + swagger-ui-express
- **Containerization:** Docker + docker-compose

## Monorepo Structure

```
backend/   — Express API server
frontend/  — Angular application
docs/      — Requirements, architecture docs
.planning/ — GSD planning artifacts (tracked in git)
```

## Coding Conventions

- TypeScript strict mode everywhere — no `any` types
- Backend: layered architecture (routes → services → TypeORM entities)
- Frontend: smart/dumb component split — feature components inject store, shared components use @Input/@Output only
- NgRx ComponentStore for state — NOT full NgRx Store
- RxJS: use `switchMap` (not `mergeMap`) for filter-driven API calls, `debounceTime(300)` on filter changes, `tapResponse` for effect error handling (not outer `catchError`)
- Use `takeUntilDestroyed()` for subscription cleanup in components
- Semantic HTML (`<main>`, `<nav>`, `<table>`, `<section>`)

## Key Pitfalls to Avoid

- Never put `catchError` on the outer ComponentStore effect stream — it kills the stream permanently. Use `tapResponse` or `catchError` inside the inner `switchMap` pipe.
- TypeORM `findBy({ field: undefined })` silently returns ALL rows — always check for undefined before adding to where clause.
- `synchronize: true` in TypeORM is for dev seeding only — it rebuilds tables on schema changes.
- Express 5 handles async errors natively — no need for `asyncHandler` wrapper.

## GSD Workflow

This project uses the Get Shit Done (GSD) framework for development.

- Planning artifacts: `.planning/`
- Commands: `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:verify-work`
- Config: `.planning/config.json`
