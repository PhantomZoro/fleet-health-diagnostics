# Fleet Health & Diagnostics Console — Requirements

## What This Is

An internal operations tool for BMW fleet engineers. It reads structured diagnostic logs from fleet vehicles, lets you search and filter event history, and shows which vehicles are having problems and what codes keep coming up.

## Business Requirements

| ID     | Requirement                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------- |
| BR-01  | Ingest and store structured diagnostic log data from fleet vehicles                                  |
| BR-02  | Searchable event history with combinable filters (vehicle ID, severity, error code, time range)      |
| BR-03  | Pagination for large datasets (default 20/page, up to 100)                                           |
| BR-04  | Error counts per vehicle for fleet-wide visibility                                                   |
| BR-05  | Top 10 most frequent diagnostic codes across the fleet                                               |
| BR-06  | Flag critical vehicles — 3+ ERROR-level events within a trailing 24-hour window                      |
| BR-07  | Visual severity distinction (ERROR / WARN / INFO) for quick triage                                   |
| BR-08  | One-command deployment via Docker Compose                                                            |
| BR-09  | Fleet overview grid showing all vehicles with color-coded health status                              |
| BR-10  | Vehicle detail page with severity breakdown, top error codes, and recent events                      |

## Assumptions

| # | Assumption                                                                                         | Why                                                                                                |
|---|----------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| 1 | Log format is structured: `[timestamp] [VEHICLE_ID:VH-XXXX] [level] [CODE:XXXXX] message`         | Consistent format means a simple regex parser works reliably                                       |
| 2 | "Critical vehicle" uses DB-relative time — MAX(timestamp) minus 24h, not wall-clock time           | Seed data has fixed timestamps. Wall-clock comparison would show zero critical vehicles in a demo. |
| 3 | Default pagination: page 1, 20 items (max 100)                                                     | Good balance between payload size and usability                                                    |
| 4 | Seed data: ~500 events across 20 vehicles with real OBD-II codes                                   | Enough to show filtering, pagination, and aggregation working properly                             |
| 5 | SQLite is fine for a single-instance deployment                                                     | No concurrent write scaling needed for an internal tool. Zero config for reviewers.                |
| 6 | No authentication needed                                                                            | This is a demo, not production SaaS. Auth would add complexity without showing relevant patterns.  |

## Out of Scope

| Feature                               | Why it's excluded                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Real-time streaming / WebSockets      | Read-only dashboard. Refresh or re-query is fine for diagnostic review.                        |
| Authentication / RBAC                 | Internal tool assumption. Auth is orthogonal to fleet diagnostics.                             |
| Horizontal scaling                    | SQLite is single-writer. Scaling would need a PostgreSQL migration.                            |
| Log file upload UI                    | Seed-on-startup shows the full parse-to-store pipeline without needing a file upload form.     |
| Alert / notification system           | Console is for monitoring and exploration, not proactive alerting.                             |
| CSV / PDF export                      | Nice-to-have extension, not core to diagnostics.                                               |
