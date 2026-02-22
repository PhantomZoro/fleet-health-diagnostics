<div align="center">

# Fleet Health & Diagnostics Console

**Fleet monitoring dashboard for operations engineers**

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Angular](https://img.shields.io/badge/Angular-19-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## What It Does

Hundreds of fleet vehicles generate thousands of diagnostic events. This dashboard helps engineers find the ones that need attention — fast.

It works in three layers:

1. **Fleet grid** — All vehicles at a glance, color-coded by health (critical / warning / healthy). Spot problems in seconds.
2. **Vehicle detail** — Pick a vehicle, see its severity breakdown, top error codes, and recent events. Everything on one page.
3. **Events table** — Searchable, filterable, paginated log of every diagnostic event. Combine filters (vehicle, code, severity, date range) to dig into specifics.

The intended workflow: **scan the grid** -> **investigate a vehicle** -> **analyze its events**.

---

## Features

**Fleet Overview** — Responsive card grid with health indicators. Red = critical (3+ errors in 24h), orange = warning, green = healthy. Click any card to drill in.

**Vehicle Detail** — Per-vehicle profile: 5-stat summary, error code breakdown with severity badges, recent events, and a link to the full filtered events view.

**Dashboard** — KPI cards (total events, vehicles, critical count, most common code), per-vehicle bar chart with stacked severity, top 10 codes, and a critical vehicle alert list.

**Events Table** — Paginated table with 5 combinable filters. Severity badges for visual triage. Vehicle IDs link to detail pages. Supports deep-linking via URL params (e.g., `/events?vehicleId=VH-1001`).

**API Docs** — Swagger UI at `/api-docs` with full OpenAPI specs. Try queries right in the browser.

---

## Quick Start

### Docker (Recommended)

```bash
git clone <repo-url>
cd fleet-health-diagnostics
docker-compose up --build
```

| Service       | URL                            |
| ------------- | ------------------------------ |
| App           | http://localhost:4200           |
| Fleet Grid    | http://localhost:4200/vehicles  |
| Dashboard     | http://localhost:4200/dashboard |
| Events        | http://localhost:4200/events    |
| API           | http://localhost:3000/api       |
| Swagger Docs  | http://localhost:4200/api-docs  |

The database seeds itself with ~510 diagnostic events across 20 vehicles on first startup.

### Manual Development

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev          # http://localhost:3000

# Terminal 2 — Frontend
cd frontend
npm install
npm start            # http://localhost:4200
```

---

## Tech Stack

| Layer            | Tech                                                | Why                                                               |
| ---------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| **Backend**      | Express 5 + TypeScript (strict)                     | Shows raw architecture without framework abstractions             |
| **Database**     | SQLite + TypeORM 0.3.x                              | Zero config, single-file DB, production-grade ORM patterns        |
| **Validation**   | Zod v4                                              | One schema = runtime validation + compile-time types              |
| **Frontend**     | Angular 19 (standalone components, SCSS)             | Modern Angular, no NgModules, clean imports                       |
| **State**        | NgRx ComponentStore + RxJS                           | Same reactive patterns as full NgRx, fraction of the boilerplate  |
| **API Docs**     | swagger-jsdoc + swagger-ui-express                   | Docs live next to code, auto-generated, always in sync            |
| **Deployment**   | Docker multi-stage builds + nginx reverse proxy      | Clone -> `docker-compose up` -> done                              |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Angular 19)             │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Dashboard │  │  Fleet   │  │  Vehicle Detail  │  │
│  │   View    │  │ Overview │  │      View        │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │                 │             │
│       └──────────────┴─────────────────┘             │
│                      │                               │
│            ┌─────────┴──────────┐                    │
│            │   ComponentStore   │                    │
│            │  (DiagnosticsStore │                    │
│            │   + VehicleStore)  │                    │
│            └─────────┬──────────┘                    │
│                      │                               │
│            ┌─────────┴──────────┐                    │
│            │  DiagnosticsAPI    │                    │
│            │    Service         │                    │
│            └─────────┬──────────┘                    │
└──────────────────────┼──────────────────────────────┘
                       │  HTTP /api/*
┌──────────────────────┼──────────────────────────────┐
│              Backend (Express 5)                     │
│                      │                               │
│            ┌─────────┴──────────┐                    │
│            │   Routes + Zod     │                    │
│            │   Validation       │                    │
│            └─────────┬──────────┘                    │
│                      │                               │
│            ┌─────────┴──────────┐                    │
│            │    Services        │                    │
│            │ (Event, Vehicle,   │                    │
│            │  Aggregation)      │                    │
│            └─────────┬──────────┘                    │
│                      │                               │
│            ┌─────────┴──────────┐                    │
│            │  TypeORM Entities  │                    │
│            │  + SQLite          │                    │
│            └────────────────────┘                    │
└─────────────────────────────────────────────────────┘
```

### API Endpoints

| Method | Endpoint                                 | What it does                                   |
| ------ | ---------------------------------------- | ---------------------------------------------- |
| GET    | `/api/events`                            | Paginated events with 5 combinable filters     |
| GET    | `/api/vehicles/:vehicleId/summary`       | Full vehicle profile (counts, codes, events)   |
| GET    | `/api/aggregations/errors-per-vehicle`   | Severity counts grouped by vehicle             |
| GET    | `/api/aggregations/top-codes`            | Top 10 most frequent diagnostic codes          |
| GET    | `/api/aggregations/critical-vehicles`    | Vehicles with 3+ errors in trailing 24h        |
| GET    | `/health`                                | Health check with event count                  |
| GET    | `/api-docs`                              | Interactive Swagger docs                       |

---

## Project Structure

```
fleet-health-diagnostics/
├── backend/                     Express API server
│   ├── src/
│   │   ├── routes/              HTTP routes + Zod validation
│   │   ├── services/            Business logic + TypeORM queries
│   │   ├── entities/            TypeORM entity definitions
│   │   ├── middleware/          Validation + error handling
│   │   ├── config/              Database + Swagger config
│   │   └── seed/                Log parser + database seeder
│   └── data/                    Seed log file (510 events)
│
├── frontend/                    Angular 19 SPA
│   └── src/app/
│       ├── core/                Models, API service, interceptor
│       ├── features/
│       │   ├── dashboard/       Fleet health dashboard
│       │   ├── vehicles/        Fleet grid + vehicle detail
│       │   └── events/          Searchable event table
│       ├── shared/              Reusable components (filter, badge, pagination, spinner, toast)
│       └── store/               NgRx ComponentStore
│
├── ARCHITECTURE.md              Deep-dive into how things work
├── REQUIREMENTS.md              What we're building and why
├── docker-compose.yml           One-command deployment
└── README.md                    You are here
```

---

## Key Engineering Decisions

| Decision                              | Why                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `switchMap` over `mergeMap`           | Cancels stale in-flight requests when new filter input arrives — no race conditions                |
| `debounceTime(300)` on filters        | Batches rapid keystrokes into single API calls. 300ms feels instant but avoids hammering the server |
| `catchError` inside inner `switchMap` | Errors stay scoped to individual requests. The outer stream survives and keeps working.            |
| `Promise.all` for vehicle summary     | 4 DB queries run in parallel instead of back-to-back — noticeably faster                          |
| Component-level store providers       | Each route gets a fresh store instance. No stale data when navigating between views.              |
| CSS custom properties over SCSS vars  | Inspectable in browser DevTools, changeable at runtime, no rebuild needed                         |
| Multi-stage Docker builds             | Build tools stay out of production images — smaller, cleaner containers                           |

---

## What I'd Add With More Time

- **Tests** — Jest for backend services, Jasmine for ComponentStore effects and component interactions
- **Live updates** — Server-Sent Events so the dashboard refreshes without manual reload
- **Time-series charts** — Error frequency over time (Chart.js) to spot trends visually
- **Auth** — JWT with viewer/admin roles behind corporate SSO
- **PostgreSQL** — Connection pooling and concurrent writes for production scale
- **Export** — CSV/PDF export of filtered events for offline analysis
- **Dark mode** — Already set up via CSS custom properties, just needs a second set of token values

---

## Docs

| Document                                    | What's in it                                                    |
| ------------------------------------------- | --------------------------------------------------------------- |
| [Requirements](REQUIREMENTS.md)             | Business requirements, assumptions, what's out of scope         |
| [Architecture](ARCHITECTURE.md)             | How the backend and frontend are built, why things work the way they do |

---

<div align="center">

*BMW senior fullstack coding assignment.*

**Express 5 · Angular 19 · TypeORM · NgRx ComponentStore · Docker**

</div>
