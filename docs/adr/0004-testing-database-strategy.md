# ADR-0004: Testing Database & Isolation Strategy

## Context & Problem Statement

CoachingOS requires a production-quality, deterministic testing foundation. Critical business invariants (multi-tenant row-level data isolation, Better Auth session resolution, database foreign key constraints, Prisma error normalization) cannot be reliably verified using SQLite or in-memory mocks without masking PostgreSQL-specific runtime behavior.

## Decision Drivers

- **Behavioral Authenticity:** Integration tests must execute against real PostgreSQL to validate schema constraints, cascading deletes, and unique key indexes.
- **Zero SQLite Mocking:** SQLite must NOT be used as a substitute for PostgreSQL.
- **Data Safety:** Prevent accidental execution of destructive test resets against development or production databases.
- **Test Isolation:** Ensure tests remain isolated and deterministic without re-running full schema migrations between every test file.

## Decision Outcome

1. **Dedicated PostgreSQL Test Database:**
   - Integration tests execute strictly against `TEST_DATABASE_URL` (e.g. `postgresql://.../coachingos_test?schema=public`).
2. **Fail-Closed Safety Guard (`validateTestEnvironment`):**
   - Execution aborts immediately with an explicit actionable error if `TEST_DATABASE_URL` is missing, matches `DATABASE_URL`, or lacks `test` in the database name.
3. **Database Isolation Strategy (Table Truncation):**
   - Between test runs, `cleanTestDatabase()` issues a synchronized `TRUNCATE TABLE ... CASCADE` via `db.$executeRawUnsafe` across all 30 database tables.
   - Vitest runs database integration test files sequentially (`fileParallelism: false`) to avoid cross-file truncation interference.
4. **Canonical Prisma Schema:**
   - Tests execute against the single source-of-truth `prisma/schema.prisma`. No secondary test schemas or test migrations are created.

## Status

**APPROVED**
