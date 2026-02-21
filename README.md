# Fleet Health & Diagnostics Console

A fleet diagnostics console for BMW operations engineers to monitor vehicle health, search diagnostic events, view aggregated error patterns, and identify critical vehicles. The application ingests structured log data from fleet vehicles, provides searchable event history with combinable filters, and surfaces fleet-wide insights through summary cards and aggregation lists.

## Tech Stack

- **Backend:** Express 5, TypeScript (strict mode), TypeORM 0.3.x, SQLite (better-sqlite3), Zod validation
- **Frontend:** Angular 19 (standalone components), NgRx ComponentStore, RxJS, SCSS
- **Containerization:** Docker multi-stage builds, docker-compose, nginx reverse proxy
- **API Docs:** swagger-jsdoc + swagger-ui-express (auto-generated from JSDoc annotations)

## Prerequisites

**Docker (recommended):** Docker and docker-compose installed.

**Manual development:** Node.js 20+, npm 10+.

## Quick Start -- Docker (Recommended)

```bash
git clone <repo-url>
cd fleet-health-diagnostics
docker-compose up --build
```

| Service      | URL                                       |
| ------------ | ----------------------------------------- |
| Frontend     | http://localhost:4200                      |
| Backend API  | http://localhost:3000/api/events           |
| Swagger Docs | http://localhost:4200/api-docs             |

The database is seeded automatically on first startup with ~500 diagnostic events across 20 vehicles.

## Quick Start -- Manual Development

```bash
# Terminal 1 -- Backend
cd backend
npm install
npm run dev
# Server at http://localhost:3000, seeds database on first run
```

```bash
# Terminal 2 -- Frontend
cd frontend
npm install
npm start
# App at http://localhost:4200, proxies /api to backend
```

## Project Structure

```
backend/     Express API server (routes, services, entities, Zod validation)
frontend/    Angular 19 SPA (standalone components, ComponentStore, SCSS)
docs/        Requirements spec, architecture doc, build log
```

## What Works

- Full-text search and combinable filters (vehicle ID, error code, severity level, date range)
- Paginated event table with color-coded severity badges
- Dashboard with summary cards (total events, vehicles, critical count, most common code)
- Errors-per-vehicle aggregation with horizontal bar chart visualization
- Top 10 recurring diagnostic codes list
- Critical vehicle identification (3+ ERROR events in trailing 24h) with click-through to filtered event view
- Loading states, empty states, and error handling with toast notifications
- Swagger API documentation (auto-generated from route annotations)
- One-command Docker deployment with nginx reverse proxy

## What I Would Add With More Time

- Unit and integration tests (Jest for backend, Jasmine/Karma for frontend)
- Real-time event streaming via WebSocket for live monitoring
- Chart visualizations for trends over time (e.g., ngx-charts)
- Authentication and role-based access control
- Export to CSV functionality
- Dark mode theme toggle using the existing CSS custom property system

## Documentation

- [Requirements](docs/REQUIREMENTS.md) -- Business requirements, assumptions, and scope
- [Architecture](docs/ARCHITECTURE.md) -- Backend layers, frontend components, RxJS rationale, trade-offs
