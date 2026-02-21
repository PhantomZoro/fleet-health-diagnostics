---
phase: 03-frontend-foundation
plan: 01
subsystem: ui
tags: [angular, ngrx, component-store, scss, routing, proxy]

requires:
  - phase: 02-backend-api-layer
    provides: Express API at localhost:3000 with /api/* routes that Angular proxy forwards to

provides:
  - Angular 19 standalone project with SCSS and routing configured
  - /api/* proxy to backend at localhost:3000 via proxy.conf.json
  - "@ngrx/component-store@^19 installed and ready for state management"
  - App shell with sidebar nav (Dashboard, Events links) and router-outlet
  - Lazy-loaded route stubs for /dashboard and /events
  - BMW-inspired CSS custom property design token system in styles.scss

affects:
  - 03-02 (API service and models use provideHttpClient from app.config)
  - 03-03 (DiagnosticsStore injects into app shell components)
  - 04-01 (shared components consume CSS custom properties)
  - 04-02 (events feature component loaded via lazy route)
  - 04-03 (dashboard feature component loaded via lazy route)

tech-stack:
  added:
    - "@angular/cli@19 — project scaffold"
    - "@angular/core@19, @angular/router@19, @angular/common@19 — framework core"
    - "@angular/animations@19 — required for provideAnimationsAsync()"
    - "@ngrx/component-store@19.2.1 — ComponentStore state management"
    - "zone.js — Angular change detection"
  patterns:
    - "Standalone components — no NgModules, each component declares its own imports"
    - "Lazy loadComponent — routes use dynamic import() for code splitting"
    - "CSS custom properties — design tokens via :root vars, no SCSS variables"
    - "provideAnimationsAsync — lazy animation browser loading"

key-files:
  created:
    - frontend/proxy.conf.json
    - frontend/src/app/app.component.ts
    - frontend/src/app/app.component.html
    - frontend/src/app/app.component.scss
    - frontend/src/app/app.routes.ts
    - frontend/src/app/features/dashboard/dashboard.component.ts
    - frontend/src/app/features/events/events.component.ts
  modified:
    - frontend/angular.json
    - frontend/src/app/app.config.ts
    - frontend/src/styles.scss

key-decisions:
  - "@ngrx/component-store@^19.0.0 explicit version — npm latest resolves to Angular 21 aligned version"
  - "Lazy loadComponent for all feature routes — produces separate JS chunks per route"
  - "CSS custom properties over SCSS variables — browser-inspectable, runtime-changeable tokens"
  - "provideAnimationsAsync() — lazy animation browser load improves initial bundle"

patterns-established:
  - "Design token system: all color/spacing values in :root as --var-name, consumed via var()"
  - "Feature route structure: features/<name>/<name>.component.ts loaded via lazy loadComponent"
  - "App shell pattern: sidebar nav + <main> + <router-outlet> in app.component"

requirements-completed:
  - STATE-01

duration: 6min
completed: 2026-02-21
---

# Phase 3 Plan 01: Angular Foundation Summary

**Angular 19 standalone project with proxy to Express backend, @ngrx/component-store@19, app shell sidebar navigation, lazy-loaded route stubs, and BMW-inspired CSS custom property design token system**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-21T12:43:41Z
- **Completed:** 2026-02-21T12:49:55Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Angular 19 project scaffolded with standalone components, SCSS, routing, and skip-tests
- API proxy (`/api/*` -> `localhost:3000`) configured in `proxy.conf.json` and wired into `angular.json` serve target
- `@ngrx/component-store@19.2.1` installed with explicit version pin (not `latest`)
- App shell with fixed sidebar nav (Dashboard, Events), `<router-outlet>`, semantic HTML (`<nav>`, `<main>`)
- Route stubs for `/dashboard` and `/events` using `loadComponent` lazy loading — separate JS chunks confirmed in build output
- BMW-inspired CSS custom properties established in `styles.scss`: `--primary: #1C69D4`, surface/text/border token families
- Responsive layout: sidebar collapses from 240px fixed column to full-width horizontal top bar on mobile (max-width: 768px)

## Task Commits

1. **Task 1: Scaffold Angular 19 project with proxy and ComponentStore** - `4da71e0` (chore)
2. **Task 2: App shell layout, routes, and global styles** - `03aa22d` (feat)

**Plan metadata:** docs(03-01): complete Angular foundation plan

## Files Created/Modified

- `frontend/proxy.conf.json` — API proxy: /api/* -> http://localhost:3000
- `frontend/angular.json` — Added proxyConfig: "proxy.conf.json" to serve target options
- `frontend/package.json` — @ngrx/component-store@19.2.1, @angular/animations@19 added
- `frontend/src/app/app.config.ts` — provideRouter, provideHttpClient, provideAnimationsAsync
- `frontend/src/app/app.routes.ts` — redirect / -> /dashboard, lazy routes for dashboard and events
- `frontend/src/app/app.component.ts` — Standalone shell with RouterOutlet, RouterLink, RouterLinkActive
- `frontend/src/app/app.component.html` — Sidebar nav + main content area with router-outlet
- `frontend/src/app/app.component.scss` — Flex layout, sidebar styles, responsive media query
- `frontend/src/app/features/dashboard/dashboard.component.ts` — Stub component
- `frontend/src/app/features/events/events.component.ts` — Stub component
- `frontend/src/styles.scss` — BMW-inspired CSS custom properties (:root design tokens)

## Decisions Made

- `@ngrx/component-store@^19.0.0` pinned explicitly — npm `latest` resolves to v21.x (Angular 21 aligned), which breaks peer dependencies with Angular 19
- `loadComponent` lazy routes — each feature route is a separate JS chunk; dashboard-component at 388 bytes and events-component at 380 bytes confirmed in build output
- CSS custom properties (not SCSS variables) for design tokens — inspectable in browser dev tools, can be overridden at runtime without recompile
- `provideAnimationsAsync()` instead of `provideAnimations()` — lazy loads the animation browser module only when animations are first needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @angular/animations package**
- **Found during:** Task 1 (verifying build after app.config.ts update)
- **Issue:** `provideAnimationsAsync()` dynamically imports `@angular/animations/browser` at runtime. Angular CLI 19 scaffold does not include `@angular/animations` — build failed with "Could not resolve @angular/animations/browser"
- **Fix:** Ran `npm install @angular/animations@^19.0.0` from frontend/ directory
- **Files modified:** frontend/package.json, frontend/package-lock.json
- **Verification:** `npx ng build` completed without errors after install
- **Committed in:** `4da71e0` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** Required fix for build to pass. No scope creep — animations package is part of the Angular 19 ecosystem and was already referenced in the plan's app.config.ts.

## Issues Encountered

None beyond the missing @angular/animations package documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Angular 19 dev server ready: `cd frontend && npx ng serve` starts at localhost:4200
- /api/* proxy active — backend requests will forward to localhost:3000
- @ngrx/component-store ready for DiagnosticsStore implementation (Plan 03-03)
- Route stubs in place for feature development (Plans 04-02, 04-03)
- CSS design token system ready for all shared UI components (Plan 04-01)

## Self-Check: PASSED

All key files verified present. Task commits `4da71e0` and `03aa22d` confirmed in git log. Angular build passes without errors. `@ngrx/component-store@19.2.1` installed. Lazy chunks for `dashboard-component` (388 bytes) and `events-component` (380 bytes) confirmed in build output.

---
*Phase: 03-frontend-foundation*
*Completed: 2026-02-21*
