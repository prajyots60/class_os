# ADR-0005: GitHub Actions Continuous Integration Strategy

## Context & Problem Statement

CoachingOS requires automated continuous integration (CI) enforcement to prevent regressions, protect multi-tenant security boundaries, ensure database schema consistency, and maintain zero-drift quality standards across all packages.

## Decision Drivers

- **Authoritative Gatekeeper:** CI serves as the single source of truth for code quality, safety, and migration correctness prior to merging into protected integration branches.
- **Real PostgreSQL Parity:** Integration tests and migration checks MUST execute against a real PostgreSQL 17 service container (`postgres:17-alpine`) in CI. SQLite or mock database drivers are strictly forbidden.
- **Prisma 7 Migration Validation:** Schema changes without corresponding migrations must fail CI (`prisma migrate status`).
- **Reproducibility:** Dependencies must be installed using `pnpm install --frozen-lockfile` with Node.js 24 LTS and pnpm 11.x.
- **Lean Developer Workflows:** Local Git hooks (Husky / lint-staged) are deferred at current team scale to minimize developer overhead while relying on CI as the authoritative gate.

## Decision Outcome

1. **GitHub Actions Workflow (.github/workflows/ci.yml):**
   - Triggers automatically on Pull Requests and Pushes to `master`, `main`, and `develop`.
   - Concurrency group `ci-${{ github.ref }}` cancels stale PR builds in progress.
   - Enforces least-privilege permissions (`contents: read`).
2. **PostgreSQL Service Container:**
   - Spawns `postgres:17-alpine` container with disposable CI credentials (`coachingos_ci`).
   - Uses `pg_isready` readiness health checks before executing database steps.
3. **Prisma 7 Migration & Schema Drift Policy:**
   - Executes `prisma migrate deploy` followed by `prisma migrate status` to verify migration history against `prisma/schema.prisma`.
4. **4-Stage Pipeline Architecture:**
   - Stage 1 (`quality`): Formatting check (`pnpm format:check`), ESLint (`pnpm lint`), TypeScript (`pnpm typecheck`).
   - Stage 2 (`database-and-tests`): Environment check (`pnpm env:check`), Prisma validate/generate, `db:migrate:deploy`, `db:status`, `db:health`, `db:seed`, `verify:auth`, `verify:infra`, Vitest unit/integration tests (`pnpm test`).
   - Stage 3 (`e2e`): Playwright Chromium browser smoke tests (`pnpm test:e2e`). Failure artifacts uploaded to GitHub Actions Artifacts (7-day retention).
   - Stage 4 (`build`): Production Next.js build verification (`pnpm build`).
5. **No Deployment in Phase 0.9:**
   - Production cloud deployments, Docker image publishing, CDN hosting, and secrets provisioning are deferred to Phase 0.11.

## Status

**APPROVED**
