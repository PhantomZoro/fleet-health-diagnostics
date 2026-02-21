# Connected Fleet Health & Diagnostics Console

## What This Is

A fleet-wide diagnostics console for connected vehicles, used by operations engineers to monitor vehicle health, investigate diagnostic events and error patterns, get a quick overview of critical issues, and explore data by vehicle, error code, or time window. Built as a BMW senior fullstack developer coding assignment — minimal but realistic fullstack application.

## Core Value

Operations engineers can search, filter, and explore vehicle diagnostic events across multiple dimensions (vehicle, code, severity, time) and immediately see which vehicles need attention.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] REQ-01: System ingests and parses structured vehicle diagnostic log files into a data model (timestamp, vehicleId, level, code, message)
- [ ] REQ-02: Events stored in SQLite via TypeORM for flexible querying and aggregation
- [ ] REQ-03: REST API queries raw events with combinable filters (vehicleId, code, level, time range) with pagination
- [ ] REQ-04: REST API provides aggregated views (errors per vehicle, top error codes, critical vehicles)
- [ ] REQ-05: Frontend dashboard uses NgRx ComponentStore + RxJS observable patterns for state and async operations
- [ ] REQ-06: Frontend supports search/filter panel (vehicle ID, error code, severity, time range)
- [ ] REQ-07: Frontend provides two views on same data — raw events table + aggregated summary dashboard
- [ ] REQ-08: Frontend handles in-flight requests correctly (debounce, switchMap to cancel stale requests)
- [ ] REQ-09: Input validation and structured error handling on all API endpoints
- [ ] REQ-10: OpenAPI/Swagger API documentation served at /api-docs
- [ ] REQ-11: Requirements description document with assumptions
- [ ] REQ-12: Architecture/concept document (backend + frontend)
- [ ] REQ-13: README with setup instructions and prerequisites
- [ ] REQ-14: Docker containerization (Dockerfile + docker-compose)

### Out of Scope

- Real-time WebSocket streaming — assignment says "near-real time", seed data is sufficient
- User authentication — not mentioned in assignment, ops tool assumed internal
- Production database (Postgres/MySQL) — SQLite explicitly suggested
- Polished production UI — assignment says "not required, but thoughtful structure"
- Unit/integration test suite — not explicitly required, prioritize working features
- CI/CD pipeline — not in scope for assignment submission

## Context

- **Assignment source:** BMW senior fullstack developer coding assignment (PDF)
- **Log format:** `[timestamp] [VEHICLE_ID:xxx] [LEVEL] [CODE:xxx] [message]`
- **Severity levels:** ERROR, WARN, INFO
- **Error codes:** Real OBD-II codes (P0300, U0420, P0171, etc.) + BMW-relevant messages
- **"Critical" definition:** Vehicle with 3+ ERROR events in the last 24 hours
- **Seed data:** ~500 events across 15-20 vehicles, spread over 7 days, distribution ~15% ERROR / ~30% WARN / ~55% INFO
- **Interview focus:** RxJS patterns, state management approach, architecture reasoning

## Constraints

- **Tech stack (backend):** Express.js + TypeScript — assignment says "NestJS or Express.js", chose Express for lighter weight
- **Tech stack (database):** SQLite + TypeORM — assignment suggests "SQLite, lowdb, or similar"
- **Tech stack (frontend):** Angular 17+ with standalone components — assignment says "Angular 15+"
- **Tech stack (state):** NgRx ComponentStore + RxJS — assignment requires observable-based state management
- **Deliverables:** Source code, requirements doc, architecture doc, README, API docs, optional Docker

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Express over NestJS | Lighter weight, less boilerplate, shows raw architecture decisions rather than framework magic | -- Pending |
| NgRx ComponentStore over full NgRx Store | Right-sized for single-feature app, less boilerplate than full NgRx, still demonstrates observable patterns | -- Pending |
| SQLite + TypeORM over in-memory/lowdb | Real SQL queries, proper ORM patterns, persists across restarts, shows production-like data access | -- Pending |
| Monorepo (backend/ + frontend/) | Single repo as suggested by assignment, simpler for reviewers | -- Pending |
| Seed data via log file parser | Demonstrates the parser works on real data format, not just synthetic inserts | -- Pending |
| Zod for validation | Lightweight, TypeScript-native, good error messages without heavy framework | -- Pending |

---
*Last updated: 2026-02-21 after initialization*
