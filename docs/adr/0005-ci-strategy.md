# ADR-0005: GitHub Actions Continuous Integration Strategy

## Context & Problem Statement

CoachingOS requires automated continuous integration (CI) enforcement to prevent regressions, protect multi-tenant security boundaries, ensure database schema consistency, and maintain zero-drift quality standards across all packages.

## Decision Drivers

- **Authoritative Gatekeeper:** CI serves as the single source of truth for code quality, safety, and migration correctness prior to merging into protected integration branches.
- **Real PostgreSQL 18 Parity:** Integration tests and migration checks MUST execute against a real PostgreSQL 18 service container (`postgres:18-alpine`) in CI to match local development PostgreSQL 18.x. SQLite or mock database drivers are strictly forbidden.
- **Prisma 7 Migration & Schema Drift Validation:** Schema changes without corresponding migrations MUST fail CI (`prisma migrate diff --exit-code --from-config-datasource --to-schema`).
- **Reproducibility:** Dependencies must be installed using `pnpm install --frozen-lockfile` with Node.js 24 LTS and pnpm 11.x.
- **Lean Developer Workflows:** Local Git hooks (Husky / lint-staged) are deferred at current team scale to minimize developer overhead while relying on CI as the authoritative gate.

## Decision Outcome

1. **GitHub Actions Workflow (.github/workflows/ci.yml):**
   - Triggers on Pull Requests and Pushes to `master`, `main`, and `develop`. `push` and `pull_request` events represent distinct, complementary validation contexts (`push` validates raw branch commits; `pull_request` evaluates the merged PR ref `refs/pull/X/merge`).
   - Concurrency group `ci-${{ github.ref }}` cancels stale PR builds in progress.
   - Enforces least-privilege permissions (`contents: read`).
2. **PostgreSQL 18 Service Container:**
   - Spawns `postgres:18-alpine` container with disposable CI credentials (`coachingos_ci`).
   - Uses `pg_isready` readiness health checks before executing database steps.
3. **Prisma 7 Migration & Schema Drift Policy:**
   - Executes `pnpm db:migrate:deploy` to apply migrations to PostgreSQL 18, `pnpm db:status` to verify migration history, and `pnpm db:drift:check` (`prisma migrate diff --exit-code --from-config-datasource --to-schema ./prisma/schema.prisma --config ./prisma.config.ts`) to detect unmigrated schema changes.
4. **4-Stage Pipeline Architecture:**
   - Stage 1 (`quality`): Formatting check (`pnpm format:check`), ESLint (`pnpm lint`), TypeScript (`pnpm typecheck`).
   - Stage 2 (`database-and-tests`): Environment check (`pnpm env:check`), Prisma validate/generate, `db:migrate:deploy`, `db:status`, `db:drift:check`, `db:health`, `db:seed`, `verify:auth`, `verify:infra`, Vitest unit/integration tests (`pnpm test`).
   - Stage 3 (`e2e`): Playwright Chromium browser smoke tests (`pnpm test:e2e`). Failure artifacts uploaded to GitHub Actions Artifacts (7-day retention).
   - Stage 4 (`build`): Production Next.js build verification (`pnpm build`).
5. **No Deployment in Phase 0.9:**
   - Production cloud deployments, Docker image publishing, CDN hosting, and secrets provisioning are deferred to Phase 0.11.

## Status

**APPROVED**
