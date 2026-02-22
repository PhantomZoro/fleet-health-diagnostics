<div align="center">

# 📖 Fleet Health Diagnostics Console
### User Guide

<br>

A web dashboard for monitoring vehicle health across the BMW fleet.

[Getting Started](#-getting-started) · [Dashboard](#-dashboard) · [Vehicles](#-vehicles-page) · [Events](#-events-page) · [Tips](#-tips--shortcuts)

</div>

<br>

---

<br>

## 🎯 What This App Does

<table>
<tr>
<td width="33%" align="center">

### 🩺 Monitor
See which vehicles are healthy, warning, or critical — at a glance.

</td>
<td width="33%" align="center">

### 🔎 Search
Filter diagnostic logs by vehicle, error code, severity, and date range.

</td>
<td width="33%" align="center">

### 📊 Analyze
Find common error codes, spot recurring failures, drill into breakdowns.

</td>
</tr>
</table>

<br>

> Covers the full BMW Group fleet: BMW sedans, MINI Coopers, Rolls Royce, X5 SUVs, i4 electrics, M3 performance, iX electric SUVs, and 7 Series.

<br>

---

<br>

## 🚀 Getting Started

### 🐳 Docker (Recommended)

```bash
docker compose up --build
```

| | Service | URL |
|---|---------|-----|
| 🏠 | Frontend | [localhost:4200](http://localhost:4200) |
| ⚡ | Backend API | [localhost:3000](http://localhost:3000) |
| 📖 | Swagger Docs | [localhost:3000/api-docs](http://localhost:3000/api-docs) |

### 💻 Development Mode

```bash
# Terminal 1 — Backend (port 3000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 4200)
cd frontend && ng serve
```

> [!TIP]
> The backend seeds sample data on first startup — you'll see vehicles and events right away.

<br>

---

<br>

## 🗺️ Navigation

The sidebar has three pages. Here's what each one is for and when to use it:

```
┌──────────────┐
│              │
│  📊 Dashboard│ ← Fleet-wide stats, KPI cards, filtered aggregations
│              │
│  🚗 Vehicles │ ← Browse fleet, search by ID, open vehicle profiles
│              │
│  📋 Events   │ ← Full event log, filter + sort + paginate
│              │
└──────────────┘
```

<br>

The intended workflow:

```
  📊 Dashboard          🚗 Fleet Grid          📋 Vehicle Detail         🔎 Events
  ─────────────         ──────────────          ─────────────────         ─────────
  Spot trends    ──▶    Scan vehicles    ──▶    Investigate one    ──▶   Analyze events
  across fleet          by health status        vehicle's profile        in detail
```

<br>

---

<br>

## 📊 Dashboard

Your main monitoring view. Three distinct sections, each responding to different filters.

<br>

### 🎛️ Filter Panel

Five fields at the top of the page:

| Field | Type | Example |
|-------|------|---------|
| 🚗 Vehicle ID | Text | `BMW-1001` |
| 🔧 Error Code | Text | `P0420` |
| ⚠️ Severity | Dropdown | Critical / Warn / Info |
| 📅 Date From | Date picker | Start of range |
| 📅 Date To | Date picker | End of range |

> [!NOTE]
> All text filters are **case-insensitive**. `p0420` and `P0420` give identical results. Same for vehicle IDs.

**How filters work:**

- Click **Apply** to run filters → panel border turns **blue**
- Click **Reset** to clear everything
- Active **filter chips** appear below the panel showing what's active
- Click **Clear all** on the chip bar to remove all filters at once

<br>

### 📌 Section 1: Filtered Results

> Responds to **all** your filters (vehicle, code, severity, date range)

| Card | What it shows |
|------|-------------|
| **Total Events** | Count of events matching your current filters |
| **Most Common Code** | Top error code in filtered results *(hidden when filtering by code)* |
| **Top Error Codes** | Ranked list of most frequent diagnostic codes |

<br>

### 🌐 Section 2: Fleet-Wide Overview

> Responds **only to date range** — not vehicle ID, code, or severity. Always gives you a stable fleet picture.

| Element | What it shows |
|---------|-------------|
| **Total Vehicles** | Vehicle count in the date range |
| **Critical Vehicles** | Count of vehicles in critical status |
| **Severity Legend** | 🔴 Critical · 🟠 Warn · 🔵 Info |
| **Errors Per Vehicle** | Stacked bar chart by severity — click vehicle IDs to jump to detail |

<br>

### 🚨 Section 3: Critical Vehicles

> Vehicles with **3+ critical events in the last 24 hours**. Click any one to open its detail page.

<br>

---

<br>

## 🚗 Vehicles Page

### 🔍 Search Bar

```
┌─────────────────────────────────────────┐
│  🔎  Search vehicles...            ✕   │
├─────────────────────────────────────────┤
│  BMW-1001                               │
│  BMW-1002                               │  ← autocomplete (up to 6 matches)
│  BMW-1003                               │
└─────────────────────────────────────────┘
   3 vehicles matching "BMW"
```

- Type to search — cards **filter live** as you type
- Case-insensitive: `bmw`, `BMW`, `Bmw` all work
- <kbd>Enter</kbd> dismisses the dropdown and keeps filtered results
- <kbd>Escape</kbd> closes the dropdown
- Click **✕** to clear the search

<br>

### 🃏 Vehicle Cards

Responsive grid. Each card shows:

```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  BMW-1001        🔴  │  │  MNI-2001        🟠  │  │  RR-3001         🟢  │
│  CRITICAL            │  │  WARNING              │  │  HEALTHY              │
│                      │  │                      │  │                      │
│  🔴 5  🟠 3  🔵 12  │  │  🔴 1  🟠 4  🔵 8   │  │  🔴 0  🟠 0  🔵 6   │
│  Total: 20           │  │  Total: 13           │  │  Total: 6            │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

| Color | Status | Meaning |
|:-----:|--------|---------|
| 🔴 | **Critical** | 3+ errors in the last 24 hours |
| 🟠 | **Warning** | Has errors, but not critical |
| 🟢 | **Healthy** | No errors recorded |

Click any card to open that vehicle's **detail page**.

<br>

### 📋 Vehicle Detail Page

Full diagnostic profile for one vehicle:

```
  ← Back to Fleet Overview

  ┌─────────────────────────────────────────────────────┐
  │  BMW-1001                              🔴 CRITICAL  │
  ├─────────┬──────────┬──────────┬─────────────────────┤
  │ 🔴 5    │ 🟠 3     │ 🔵 12    │ First: Jan 15       │
  │ Errors  │ Warnings │ Info     │ Last:  Feb 20       │
  ├─────────┴──────────┴──────────┴─────────────────────┤
  │                                                     │
  │  Error Code Breakdown                               │
  │  ┌────────┬────────┬───────┐                        │
  │  │ P0420  │ 🔴     │ 5     │                        │
  │  │ P0301  │ 🟠     │ 3     │                        │
  │  │ P0128  │ 🔵     │ 2     │                        │
  │  └────────┴────────┴───────┘                        │
  │                                                     │
  │  Recent Events                                      │
  │  ┌───────────┬────────┬────┬────────┬───────────┐   │
  │  │ Timestamp │ Level  │Code│ Message│           │   │
  │  ├───────────┼────────┼────┼────────┤           │   │
  │  │ Feb 20    │ 🔴     │P042│ Cat... │           │   │
  │  │ Feb 19    │ 🟠     │P030│ Mis... │           │   │
  │  └───────────┴────────┴────┴────────┴───────────┘   │
  │                                                     │
  │  🔗 View All Events →                               │
  └─────────────────────────────────────────────────────┘
```

- **Breadcrumb** at the top — click to go back to the fleet grid
- **Health chip** — CRITICAL, WARNING, or HEALTHY with color
- **Stats row** — error/warning/info counts + first seen / last active
- **Error Code Breakdown** — top codes for this vehicle
- **Recent Events** — latest diagnostic events
- **"View All Events"** — jumps to Events page pre-filtered for this vehicle

<br>

---

<br>

## 📋 Events Page

### 🎛️ Filtering

Same filter panel as the Dashboard:

> 🚗 Vehicle ID · 🔧 Error Code · ⚠️ Severity · 📅 Date From · 📅 Date To

All case-insensitive. Filter chips and toast confirmations work the same way.

<br>

### 📊 Results Table

```
  Showing 5 of 142 filtered results
  ┌─────────────┬───────────┬──────────┬────────┬─────────────────────┐
  │ Timestamp   │ Vehicle   │ Severity │ Code   │ Message             │
  ├─────────────┼───────────┼──────────┼────────┼─────────────────────┤
  │ Feb 20 14:32│ BMW-1001 →│ 🔴 CRIT  │ P0420  │ Catalyst below...  │
  │ Feb 20 13:15│ MNI-2003 →│ 🟠 WARN  │ P0301  │ Cylinder 1 mis...  │
  │ Feb 20 12:01│ X5-4001  →│ 🔵 INFO  │ P0128  │ Coolant temp...    │
  └─────────────┴───────────┴──────────┴────────┴─────────────────────┘
                                                        ◀ 1  2  3  4 ▶
```

- **Result bar** shows "5 of 20 filtered results" or "142 total events"
- **Vehicle IDs** are clickable links → go to that vehicle's detail page
- Click **column headers** to sort. Click again to flip the order.
- **Pagination** at the bottom for large result sets

<br>

---

<br>

## ⚠️ Severity Levels

<table>
<tr>
<td align="center" width="33%">

### 🔴 CRITICAL
**Needs immediate attention**

Critical failure detected. Vehicle may be unsafe or non-operational.

</td>
<td align="center" width="33%">

### 🟠 WARN
**Possible issue**

Something looks off. Worth investigating before it becomes critical.

</td>
<td align="center" width="33%">

### 🔵 INFO
**Routine event**

Normal diagnostic activity. No action required.

</td>
</tr>
</table>

<br>

---

<br>

## 🚗 Fleet Vehicle Types

Seed data covers eight vehicle lines across the BMW Group:

| | Prefix | Vehicle Line | Example ID |
|---|--------|-------------|------------|
| 🚙 | `BMW-1xxx` | BMW Sedans | BMW-1001 |
| 🚙 | `MNI-2xxx` | MINI Cooper | MNI-2001 |
| 🚙 | `RR-3xxx` | Rolls Royce | RR-3001 |
| 🚙 | `X5-4xxx` | X5 SUV | X5-4001 |
| ⚡ | `I4-5xxx` | i4 Electric | I4-5001 |
| 🏎️ | `M3-6xxx` | M3 Performance | M3-6001 |
| ⚡ | `IX-7xxx` | iX Electric SUV | IX-7001 |
| 🚙 | `S7-8xxx` | 7 Series | S7-8001 |

<br>

---

<br>

## 📡 API Endpoints

For anyone querying the backend directly or integrating with other tools:

| Method | Endpoint | What it does |
|:------:|----------|-------------|
| `GET` | `/api/events` | Paginated events with query param filters |
| `GET` | `/api/aggregations/errors-per-vehicle` | Error counts by vehicle |
| `GET` | `/api/aggregations/top-codes` | Top diagnostic codes (supports filters) |
| `GET` | `/api/aggregations/critical-vehicles` | Vehicles with 3+ critical events in 24h |
| `GET` | `/api/vehicles/:id/summary` | Single vehicle summary |
| `GET` | `/api-docs` | Swagger UI |
| `GET` | `/health` | Health check |

> [!TIP]
> Full interactive docs with request/response schemas at [localhost:3000/api-docs](http://localhost:3000/api-docs)

<br>

---

<br>

## 💡 Tips & Shortcuts

<table>
<tr>
<td>🎯</td>
<td><strong>Combine filters for precision</strong> — Use severity + vehicle ID together to see only critical events for a specific vehicle.</td>
</tr>
<tr>
<td>📊</td>
<td><strong>Dashboard sections are intentionally separate</strong> — "Filtered Results" reacts to all filters. "Fleet-Wide Overview" only reacts to date range. You always keep a stable fleet picture.</td>
</tr>
<tr>
<td>🔤</td>
<td><strong>Case doesn't matter</strong> — <code>BMW-1001</code>, <code>bmw-1001</code>, <code>Bmw-1001</code> all work identically everywhere.</td>
</tr>
<tr>
<td>🔗</td>
<td><strong>Click vehicle IDs anywhere</strong> — In the Events table, on the Dashboard chart, on Vehicle cards. They always link to the detail page.</td>
</tr>
<tr>
<td>📖</td>
<td><strong>Use the Swagger docs</strong> — Build custom queries or hook into other tools. Try requests directly in the browser at <code>/api-docs</code>.</td>
</tr>
<tr>
<td>⌨️</td>
<td><strong>Keyboard shortcuts</strong> — <kbd>Enter</kbd> applies search, <kbd>Escape</kbd> closes dropdowns, <kbd>Tab</kbd> moves between filter fields.</td>
</tr>
</table>

<br>

---

<div align="center">

<br>

*Fleet Health & Diagnostics Console — User Guide*

</div>
