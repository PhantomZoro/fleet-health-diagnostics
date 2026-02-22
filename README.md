<div align="center">

# Fleet Health & Diagnostics Console

**Real-time fleet monitoring for operations engineers**

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Angular](https://img.shields.io/badge/Angular-19-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

*A fullstack operations console that ingests structured diagnostic logs from fleet vehicles, surfaces error patterns through aggregated views, and gives each vehicle a dedicated health profile — enabling engineers to spot critical issues in seconds, not hours.*

</div>

---

## What This Tool Does

Fleet Health & Diagnostics Console is an internal operations dashboard built for BMW fleet engineers. It solves a core problem in fleet management: **when you have hundreds of vehicles generating thousands of diagnostic events, how do you find the ones that need attention?**

The tool approaches this from three angles:

1. **Fleet-wide scanning** — A grid of vehicle cards color-coded by health status (Critical / Warning / Healthy) lets operators visually scan the entire fleet in one glance
2. **Vehicle-level investigation** — Each vehicle has a dedicated profile page showing severity breakdowns, top error codes, and recent events — everything needed to diagnose a problem without jumping between screens
3. **Event-level analysis** — A searchable, filterable, sortable event table with combinable filters (vehicle ID, error code, severity, date range) for deep investigation

The drill-down flow is intentional: **Fleet Grid** (scan) -> **Vehicle Detail** (investigate) -> **Events Table** (analyze).

---

## Features

### Fleet Overview
> Responsive grid of vehicle cards with health status indicators. Cards are color-coded: red border for critical vehicles (3+ errors in 24h), orange for warnings, green for healthy. Click any card to drill into that vehicle's detail page.

### Vehicle Detail
> Dedicated profile for each vehicle — 5-stat summary row (errors, warnings, info, first seen, last active), error code breakdown with severity badges, recent events table, and a direct link to the full filtered events view.

### Dashboard
> Operational summary with 4 KPI cards (total events, total vehicles, critical count, most common code), per-vehicle bar chart with stacked severity segments, top 10 recurring diagnostic codes, and critical vehicle alerts with click-through navigation.

### Events Table
> Paginated, sortable table with 5 combinable filters. Severity badges provide instant visual triage. Vehicle IDs link directly to vehicle detail pages. Supports URL query params for deep-linking (e.g., `/events?vehicleId=VH-1001`).

### API Documentation
> Auto-generated Swagger UI at `/api-docs` with full OpenAPI specs for all endpoints — try queries directly from the browser.

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

The database seeds automatically with ~510 diagnostic events across 20 vehicles on first startup.

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

| Layer            | Technology                                          | Why                                                                               |
| ---------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Backend**      | Express 5 + TypeScript (strict)                     | Raw architecture over framework magic — layered design is a deliberate choice     |
| **Database**     | SQLite + TypeORM 0.3.x                              | Zero-config, single-file DB with production-grade ORM patterns                    |
| **Validation**   | Zod v4                                              | Runtime validation AND compile-time types from a single schema definition         |
| **Frontend**     | Angular 19 (standalone components, SCSS)             | Modern Angular with no NgModules — cleaner imports, better tree-shaking           |
| **State**        | NgRx ComponentStore + RxJS                           | Right-sized reactive state — same patterns as full NgRx without 15 boilerplate files |
| **API Docs**     | swagger-jsdoc + swagger-ui-express                   | Documentation lives next to code, auto-generated — single source of truth        |
| **Deployment**   | Docker multi-stage builds + nginx reverse proxy      | One command from clone to running app, no local dependencies required             |

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

| Method | Endpoint                                 | Description                                    |
| ------ | ---------------------------------------- | ---------------------------------------------- |
| GET    | `/api/events`                            | Paginated events with 5 combinable filters     |
| GET    | `/api/vehicles/:vehicleId/summary`       | Full vehicle profile (counts, codes, events)   |
| GET    | `/api/aggregations/errors-per-vehicle`   | Severity counts grouped by vehicle             |
| GET    | `/api/aggregations/top-codes`            | Top 10 most frequent diagnostic codes          |
| GET    | `/api/aggregations/critical-vehicles`    | Vehicles with 3+ errors in trailing 24h        |
| GET    | `/health`                                | Health check with event count                  |
| GET    | `/api-docs`                              | Interactive Swagger documentation              |

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
│       │   │   ├── fleet-overview/   Vehicle card grid
│       │   │   └── vehicle-detail/   Individual vehicle profile
│       │   └── events/          Searchable event table
│       ├── shared/              Dumb components (filter, badge, pagination, spinner, toast)
│       └── store/               NgRx ComponentStore
│
├── ARCHITECTURE.md              Technical architecture document
├── REQUIREMENTS.md              Business requirements and scope
├── docker-compose.yml           One-command deployment
└── README.md                    Project overview and quick start
```

---

## Key Engineering Decisions

| Decision                              | Rationale                                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `switchMap` over `mergeMap`           | Cancels stale in-flight requests on new filter input — prevents race conditions in search                 |
| `debounceTime(300)` on filters        | Batches rapid keystrokes into single API calls — 300ms balances responsiveness with efficiency             |
| `catchError` inside inner `switchMap` | Error handling scoped to individual requests — outer effect stream survives and processes future changes   |
| `Promise.all` for vehicle summary     | 4 parallel DB queries (counts, time range, top codes, recent events) — faster than sequential             |
| Component-level store providers       | Each route gets its own store instance — no stale state when navigating between views                     |
| CSS custom properties over SCSS vars  | Browser-inspectable, runtime-changeable, no build step for token updates                                  |
| Multi-stage Docker builds             | Separate build and runtime stages — no TypeScript compiler or devDependencies in production images        |

---

## What I Would Add With More Time

- **Unit & integration tests** — Jest for backend services/queries, Jasmine for ComponentStore effects and component interactions
- **Real-time event streaming** — Server-Sent Events for live dashboard updates without page refresh
- **Time-series charts** — Error frequency over time using Chart.js for visual trend identification
- **Authentication & RBAC** — JWT-based auth with viewer/admin roles behind BMW corporate SSO
- **PostgreSQL migration** — Connection pooling and concurrent writes for production-scale fleet data
- **CSV/PDF export** — Filtered event data export for offline analysis and management reporting
- **Dark mode** — Already architected via CSS custom properties — just swap the token values

---

## Documentation

| Document                                    | Description                                                     |
| ------------------------------------------- | --------------------------------------------------------------- |
| [Requirements](REQUIREMENTS.md)             | Business requirements, assumptions, scope boundaries            |
| [Architecture](ARCHITECTURE.md)             | Backend layers, frontend components, RxJS rationale, trade-offs |

---

<div align="center">

*Built as a BMW senior fullstack coding assignment.*

**Express 5 + Angular 19 + TypeORM + NgRx ComponentStore + Docker**

</div>
