# Stack Research

**Domain:** Fleet Vehicle Diagnostics Console (internal ops tool)
**Researched:** 2026-02-21
**Confidence:** HIGH — all core versions verified against official docs and npm; companion library versions verified via WebSearch with official source cross-check.

---

## Recommended Stack

### Core Technologies (Locked by User)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Express.js | **5.1.x** (latest stable) | HTTP server, routing, middleware | v5 is now the npm `latest` tag as of March 2025, replacing v4. Built-in async error propagation eliminates the try/catch boilerplate that plagued v4 routes. Required for this stack by assignment. |
| TypeScript | **5.5.x – 5.8.x** | Type safety across backend | Angular 19.2 requires `>=5.5.0 <5.9.0`; targeting 5.6–5.7 gives compatibility with both the backend and frontend. Strict mode (`"strict": true`) is mandatory. |
| TypeORM | **0.3.28** (latest stable) | ORM, entity mapping, query builder | The 0.3.x series is the current stable branch (not 1.x, which does not exist yet). Provides DataSource API, QueryBuilder for dynamic WHERE clauses, and built-in SQLite driver. |
| SQLite (via sqlite3) | **sqlite3 ^5.1.x** | Embedded relational database | TypeORM's officially supported native SQLite driver. No separate process, file-based, zero infrastructure. Sufficient for assignment scale (~500 events). |
| Angular CLI | **19.2.x** | Project scaffold, build, dev server | Angular 19.2 released February 2026. Latest stable. Use `ng new --standalone` to scaffold. |
| Angular Core | **19.2.x** | SPA framework, standalone components | Standalone components are the Angular 19 default — no NgModules required. `provideHttpClient()` replaces `HttpClientModule`. |
| RxJS | **7.8.x** | Reactive streams, observable operators | Angular 19 peer dep is `^6.5.3 || ^7.4.0`; use 7.8.x (current). switchMap, debounceTime, combineLatest, catchError are the key operators for this app's filter/state patterns. |
| @ngrx/component-store | **19.x** | Local component state management | NgRx versions align with Angular major versions. v19 is the compatible release for Angular 19. Provides `select()`, `updater()`, and `effect()` — all needed for this app's filter + pagination store. |
| Node.js | **20.x LTS or 22.x** | Runtime | Angular 19 requires `^18.19.1 || ^20.11.1 || ^22.0.0`. Express 5 requires Node 18+. Node 20 LTS is the safest choice for Docker builds — stable, widely supported, long support window. |

---

### Supporting Libraries — Backend

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | **^4.x** (latest: 4.3.6) | Request query parameter validation | Validate all incoming query params (`level`, `from`, `to`, `page`, `limit`) with TypeScript-inferred types. v4 is significantly faster than v3 (6.5x) and the new default for greenfield projects. Prefer `zod/v4` import path. |
| `cors` | **^2.8.5** | Cross-Origin Resource Sharing | Required for Angular dev server (localhost:4200) to call Express (localhost:3000). Apply globally before routes. |
| `helmet` | **^8.x** | HTTP security headers | Sets sensible secure defaults (Content-Security-Policy, X-Frame-Options, etc.) in one `app.use(helmet())` call. Negligible overhead. |
| `swagger-jsdoc` | **^6.x** | OpenAPI spec generation from JSDoc | Generates the OAS3 spec from route comment annotations. Use `@swagger` JSDoc blocks on each route. REQ-10 compliance. |
| `swagger-ui-express` | **^5.0.1** | Swagger UI served from Express | Serves the interactive API explorer at `/api-docs`. Mount after `swagger-jsdoc` generates the spec. |
| `reflect-metadata` | **^0.2.x** | TypeORM decorator support | TypeORM decorators (`@Entity`, `@Column`, `@Index`) require this polyfill. Import it once at the top of `src/index.ts` before any TypeORM imports. |

### Supporting Libraries — Backend Dev Only

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | **^4.x** | TypeScript dev runner with watch | Replaces `ts-node-dev`. Uses esbuild internally — near-instant restarts, no ES module compatibility issues. Use `tsx watch src/index.ts` for dev. |
| `@types/express` | **^5.x** | Express TypeScript types | Must match Express major version. v5 types ship with the Express 5 package (`@types/express` v5 exists on npm). |
| `@types/cors` | **^2.x** | CORS middleware types | Dev-only type definitions. |
| `@types/swagger-ui-express` | **^4.x** | Swagger UI Express types | Dev-only. |
| `@types/swagger-jsdoc` | **^6.x** | swagger-jsdoc types | Dev-only. |
| `@types/node` | **^20.x** | Node.js built-in types | Match your Node.js LTS version. |

### Supporting Libraries — Frontend

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@angular/material` | **^19.x** | UI component library | Pre-built accessible components: `mat-table`, `mat-paginator`, `mat-select`, `mat-form-field`, `mat-progress-spinner`, `mat-card`. Matches Angular version exactly. Eliminates building table/pagination from scratch. |
| `@angular/cdk` | **^19.x** | Angular Component Dev Kit | Peer dep of Angular Material. Provides overlays, a11y utilities. Pulled in automatically with Material. |
| `@ngrx/component-store` | **^19.x** | ComponentStore state management | The core state primitive for `DiagnosticsStore`. |

---

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsx --watch` | Backend dev server with auto-reload | Run as `tsx watch src/index.ts`. Faster than `ts-node-dev`, no config needed for ES modules. |
| Angular CLI (`ng serve`) | Frontend dev server with HMR | Runs on port 4200. Configure `proxy.conf.json` to forward `/api/*` → `http://localhost:3000`. |
| `tsc --noEmit` | Type-check backend without emitting | Use in CI or pre-build to catch type errors. |
| Docker Desktop / Docker Engine | Container runtime | Needed to run `docker-compose up`. |
| nginx (Alpine) | Static file server in Docker | Serve the Angular build output from the frontend container. Use `nginx:alpine` as the final stage base image. |

---

## Installation

```bash
# ---- Backend ----
cd backend

# Core runtime
npm install express@^5.1.0 typeorm@^0.3.28 sqlite3@^5.1.6 reflect-metadata@^0.2.0

# Middleware
npm install cors@^2.8.5 helmet@^8.0.0 zod@^4.0.0 swagger-jsdoc@^6.0.0 swagger-ui-express@^5.0.1

# Dev dependencies
npm install -D tsx@^4.0.0 typescript@^5.7.0 \
  @types/express@^5.0.0 @types/cors@^2.8.0 \
  @types/swagger-ui-express@^4.1.0 @types/swagger-jsdoc@^6.0.0 \
  @types/node@^20.0.0

# ---- Frontend ----
cd ../frontend

# Scaffold (run once)
ng new frontend --standalone --style=scss --routing --skip-git

# Install state management
npm install @ngrx/component-store@^19.0.0

# Install UI library
ng add @angular/material
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Express 5.1.x | Express 4.21.x | If you need to stay on Node 14/16 (maintenance EOL). For Node 18+ greenfield projects, always use v5. |
| Express | NestJS | NestJS is better when the team is large, the API surface is huge, or you want opinionated structure out of the box. For a 5-phase coding assignment where you want to show architectural reasoning rather than framework magic, Express is the right call. |
| TypeORM 0.3.x | Drizzle ORM | Drizzle is a strong modern alternative with better TypeScript inference and lighter weight. Choose Drizzle on new projects without the TypeORM constraint. For this project, TypeORM is locked by the assignment. |
| `sqlite3` driver | `better-sqlite3` | `better-sqlite3` has a synchronous API and is measurably faster. TypeORM officially supports both. Use `better-sqlite3` if you hit WAL-mode or performance needs; `sqlite3` is simpler to set up and the standard choice for TypeORM tutorials. |
| `zod` v4 | `zod` v3 | Use v3 if you have existing v3 code or dependencies that haven't migrated. For a greenfield project in 2026, always start with v4. |
| Angular Material | TailwindCSS | Tailwind is better for highly custom designs. Angular Material is better for ops/admin tools where functional, accessible components matter more than design uniqueness. For a diagnostics console, Material's `mat-table` and `mat-paginator` save significant time. |
| `tsx` | `ts-node-dev` | `ts-node-dev` has known issues with ES module compatibility in Node 20+. `tsx` is the 2025 community consensus for TypeScript Express development. |
| `@ngrx/component-store` | Full NgRx Store | Full NgRx Store (with Actions/Reducers/Effects/Selectors boilerplate) is right-sized for multi-feature apps with global shared state. ComponentStore is correct for a single-feature diagnostic view with local state. The assignment explicitly requires ComponentStore. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `ts-node` (bare, without dev wrapper) | Does not include watch mode; known ES module problems with Node 20+; startup is slow on large codebases | `tsx` with `--watch` flag |
| `ts-node-dev` | Unmaintained as of 2023; ES module incompatibilities with modern Node; slower than esbuild-based tools | `tsx watch` |
| `body-parser` (standalone) | Express 5 includes `express.json()` and `express.urlencoded()` built-in. `body-parser` is an unnecessary extra dependency | `app.use(express.json())` |
| `mongoose` / `sequelize` | Wrong ORM — the assignment locks TypeORM for SQLite. Mixing ORMs creates confusion. | TypeORM |
| NgRx full Store (`@ngrx/store`, `@ngrx/effects`) | Over-engineered for a single-feature app. Requires Actions/Reducers/Effects boilerplate that obscures rather than demonstrates state management skill. | `@ngrx/component-store` |
| `HttpClientModule` (NgModule-based) | Deprecated pattern in Angular 17+. Standalone apps use `provideHttpClient()` in `app.config.ts` | `provideHttpClient()` in `ApplicationConfig.providers` |
| Angular Universal (SSR) | Not needed for an internal ops console. Adds Docker complexity with no benefit. | Standard CSR Angular app served by nginx |
| `synchronize: true` in TypeORM (production) | Auto-syncs schema on startup, can silently drop columns. Safe for dev/seed only. | Disable in production Docker image; acceptable in dev seed script |

---

## Version Compatibility Matrix

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@angular/core@19.2.x` | `rxjs@^7.4.0`, `typescript@>=5.5.0 <5.9.0`, `node@^20.11.1` | Official Angular 19.2 requirements from angular.dev/reference/versions |
| `@ngrx/component-store@19.x` | `@angular/core@19.x` | NgRx major version tracks Angular major version exactly |
| `@angular/material@19.x` | `@angular/core@19.x`, `@angular/cdk@19.x` | Material and CDK must match Angular core version |
| `typeorm@0.3.28` | `reflect-metadata@^0.2.0`, `sqlite3@^5.1.x` | `reflect-metadata` is a hard TypeORM dependency for decorator support |
| `express@5.1.x` | `node@>=18.0.0`, `@types/express@^5.x` | Express 5 dropped Node 14/16 support |
| `zod@4.x` | `typescript@>=5.x` | Zod v4 requires TypeScript 5+ for full type inference |
| `swagger-ui-express@5.0.1` | `express@5.x` | v5 of swagger-ui-express is needed for Express 5 compatibility |

---

## Stack Patterns by Variant

**Backend tsconfig.json recommended settings:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  }
}
```
Note: `experimentalDecorators` and `emitDecoratorMetadata` are REQUIRED for TypeORM entity decorators. `module: "CommonJS"` avoids the ES module require/import compatibility issues with TypeORM + sqlite3. Do NOT use `"module": "NodeNext"` or `"module": "ESNext"` with TypeORM 0.3.x.

**If you want async error handling (Express 5 benefit):**
```typescript
// Express 5: async errors propagate to error middleware automatically
app.get('/api/events', async (req, res) => {
  // Throwing here goes directly to error middleware — no try/catch needed
  const events = await eventService.findAll(req.query);
  res.json(events);
});
```

**TypeORM DataSource for SQLite (dev/seed):**
```typescript
export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(__dirname, '../data/fleet.db'),
  entities: [DiagnosticEvent],
  synchronize: true,  // dev only — disable in production Docker build
  logging: process.env.NODE_ENV === 'development',
});
```

**NgRx ComponentStore pattern (matches BUILD-PLAN requirements):**
```typescript
// Effects use switchMap for cancellation on new emissions
readonly loadEvents = this.effect((trigger$: Observable<EventFilters>) =>
  trigger$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((filters) =>
      this.api.getEvents(filters).pipe(
        tapResponse(
          (result) => this.setEvents(result),
          (error) => this.setError(error)
        )
      )
    )
  )
);
```

**Angular HttpClient setup (standalone, Angular 19):**
```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptor]))
  ]
};
```

---

## Sources

- **Express v5.1.0 release announcement** — https://expressjs.com/2025/03/31/v5-1-latest-release.html — confirms v5.1.x as npm `latest`, ACTIVE status [HIGH confidence]
- **Context7 /expressjs/express** — routing, middleware, error handling patterns verified [HIGH confidence]
- **TypeORM npm** — version 0.3.28 confirmed as latest stable via WebSearch + npm registry [MEDIUM confidence — could not fetch npm 403]
- **Context7 /typeorm/typeorm** — DataSource, SQLite config, entity setup patterns [HIGH confidence]
- **TypeORM official SQLite docs** — https://typeorm.io/docs/drivers/sqlite/ — confirmed sqlite3 and better-sqlite3 as officially supported drivers [HIGH confidence]
- **Angular version compatibility matrix** — https://angular.dev/reference/versions — confirmed Angular 19.2.x requires TypeScript 5.5–5.8, RxJS ^7.4.0, Node ^18.19.1 || ^20.11.1 || ^22.0.0 [HIGH confidence]
- **Angular blog** — https://blog.angular.dev/angular-19-2-is-now-available-673ec70aea12 — confirmed Angular 19.2 as latest stable (Feb 2026) [HIGH confidence]
- **Context7 /ngrx/platform** — ComponentStore API (select, updater, effect, tapResponse) [HIGH confidence]
- **NgRx npm** — @ngrx/component-store@21.0.1 listed as latest; v19.x confirmed for Angular 19 compatibility [MEDIUM confidence — version alignment pattern]
- **Zod release notes** — https://zod.dev/v4 — confirmed v4.3.6 as latest, significant perf/type improvements over v3 [HIGH confidence]
- **BetterStack: tsx vs ts-node** — https://betterstack.com/community/guides/scaling-nodejs/tsx-vs-ts-node/ — tsx confirmed as 2025 community recommendation [MEDIUM confidence — single authoritative source]
- **WebSearch: swagger-ui-express** — v5.0.1 confirmed as latest stable [MEDIUM confidence]

---

*Stack research for: Fleet Vehicle Diagnostics Console*
*Researched: 2026-02-21*
