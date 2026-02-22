<div align="center">

# 🏁 Fleet Health & Diagnostics Console

### Real-time fleet monitoring for operations engineers

<br>

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Angular](https://img.shields.io/badge/Angular-19-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![SQLite](https://img.shields.io/badge/SQLite-TypeORM-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://typeorm.io/)
[![License](https://img.shields.io/badge/License-Private-555555?style=for-the-badge)](.)

<br>

Hundreds of fleet vehicles. Thousands of diagnostic events.<br>
**This dashboard helps engineers find the ones that need attention — fast.**

<br>

[Quick Start](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [API](#-api-endpoints) · [Docs](#-documentation)

</div>

<br>

---

<br>

## 🔍 How It Works

The console follows a deliberate **scan → investigate → analyze** workflow:

```
  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
  │                 │       │                 │       │                 │
  │  🟢 🟠 🔴       │       │  📊 Vehicle     │       │  🔎 Filterable  │
  │  Fleet Grid     │──────▶│  Detail Page    │──────▶│  Events Table   │
  │                 │       │                 │       │                 │
  │  Scan all       │       │  Investigate    │       │  Analyze every  │
  │  vehicles       │       │  one vehicle    │       │  event          │
  └─────────────────┘       └─────────────────┘       └─────────────────┘
       /vehicles                /vehicles/:id              /events
```

> [!TIP]
> Every vehicle ID in the app is clickable — on the grid, in charts, and in tables. You can always drill into a vehicle from any screen.

<br>

---

<br>

## ✨ Features

<table>
<tr>
<td width="50%">

### 🚗 Fleet Overview
Responsive card grid with health status at a glance.
- 🔴 **Critical** — 3+ errors in 24h
- 🟠 **Warning** — has errors, not critical
- 🟢 **Healthy** — no errors

Click any card to drill into that vehicle.

</td>
<td width="50%">

### 📋 Vehicle Detail
Full diagnostic profile for a single vehicle.
- 5-stat summary row
- Error code breakdown with severity badges
- Recent events table
- Direct link to filtered events view

</td>
</tr>
<tr>
<td width="50%">

### 📊 Dashboard
Fleet-wide operational summary.
- 4 KPI cards (events, vehicles, critical, top code)
- Per-vehicle stacked bar chart
- Top 10 recurring codes
- Critical vehicle alert list

</td>
<td width="50%">

### 🔎 Events Table
Deep-dive event analysis.
- 5 combinable filters
- Severity badges for visual triage
- Sortable columns
- URL deep-linking (`/events?vehicleId=BMW-1001`)

</td>
</tr>
</table>

<br>

> [!NOTE]
> Interactive **Swagger UI** at `/api-docs` with full OpenAPI specs — try any query right in the browser.

<br>

---

<br>

## 🚀 Quick Start

### 🐳 Docker (Recommended)

```bash
git clone <repo-url>
cd fleet-health-diagnostics
docker-compose up --build
```

<table>
<tr><th>🌐 Service</th><th>URL</th></tr>
<tr><td>🏠 App</td><td><a href="http://localhost:4200">http://localhost:4200</a></td></tr>
<tr><td>🚗 Fleet Grid</td><td><a href="http://localhost:4200/vehicles">http://localhost:4200/vehicles</a></td></tr>
<tr><td>📊 Dashboard</td><td><a href="http://localhost:4200/dashboard">http://localhost:4200/dashboard</a></td></tr>
<tr><td>📋 Events</td><td><a href="http://localhost:4200/events">http://localhost:4200/events</a></td></tr>
<tr><td>⚡ API</td><td><a href="http://localhost:3000/api">http://localhost:3000/api</a></td></tr>
<tr><td>📖 Swagger</td><td><a href="http://localhost:4200/api-docs">http://localhost:4200/api-docs</a></td></tr>
</table>

> The database seeds itself with **~510 diagnostic events** across **20 vehicles** on first startup.

<br>

### 💻 Manual Development

```bash
# Terminal 1 — Backend
cd backend && npm install && npm run dev     # → http://localhost:3000

# Terminal 2 — Frontend
cd frontend && npm install && npm start      # → http://localhost:4200
```

<br>

---

<br>

## 🧱 Tech Stack

| | Layer | Technology | Why |
|---|---|---|---|
| ⚙️ | **Backend** | Express 5 + TypeScript (strict) | Shows raw architecture without framework abstractions |
| 🗄️ | **Database** | SQLite + TypeORM 0.3.x | Zero config, single-file DB, real ORM patterns |
| ✅ | **Validation** | Zod v4 | One schema = runtime checks + compile-time types |
| 🎨 | **Frontend** | Angular 19 (standalone, SCSS) | Modern Angular, no NgModules, clean imports |
| 🔄 | **State** | NgRx ComponentStore + RxJS | Same reactive patterns as full NgRx, less boilerplate |
| 📖 | **API Docs** | swagger-jsdoc + swagger-ui-express | Docs next to code, auto-generated, always in sync |
| 🐳 | **Deploy** | Docker multi-stage + nginx proxy | `docker-compose up` and you're done |

<br>

---

<br>

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   F R O N T E N D                          Angular 19   │
│                                                         │
│   ┌────────────┐  ┌────────────┐  ┌────────────────┐   │
│   │ 📊         │  │ 🚗         │  │ 📋             │   │
│   │ Dashboard  │  │ Fleet Grid │  │ Vehicle Detail │   │
│   └─────┬──────┘  └─────┬──────┘  └───────┬────────┘   │
│         │                │                 │             │
│         └────────────────┼─────────────────┘             │
│                          │                               │
│              ┌───────────┴────────────┐                  │
│              │  🔄 ComponentStore     │                  │
│              │  Diagnostics + Vehicle │                  │
│              └───────────┬────────────┘                  │
│                          │                               │
│              ┌───────────┴────────────┐                  │
│              │  📡 API Service        │                  │
│              └───────────┬────────────┘                  │
│                          │                               │
└──────────────────────────┼───────────────────────────────┘
                           │
                      HTTP /api/*
                           │
┌──────────────────────────┼───────────────────────────────┐
│                          │                               │
│   B A C K E N D                            Express 5    │
│                          │                               │
│              ┌───────────┴────────────┐                  │
│              │  🛡️ Routes + Zod       │                  │
│              └───────────┬────────────┘                  │
│                          │                               │
│              ┌───────────┴────────────┐                  │
│              │  ⚙️ Services           │                  │
│              │  Event · Vehicle ·     │                  │
│              │  Aggregation           │                  │
│              └───────────┬────────────┘                  │
│                          │                               │
│              ┌───────────┴────────────┐                  │
│              │  🗄️ TypeORM + SQLite   │                  │
│              └────────────────────────┘                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

<br>

### 📡 API Endpoints

| Method | Endpoint | What it does |
|:------:|----------|-------------|
| `GET` | `/api/events` | Paginated events with 5 combinable filters |
| `GET` | `/api/vehicles/:vehicleId/summary` | Full vehicle profile (counts, codes, events) |
| `GET` | `/api/aggregations/errors-per-vehicle` | Severity counts grouped by vehicle |
| `GET` | `/api/aggregations/top-codes` | Top 10 most frequent diagnostic codes |
| `GET` | `/api/aggregations/critical-vehicles` | Vehicles with 3+ errors in trailing 24h |
| `GET` | `/health` | Health check with event count |
| `GET` | `/api-docs` | Interactive Swagger documentation |

<br>

---

<br>

## 📂 Project Structure

```
fleet-health-diagnostics/
│
├── 📦 backend/                      Express API server
│   ├── src/
│   │   ├── routes/                  HTTP routes + Zod validation
│   │   ├── services/                Business logic + TypeORM queries
│   │   ├── entities/                TypeORM entity definitions
│   │   ├── middleware/              Validation + error handling
│   │   ├── config/                  Database + Swagger config
│   │   └── seed/                    Log parser + database seeder
│   └── data/                        Seed log file (510 events)
│
├── 🎨 frontend/                     Angular 19 SPA
│   └── src/app/
│       ├── core/                    Models, API service, interceptor
│       ├── features/
│       │   ├── dashboard/           Fleet health dashboard
│       │   ├── vehicles/            Fleet grid + vehicle detail
│       │   └── events/              Searchable event table
│       ├── shared/                  Reusable UI components
│       └── store/                   NgRx ComponentStore
│
├── 📄 ARCHITECTURE.md               Deep-dive technical doc
├── 📄 REQUIREMENTS.md               Business requirements & scope
├── 📄 USER_GUIDE.md                 How to use the app
├── 🐳 docker-compose.yml            One-command deployment
└── 📄 README.md                     You are here
```

<br>

---

<br>

## ⚖️ Key Engineering Decisions

| Decision | Why |
|----------|-----|
| **`switchMap`** over `mergeMap` | Cancels stale in-flight requests on new filter input — no race conditions |
| **`debounceTime(300)`** on filters | Batches rapid keystrokes. 300ms feels instant but avoids hammering the server |
| **`catchError`** inside inner `switchMap` | Errors scoped to individual requests. Outer stream survives and keeps working. |
| **`Promise.all`** for vehicle summary | 4 DB queries in parallel instead of sequential — noticeably faster |
| **Component-level** store providers | Fresh store per route. No stale data when navigating. |
| **CSS custom properties** over SCSS vars | Inspectable in DevTools, runtime-changeable, no rebuild |
| **Multi-stage** Docker builds | Build tools stay out of prod images — smaller containers |

<br>

---

<br>

## 🔮 What I'd Add With More Time

| Feature | Notes |
|---------|-------|
| 🧪 **Tests** | Jest for backend services, Jasmine for ComponentStore effects |
| 📡 **Live updates** | Server-Sent Events for real-time dashboard refresh |
| 📈 **Time-series charts** | Error frequency over time with Chart.js |
| 🔐 **Auth** | JWT with viewer/admin roles behind corporate SSO |
| 🐘 **PostgreSQL** | Connection pooling and concurrent writes at scale |
| 📥 **Export** | CSV/PDF for filtered events |
| 🌙 **Dark mode** | Already architected via CSS custom properties |

<br>

---

<br>

## 📚 Documentation

| Document | What's inside |
|----------|-------------|
| 📋 [Requirements](REQUIREMENTS.md) | Business requirements, assumptions, scope boundaries |
| 🏗 [Architecture](ARCHITECTURE.md) | Backend layers, frontend components, RxJS rationale, trade-offs |
| 📖 [User Guide](USER_GUIDE.md) | How to use every page, filters, navigation, tips |

<br>

---

<div align="center">

<br>

*BMW Senior Fullstack Coding Assignment*

**Express 5 · Angular 19 · TypeORM · NgRx ComponentStore · Docker**

<br>

</div>
