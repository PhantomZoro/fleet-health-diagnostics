# Fleet Health & Diagnostics Console -- Requirements

## Project Overview

The Fleet Health & Diagnostics Console is an internal operations tool for BMW fleet engineers to monitor vehicle diagnostic events in near-real-time. The application ingests structured log data from fleet vehicles, provides searchable event history with combinable filters, and surfaces aggregated error patterns to help engineers identify critical vehicles and recurring fault codes.

## Business Requirements

| ID     | Requirement                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------- |
| BR-01  | Ingest and store structured diagnostic log data from fleet vehicles                                  |
| BR-02  | Provide searchable event history with combinable filters (vehicle ID, severity, error code, time range) |
| BR-03  | Support pagination for large event datasets (default 20 items/page, configurable up to 100)          |
| BR-04  | Aggregate error counts per vehicle for fleet-wide visibility                                         |
| BR-05  | Identify the top 10 most frequently occurring diagnostic codes across the fleet                      |
| BR-06  | Flag critical vehicles -- those with 3 or more ERROR-level events within a trailing 24-hour window   |
| BR-07  | Provide visual severity distinction (ERROR / WARN / INFO) for rapid triage in the UI                 |
| BR-08  | Enable one-command deployment for evaluation via Docker Compose                                      |

## Assumptions

| # | Assumption                                                                                         | Rationale                                                                                          |
|---|----------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| 1 | Log format is structured text: `[timestamp] [VEHICLE_ID:VH-XXXX] [level] [CODE:XXXXX] message`    | Consistent format enables deterministic regex parsing without ambiguity handling                    |
| 2 | "Critical vehicle" uses DB-relative time -- MAX(timestamp) minus 24 hours, not wall-clock time     | Seed data timestamps are fixed; wall-clock comparison would produce zero critical vehicles on demo  |
| 3 | Default pagination is page 1 with 20 items per page                                                | Balances initial payload size with usability; overridable via query parameters (max 100)            |
| 4 | Seed data contains ~500 events across 20 vehicles using realistic OBD-II diagnostic codes          | Provides sufficient volume to demonstrate filtering, pagination, and aggregation without being excessive |
| 5 | SQLite is sufficient for a single-instance deployment                                              | No concurrent write scaling needed for an internal operations console; zero-config for reviewers    |
| 6 | No authentication is required -- the tool runs on a trusted internal network                       | Scope is a demonstration console, not a production SaaS product; auth would add complexity without demonstrating relevant patterns |

## Out of Scope

| Feature                               | Reasoning                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Real-time streaming / WebSocket push  | Read-only dashboard; periodic page refresh or re-query is sufficient for diagnostic review      |
| User authentication / RBAC            | Internal tool assumption; demonstrating auth patterns is orthogonal to the fleet diagnostics domain |
| Multi-instance / horizontal scaling   | SQLite is single-writer by design; scaling would require a database migration to PostgreSQL     |
| Log file upload UI                    | The seed-on-startup approach demonstrates the full parse-to-store pipeline without a file upload form |
| Alert / notification system           | The console focuses on monitoring and exploration, not proactive alerting                       |
| Export to CSV / PDF                   | Read-only console pattern; export would be a natural extension but is not core to diagnostics   |
