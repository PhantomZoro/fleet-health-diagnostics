# Connected Fleet Health & Diagnostics Console

## What This Is

BMW senior fullstack coding assignment. Fleet diagnostics console for operations engineers to monitor vehicle health, search diagnostic events, explore error patterns, and identify critical vehicles. Minimal but realistic fullstack application.

## Core Value

Operations engineers can search, filter, and explore vehicle diagnostic events across multiple dimensions (vehicle, code, severity, time) and immediately see which vehicles need attention.

## Context

- **Log format:** `[timestamp] [VEHICLE_ID:xxx] [LEVEL] [CODE:xxx] [message]`
- **Severity levels:** ERROR, WARN, INFO
- **Error codes:** Real OBD-II codes (P0300, U0420, P0171, etc.) + BMW-relevant messages
- **"Critical" definition:** Vehicle with 3+ ERROR events in the last 24 hours
- **Seed data:** ~500 events across 15-20 vehicles, spread over 7 days, distribution ~15% ERROR / ~30% WARN / ~55% INFO

## Constraints

- **Backend:** Express.js 5.x + TypeScript strict mode (not NestJS — lighter, shows raw architecture)
- **Database:** SQLite + TypeORM 0.3.x (not lowdb — real SQL, proper ORM, persists across restarts)
- **Frontend:** Angular 19 standalone components + SCSS (assignment requires Angular 15+)
- **State:** NgRx ComponentStore + RxJS (not full NgRx Store — right-sized, less boilerplate)
- **Validation:** Zod v4 (TypeScript-native, clean error messages)
- **API docs:** swagger-jsdoc + swagger-ui-express v5
- **Dev server:** tsx (not ts-node-dev — esbuild-based, no ESM friction)
- **Container:** Docker + docker-compose

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Express over NestJS | Shows raw architecture decisions, not framework magic |
| ComponentStore over NgRx Store | Right-sized for single-feature app, still demonstrates observable patterns |
| SQLite + TypeORM over lowdb | Real SQL queries, indexes, proper ORM patterns |
| Seed via log file parser | Proves parser works on real data format, not synthetic inserts |
| Zod for validation | Lightweight, TypeScript-native, good error messages |

## Out of Scope

- WebSocket real-time streaming (seed data sufficient)
- User authentication (internal ops tool)
- Charts/visualizations (simple lists and bars suffice)
- Unit/integration tests (not required, prioritize working features)
- CI/CD pipeline
- Full NgRx Store (over-engineered for this scope)

## Deliverables (per BMW PDF)

1. Source code (monorepo via GitHub)
2. Requirements document with assumptions
3. Architecture/concept document (backend + frontend)
4. README with setup instructions
5. OpenAPI/Swagger API docs
6. Docker containerization

---
*Last updated: 2026-02-21*
