# Fleet Health Diagnostics Console — User Guide

## What This Is

A web dashboard for monitoring vehicle health across the BMW fleet. Three things it does:

- **Monitor health** — See which vehicles are healthy, which have warnings, and which are critical.
- **Search events** — Filter diagnostic logs by vehicle, error code, severity, and date range.
- **Spot patterns** — Find the most common error codes, vehicles with recurring failures, and per-vehicle breakdowns.

The fleet includes BMW sedans, MINI Coopers, Rolls Royce, X5 SUVs, i4 electrics, M3 performance cars, iX electric SUVs, and 7 Series vehicles.

---

## Getting Started

### Docker (Recommended)

```bash
docker compose up --build
```

Once running:

- **Frontend:** [http://localhost:4200](http://localhost:4200)
- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **Swagger Docs:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### Development Mode

```bash
# Terminal 1 — Backend (port 3000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 4200)
cd frontend
ng serve
```

The backend seeds sample data on first startup, so you'll see vehicles and events right away.

---

## Navigation

Sidebar with three pages:

| Page | What it's for |
|------|---------------|
| **Dashboard** | Fleet-wide stats, aggregated views, filtered results |
| **Vehicles** | Browse the fleet, search by ID, view individual vehicle profiles |
| **Events** | Full event log with filtering, sorting, and pagination |

---

## Dashboard

The Dashboard is your main monitoring view. It has three sections.

### Filters

Five fields at the top:

| Field | What it does |
|-------|-------------|
| Vehicle ID | Filter by vehicle (e.g., `BMW-1001`) |
| Error Code | Filter by diagnostic code (e.g., `P0420`) |
| Severity | Pick a level: Critical, Warn, or Info |
| Date From | Start of date range |
| Date To | End of date range |

All text filters are **case-insensitive** — `p0420` and `P0420` give the same results.

- **Apply** runs the filters. **Reset** clears everything.
- When filters are active, the panel border turns blue and filter chips appear below it.
- **Clear all** on the chip bar removes all filters at once.

### Filtered Results

Responds to **all** your filters:

- **Total Events** — Count of events matching your filters.
- **Most Common Code** — Top error code in filtered results. Hidden when you're already filtering by code (since you already know).
- **Top Error Codes** — Ranked list of most frequent codes.

### Fleet-Wide Overview

Responds **only to date range filters** — not vehicle ID, code, or severity. Gives you a stable fleet picture regardless of what you're investigating.

- **Total Vehicles** and **Critical Vehicles** counts.
- **Severity Legend** — What the colors mean (red = critical, orange = warn, blue = info).
- **Errors Per Vehicle** chart — Stacked bar chart by severity. Click a vehicle ID label to jump to its detail page.

### Critical Vehicles

Vehicles with **3+ critical events in the last 24 hours**. These need immediate attention. Click any one to see its detail page.

---

## Vehicles Page

### Search

Type to search by vehicle ID. Cards filter as you type.

- **Autocomplete** shows up to 6 matches.
- Case-insensitive — `bmw`, `BMW`, `Bmw` all work.
- **Enter** dismisses the dropdown. **Escape** closes it. **X** clears the search.
- Result count shows below the bar (e.g., "3 vehicles matching 'BMW'").

### Vehicle Cards

Responsive grid. Each card shows:

- Vehicle ID (e.g., BMW-1001)
- Health status with color: **Blue** = healthy, **Orange** = warning, **Red** = critical
- Event counts by severity
- Total events

Click a card to open that vehicle's detail page.

### Vehicle Detail

Full diagnostic profile for one vehicle:

- **Breadcrumb** — Click to go back to the fleet grid.
- **Health chip** — CRITICAL, WARNING, or HEALTHY with matching color.
- **Stats row** — Error count, warning count, info count, first seen, last active.
- **Error Code Breakdown** — Top codes for this vehicle.
- **Recent Events** — Latest diagnostic events.
- **"View All Events"** — Goes to the Events page pre-filtered for this vehicle.

---

## Events Page

### Filtering

Same filter panel as the Dashboard: Vehicle ID, Error Code, Severity, Date From, Date To. All case-insensitive. Filter chips and toast confirmations work the same way.

### Results

- **Result bar** — Shows "5 of 20 filtered results" or "142 total events" depending on whether filters are active.
- **Table columns:** Timestamp, Vehicle ID (clickable link to detail), Severity badge, Code, Message.
- Click column headers to sort. Click again to flip the order.
- **Pagination** at the bottom for navigating large results.

---

## Severity Levels

| Level | Color | Meaning |
|-------|-------|---------|
| CRITICAL | Red | Needs immediate attention |
| WARN | Orange | Possible issue |
| INFO | Blue | Routine diagnostic event |

---

## Fleet Vehicle Types

Seed data covers eight vehicle lines:

| Prefix | Type | Example |
|--------|------|---------|
| BMW-1xxx | BMW Sedans | BMW-1001 |
| MNI-2xxx | MINI Cooper | MNI-2001 |
| RR-3xxx | Rolls Royce | RR-3001 |
| X5-4xxx | X5 SUV | X5-4001 |
| I4-5xxx | i4 Electric | I4-5001 |
| M3-6xxx | M3 Performance | M3-6001 |
| IX-7xxx | iX Electric SUV | IX-7001 |
| S7-8xxx | 7 Series | S7-8001 |

---

## API Endpoints

For anyone querying the backend directly or integrating with other tools:

| Endpoint | What it does |
|----------|-------------|
| `GET /api/events` | Paginated events with query param filters |
| `GET /api/aggregations/errors-per-vehicle` | Error counts by vehicle |
| `GET /api/aggregations/top-codes` | Top diagnostic codes (supports filters) |
| `GET /api/aggregations/critical-vehicles` | Vehicles with 3+ critical events in 24h |
| `GET /api/vehicles/:id/summary` | Single vehicle summary |
| `GET /api-docs` | Swagger UI |
| `GET /health` | Health check |

Full docs with schemas at [http://localhost:3000/api-docs](http://localhost:3000/api-docs).

---

## Tips

- **Combine filters** — Use severity + vehicle ID together to see only critical events for a specific vehicle.
- **Dashboard sections are intentionally separate.** "Filtered Results" reacts to all your filters. "Fleet-Wide Overview" only reacts to date range. You always keep a stable fleet picture while investigating specifics.
- **Case doesn't matter.** `BMW-1001`, `bmw-1001`, `Bmw-1001` all work the same.
- **Click vehicle IDs anywhere** — In the Events table, on the Dashboard chart, on Vehicle cards. They always link to the detail page.
- **Use the Swagger docs** if you need to build custom queries or hook into other tools. Try requests directly in the browser at `/api-docs`.
