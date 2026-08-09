# CoachingOS Production Deployment Playbook

This document details the step-by-step procedures for deploying, maintaining, and recovering CoachingOS in production using Next.js 16 + Vercel + managed Neon PostgreSQL.

---

## 1. Environment Topology & Secrets Separation

CoachingOS strictly enforces 4 isolated environment trust boundaries:

| Environment     | Purpose                | Database Connection                                              | Auth URL                              |
| :-------------- | :--------------------- | :--------------------------------------------------------------- | :------------------------------------ |
| **Development** | Local iteration        | `coachingos` (Local Postgres)                                    | `http://localhost:3000`               |
| **Test**        | Automated Vitest / CI  | `coachingos_test` (Local Postgres)                               | Isolated mock                         |
| **Preview**     | PR Preview Deployments | Neon Preview Database Branch                                     | `https://<preview-domain>.vercel.app` |
| **Production**  | Live SaaS Application  | Managed Neon Production Database (`DATABASE_URL` + `DIRECT_URL`) | `https://<production-domain>`         |

> [!CAUTION]
> **Strict Isolation Rules:**
>
> 1. Production credentials (`DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`) MUST NEVER be set in Preview, Test, or Development environments.
> 2. `prisma db push` and `prisma db seed` are strictly PROHIBITED in Production environments.
> 3. Client bundles (`NEXT_PUBLIC_`) MUST NEVER include database connection strings, auth secrets, or private API keys.

---

## 2. Deployment Checklist

### Pre-Deployment

- [ ] All 4 GitHub Actions CI jobs (`quality`, `database-and-tests`, `e2e`, `build`) passed cleanly on `master`.
- [ ] Schema drift check passed (`pnpm db:status`). Any new `schema.prisma` change includes an authoritative migration file in `prisma/migrations`.
- [ ] Neon production database credentials (`DATABASE_URL` pooled + `DIRECT_URL` direct) are configured in Vercel Production Environment Variables.
- [ ] `BETTER_AUTH_SECRET` (high-entropy 32+ character string) and `BETTER_AUTH_URL` (`https://<production-domain>`) are set.
- [ ] `NODE_ENV` is set to `production`.

### Deployment Execution

- [ ] Run production database migrations using direct connection:
  ```bash
  pnpm db:migrate:deploy
  ```
- [ ] Execute Vercel production deployment build (`pnpm build`).
- [ ] Verify Next.js App Router serverless functions compiled without errors.

### Post-Deployment Verification

- [ ] Verify health check endpoint returns HTTP 200 OK:
  ```bash
  curl -i https://<production-domain>/api/health
  ```
  Expected Payload: `{ "status": "ok", "timestamp": "...", "checks": { "database": "ok" } }`
- [ ] Verify root page `GET /` loads semantic headings, styles, and assets correctly.
- [ ] Verify Better Auth session route returns safe payload:
  ```bash
  curl -i https://<production-domain>/api/auth/get-session
  ```
- [ ] Inspect Vercel runtime logs for uncaught exceptions or slow requests (> 500ms).

---

## 3. Disaster Recovery & Rollback Runbook

### Application Rollback

If a newly deployed Vercel deployment exhibits unexpected runtime errors:

1. Open Vercel Dashboard -> **Deployments**.
2. Locate the previous stable production deployment.
3. Click **Instant Rollback**.
4. Verify traffic immediately routes to Deployment $N-1$.

### Database Migration Safety & Forward-Fix Strategy

> [!IMPORTANT]
> Rolling back application code does NOT roll back database migrations. Schema changes must always be **forward-compatible**:
>
> - **Phase A:** Add new nullable columns / non-breaking models.
> - **Phase B:** Deploy new application code consuming the schema.
> - **Phase C:** Backfill legacy data asynchronously.
> - **Phase D:** Add NOT NULL constraints / drop obsolete columns in a subsequent release.

### Database Recovery Procedure

In the event of database corruption or regional outage:

1. Inspect Neon Status page and Vercel runtime logs.
2. If point-in-time recovery is required, open Neon Console -> **Backups**.
3. Select point-in-time state prior to incident and restore to a recovery branch.
4. Update `DATABASE_URL` and `DIRECT_URL` environment variables in Vercel to point to the restored branch.
5. Execute `pnpm db:status` to verify schema integrity.
6. Verify `/api/health` returns `status: "ok"`.
