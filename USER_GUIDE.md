# Fleet Health Diagnostics Console — User Guide

## Application Overview

The Fleet Health Diagnostics Console is a web-based tool built for operations engineers to monitor vehicle health across the BMW fleet. It provides three core capabilities:

- **Monitor vehicle health** — See at a glance which vehicles are healthy, which have warnings, and which are in critical condition.
- **Search diagnostic events** — Filter and sort through diagnostic event logs by vehicle, error code, severity, and date range.
- **Explore error patterns** — Identify the most common error codes, spot vehicles with recurring critical failures, and drill into per-vehicle breakdowns.

The console covers the full BMW Group fleet including BMW sedans, MINI Coopers, Rolls Royce, X5 SUVs, i4 electrics, M3 performance cars, iX electric SUVs, and 7 Series vehicles.

---

## Getting Started

### Running with Docker (Recommended)

From the project root, run:

```bash
docker compose up --build
```

Once the containers are running:

- **Frontend:** [http://localhost:4200](http://localhost:4200)
- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **Swagger Docs:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### Running in Development Mode

Start the backend and frontend separately:

```bash
# Terminal 1 — Backend (port 3000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 4200)
cd frontend
ng serve
```

The backend seeds the database with sample fleet data on first startup, so you will see vehicles and events immediately.

---

## Navigation

The application uses a sidebar layout with three main pages:

| Icon | Page | Purpose |
|------|------|---------|
| Dashboard | **Dashboard** | Fleet-wide overview, aggregated stats, and filtered results |
| Directions Car | **Vehicles** | Browse and search the vehicle fleet, view individual vehicle details |
| List | **Events** | Full event log with filtering, sorting, and pagination |

The sidebar features BMW M-stripe branding at the top (the iconic blue, dark blue, red tricolor). Click any item in the sidebar to navigate between pages.

---

## Dashboard Page

The Dashboard is your primary monitoring view. It is divided into three sections: **Filtered Results**, **Fleet-Wide Overview**, and **Critical Vehicles**.

### Filter Panel

At the top of the Dashboard, you will find a filter panel with five fields:

| Field | Type | Description |
|-------|------|-------------|
| Vehicle ID | Text input | Filter by vehicle identifier (e.g., `BMW-1001`) |
| Error Code | Text input | Filter by diagnostic code (e.g., `P0420`) |
| Severity | Dropdown | Select a severity level: Critical, Warn, or Info |
| Date From | Date picker | Start of the date range |
| Date To | Date picker | End of the date range |

**Important:** All text filters are **case-insensitive**. You can type `p0420` or `P0420`, `bmw-1003` or `BMW-1003` — the results will be the same.

- Click **Apply** to execute your filters.
- Click **Reset** to clear all filters and return to the unfiltered view.
- When filters are active, the filter panel border turns **blue** as a visual indicator.
- An **active filter chips bar** appears below the panel showing each applied filter. Click the **"Clear all"** button to remove them all at once.
- A **toast notification** confirms when filters are applied or cleared.

### Filtered Results Section

This section responds to **all** filters you have set:

- **Total Events** card — Displays the count of events matching your current filters.
- **Most Common Code** card — Shows the most frequently occurring error code in the filtered results. This card is **hidden** when you are already filtering by a specific error code (since you already know which code you are looking at).
- **Top Error Codes** panel — A ranked list of the most common diagnostic codes within the filtered results.

### Fleet-Wide Overview Section

This section provides a broader view of the fleet. The cards and chart here respond **only to date range filters** (Date From / Date To), not to Vehicle ID, Error Code, or Severity filters. This ensures you always have a stable fleet-level picture.

- **Total Vehicles** card — Number of vehicles in the fleet (within the selected date range).
- **Critical Vehicles** card — Number of vehicles currently in critical status.
- **Severity Legend** — A reference explaining the three severity levels:
  - **Critical** (red) — Critical failure requiring immediate attention
  - **Warn** (orange) — Potential issue detected
  - **Info** (blue) — Routine diagnostic event
- **Errors Per Vehicle** chart — Horizontal stacked bar chart showing the error distribution across vehicles. Each bar is broken down by severity. Click any **vehicle ID** label on the chart to navigate directly to that vehicle's detail page.

### Critical Vehicles Section

At the bottom of the Dashboard, you will find a list of vehicles with **3 or more critical events in the last 24 hours**. These are the vehicles that need immediate attention. Click any vehicle in this list to navigate to its detail page.

---

## Vehicles Page

### Search Bar

The Vehicles page features a live search bar at the top:

- Type to search vehicles by ID — the vehicle cards **filter live as you type**.
- An **autocomplete dropdown** appears showing up to 6 matching vehicle IDs as you type.
- The search is **case-insensitive** — typing `bmw`, `BMW`, or `Bmw` all produce the same results.
- Press **Enter** to dismiss the autocomplete dropdown and keep the filtered results visible.
- Press **Escape** to close the autocomplete dropdown without changing the filter.
- Click the **X** button in the search field to clear the search entirely.
- A **result count** is displayed below the search bar, for example: *"3 vehicles matching 'BMW'"*.

### Vehicle Cards

Vehicles are displayed in a responsive grid of cards. Each card shows:

- **Vehicle ID** (e.g., BMW-1001)
- **Health status**, color-coded:
  - **Blue** — Healthy (no critical or warning events)
  - **Orange** — Warning (has warning-level events but no critical)
  - **Red** — Critical (has critical-level events)
- **Event counts** — Number of error, warning, and info events
- **Total events** count

Click any card to open that vehicle's **detail page**.

### Vehicle Detail Page

When you click into a specific vehicle, you see its full diagnostic profile:

- **Breadcrumb navigation** — Click to go back to the Fleet Overview.
- **Health status chip** — Displays CRITICAL, WARNING, or HEALTHY with corresponding color.
- **Stats row** — Four key metrics:
  - Error count
  - Warning count
  - Info count
  - First Seen / Last Active dates
- **Error Code Breakdown** — The top diagnostic codes recorded for this specific vehicle.
- **Recent Events table** — The latest diagnostic events for the vehicle.
- **"View All Events" link** — Navigates to the Events page, pre-filtered to show only this vehicle's events.

---

## Events Page

### Filtering

The Events page includes the same filter panel as the Dashboard:

- Vehicle ID, Error Code, Severity, Date From, Date To
- All text inputs are **case-insensitive**
- Active filter chips bar shows current filters with a "Clear all" option
- Toast notifications confirm filter actions

### Results

Below the filter panel, you will find:

- **Result summary bar** — Shows context-aware counts:
  - When filtered: *"Showing 5 of 20 filtered results"*
  - When unfiltered: *"142 total events"*
- **Sortable data table** with columns:
  - **Timestamp** — When the event occurred
  - **Vehicle ID** — Which vehicle reported the event (clickable link to vehicle detail)
  - **Severity** — Critical, Warn, or Info badge
  - **Code** — The diagnostic error code
  - **Message** — Description of the event
- Click any **column header** to sort by that column. Click again to toggle between ascending and descending order.
- **Pagination** at the bottom lets you navigate through large result sets.

---

## Severity Levels

| Level | Badge Color | Meaning |
|-------|-------------|---------|
| CRITICAL | Red | Critical failure requiring immediate attention |
| WARN | Orange | Potential issue detected |
| INFO | Blue | Routine diagnostic event |

---

## Fleet Vehicle Types (Seed Data)

The application ships with seed data covering eight vehicle lines across the BMW Group:

| Prefix | Type | Example ID |
|--------|------|------------|
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

For engineers who want to query the backend directly or integrate with other tools:

| Endpoint | Description |
|----------|-------------|
| `GET /api/events` | Paginated events list with query parameter filters |
| `GET /api/aggregations/errors-per-vehicle` | Error counts grouped by vehicle |
| `GET /api/aggregations/top-codes` | Top diagnostic codes (supports `vehicleId`, `code`, `level` filters) |
| `GET /api/aggregations/critical-vehicles` | Vehicles with 3+ critical events in the last 24 hours |
| `GET /api/vehicles/:id/summary` | Detailed summary for a single vehicle |
| `GET /api-docs` | Interactive Swagger UI documentation |
| `GET /health` | Health check endpoint (returns status and event count) |

Full API documentation with request/response schemas is available at [http://localhost:3000/api-docs](http://localhost:3000/api-docs) when the backend is running.

---

## Tips

- **Combine filters for precision.** Use the severity dropdown together with a vehicle ID to see only critical events for a specific vehicle — useful when triaging a known problem vehicle.
- **Dashboard sections serve different purposes.** The "Filtered Results" section responds to all your filters, while the "Fleet-Wide Overview" section only responds to date range filters. This separation ensures you always have a stable fleet-level picture alongside your focused investigation.
- **Toast notifications confirm every action.** When you apply or clear filters, a toast notification appears so you always know the current filter state.
- **Case does not matter.** All filter text inputs are case-insensitive. Type in whatever case is comfortable — `BMW-1001`, `bmw-1001`, or `Bmw-1001` all work identically.
- **Click through from anywhere.** Vehicle IDs are clickable throughout the application — in the Events table, on the Dashboard chart, and on Vehicle cards — so you can always drill into a specific vehicle from any context.
- **Use the Swagger docs.** If you need to build custom queries or integrate with other monitoring tools, the interactive API documentation at `/api-docs` provides full request/response schemas you can try directly in the browser.
