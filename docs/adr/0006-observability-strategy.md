# ADR-0006: Production Observability Strategy

## Context & Problem Statement

CoachingOS requires a production-ready, low-complexity observability architecture providing structured logging, request correlation, error tracking, privacy protection, latency measurement, and health monitoring without introducing unnecessary infrastructure overhead or vendor lock-in.

## Decision Drivers

- **Low Operational Complexity:** Early-stage SaaS architecture must optimize for simplicity, reliability, and zero infrastructure maintenance overhead.
- **Vendor Independence:** Application packages must depend on a clean `ErrorReporter` abstraction rather than coupling source code directly to vendor SDKs.
- **Privacy-Safe Data Protection:** Sensitive PII (parent phone numbers, student details, passwords, session tokens, database connection strings) must be strictly sanitized before log output or telemetry transmission.
- **Deferred Distributed Telemetry:** Complex distributed tracing, metrics databases, and heavy telemetry stacks (Prometheus, Grafana, OpenTelemetry, Loki, Jaeger) are explicitly deferred until actual multi-cluster scale justifies their operational cost.

## Vendor Research (Date Checked: August 9, 2026)

1. **Sentry (Free Developer Tier)**
   - **Source URL:** https://sentry.io/pricing/ (Checked: August 9, 2026)
   - **Limits:** 5,000 errors/month, 10,000 performance units, 50 session replays/month, 1 user limit, 30-day data retention.
2. **Better Stack (Free Tier)**
   - **Source URL:** https://betterstack.com/pricing (Checked: August 9, 2026)
   - **Limits:** 100,000 exceptions/month, 3 GB logs (3-day retention), 3 GB traces, Sentry SDK compatible.
3. **Pino Structured Logging (Baseline)**
   - Zero vendor cost, zero network overhead, platform log streaming (Vercel/Cloudflare).

## Decision Outcome

1. **Structured Application Logging (Pino):**
   - High-performance Pino `9.6.0` remains the core logging engine across all packages (`@coaching-os/observability`).
   - Automated redaction for 24 sensitive field paths (`password`, `token`, `authorization`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `otp`).
2. **Vendor-Agnostic ErrorReporter Abstraction:**
   - Application code consumes the `ErrorReporter` interface (`captureException`, `captureMessage`, `setUser`, `setContext`).
   - Default implementation `PinoErrorReporter` logs unexpected exceptions structured via Pino while filtering out expected 4xx domain conditions (`ValidationError`, `NotFoundError`, `ConflictError`).
   - Silenced/isolated in `NODE_ENV === 'test'` to ensure zero test noise and zero external network calls.
3. **Request Correlation & Monotonic Timing:**
   - Server-generated UUID v4 canonical request ID propagated in `x-request-id` response headers.
   - Monotonic duration measurement via `performance.now()`.
   - Configurable slow request thresholds: `< 500ms` (info), `500ms - 2000ms` (warn), `> 2000ms` (critical slow).
4. **Structured Event Naming:**
   - Enforces `domain.action.result` naming (e.g. `auth.sign_in.success`, `security.authorization.denied`, `http.request.completed`).
5. **Application & Database Readiness Health Endpoint:**
   - `GET /api/health` returns HTTP 200 `{ status: 'ok', checks: { database: 'ok' } }` on database ping success, or HTTP 503 on PostgreSQL failure without leaking internal stack traces or connection strings.
6. **Deferred Telemetry Stacks:**
   - Prometheus, Grafana, OpenTelemetry, Loki, Jaeger, and background queues (Trigger.dev, Inngest, BullMQ) are explicitly deferred per ADR-0003 and ADR-0006.

## Status

**APPROVED**
