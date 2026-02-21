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

## Doc Updates (Enforced by Hook)

After completing each plan (before the metadata commit), update these two files:

1. **`docs/TRACKER.md`** — Check off the completed plan: `- [ ]` → `- [x]`
2. **`docs/BUILD_LOG.md`** — Fill in the phase section with:
   - What was built and why
   - Key decisions made during implementation (table: Decision | Why | Alternative)
   - Tricky parts and how they were solved
   - RxJS patterns used and why (Phase 3+)
   - Patterns demonstrated (architecture, component design, etc.)

Include both files in the plan metadata commit. A PostToolUse hook (`gsd-doc-enforcer.js`) will block the commit if these aren't updated.

## GSD Workflow

Planning artifacts in `.planning/` (3 docs + config):
- `PROJECT.md` — WHAT: project identity, constraints, decisions, scope
- `ROADMAP.md` — HOW: phases, detailed tasks, requirements, success criteria (all-in-one)
- `STATE.md` — WHERE: current position, blockers
- `config.json` — engine settings (research OFF, plan-check OFF — detail is pre-planned)

**Core build loop:**
- `/gsd:plan-phase N` — format ROADMAP detail into executable PLAN.md files
- `/gsd:execute-phase N` — build everything in that plan
- `/gsd:verify-work` — validate phase works after building

**Utilities:**
- `/gsd:progress` — see where we are, route to next action
- `/gsd:quick` — small fixes outside the phase workflow
- `/gsd:pause-work` / `/gsd:resume-work` — session continuity across days
