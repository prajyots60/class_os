# ADR-0007: Production Deployment Strategy

## Context & Problem Statement

CoachingOS requires a secure, reproducible, production-ready deployment architecture supporting Next.js 16 (App Router), Node.js 24 LTS, pnpm monorepo structure, Prisma 7 ORM, Better Auth 1.6.26, and Pino/ErrorReporter observability without introducing unnecessary infrastructure overhead or premature Kubernetes/Docker complexity.

## Decision Drivers

- **Low Operational Complexity:** Focus engineering effort on CoachingOS SaaS domain features rather than managing virtual machines, Kubernetes clusters, or complex container registries.
- **Serverless Compatibility:** Next.js App Router on Vercel scales automatically from zero to high traffic spikes.
- **Database Connection Handling:** Serverless environments create rapid connection spikes. The database provider must support native connection pooling and direct migration connections.
- **Preview Database Isolation:** Pull Requests must deploy to preview environments connected to isolated preview database branches or instances, never touching production data.

## Vendor & Provider Research (Date Checked: August 9, 2026)

1. **Deployment Target — Vercel:**
   - **Source:** https://vercel.com/docs (Checked: August 9, 2026)
   - **Capabilities:** Native Node.js 24 LTS runtime support, pnpm 11 workspace support, Turborepo optimization, Next.js 16 App Router native optimization, instant preview deployments.
2. **Managed PostgreSQL Provider Evaluation:**
   - **Neon PostgreSQL (Selected):**
     - **Source:** https://neon.tech/pricing (Checked: August 9, 2026)
     - **Compute/Storage:** Serverless autoscaling (scale to zero compute), 0.5 GB free storage, native copy-on-write instant database branching (10 free branches per project).
     - **Connection Pooling:** Native PgBouncer connection pooler (up to 10,000 pooled connections via `-pooler` hostname suffix). Zero 7-day inactivity database destruction.
   - **Prisma Postgres (Evaluated):** Usage-based billing (100k free ops/month, 500 MB storage), built-in PgBouncer pooling (`pooled.db.prisma.io`). Good integration, but lacks native branch copy-on-write capabilities.
   - **Supabase PostgreSQL (Evaluated):** Includes Supavisor pooler, but **auto-pauses databases after 7 days of inactivity on free tier**, which breaks staging/preview environments.

## Decision Outcome

1. **Application Deployment on Vercel:**
   - Root Monorepo directory: `.`
   - Package directory: `apps/web`
   - Build Command: `pnpm build`
   - Runtime Node.js Version: `24.x` (enforced via `package.json` `engines`).
2. **Managed Neon PostgreSQL Architecture:**
   - **Pooled Runtime Connection (`DATABASE_URL`):** Uses Neon PgBouncer pooler connection string for all application routes and Next.js serverless functions.
   - **Direct Migration Connection (`DIRECT_URL`):** Uses direct PostgreSQL connection string for Prisma CLI operations (`prisma migrate deploy`, `prisma migrate status`).
3. **Environment Isolation Topology:**
   - **Development:** Local PostgreSQL `coachingos`.
   - **Test:** Dedicated local PostgreSQL `coachingos_test` (`TEST_DATABASE_URL`).
   - **Preview:** Isolated Neon Preview database branch (`DATABASE_URL_PREVIEW`).
   - **Production:** Isolated Neon Production database (`DATABASE_URL_PROD`).
4. **Schema Evolution & Migration Rules:**
   - Production migrations execute exclusively via `prisma migrate deploy` using `DIRECT_URL`.
   - `prisma db push` and `prisma db seed` are strictly PROHIBITED in production environments.
   - All migrations must follow forward-compatible schema design rules (Phase A: add nullable column, Phase B: deploy application code, Phase C: backfill, Phase D: enforce constraints).
5. **Deferred Infrastructure:**
   - Kubernetes, Docker orchestration, Terraform, Pulumi, AWS ECS/EKS, Redis, Kafka, and OpenTelemetry collector are explicitly deferred per ADR-0003, ADR-0006, and ADR-0007.

## Status

**APPROVED**
