# ADR-0002: Physical Database Schema Reconciliation

**Status:** Approved  
**Date:** 2026-08-09  
**Authors:** CoachingOS Architecture & Implementation Engineering  

---

## Context & Problem Statement

During the transition from high-level system design documents (SDD/DADD) to the physical Prisma 7 database schema in Phase 0.4, minor naming discrepancies were identified between legacy DADD sections and updated domain-review definitions. 

To prevent legacy artifacts from being introduced into physical database constraints, explicit schema reconciliation rules were adopted.

---

## Decision Outcomes

### 1. Attendance Model & Session Coupling
- **Decision:** `Attendance` models reference `BatchSession` via `session_id` and `enrollment_id`.
- **Constraint:** Unique constraint on `(session_id, enrollment_id)`.
- **Rationale:** Attendance records physical class occurrences, not raw calendar dates. The schema MUST NOT contain an `attendance_date` column.

### 2. Billing Domain Entity & Invoice Foreign Key
- **Decision:** `BillingPlan` (`billing_plans` table) is canonical. Invoices reference `billing_plan_id`.
- **Rationale:** Deprecates legacy references to `fee_plans` and `fee_plan_id` found in earlier draft notes.

### 3. Batch Uniqueness Scope
- **Decision:** Batches are unique within an institute and subject: `UNIQUE(institute_id, subject_id, name)`.
- **Rationale:** Coaching institutes routinely run "Morning Batch" across multiple subjects (e.g. Physics Morning Batch, Mathematics Morning Batch) within the same institute. Globally unique batch names per institute would break standard institute workflows.

### 4. Optional Academic Program Scope
- **Decision:** `Program` is optional; `program_id` on `Subject` is nullable (`Program?`).
- **Rationale:** Subjects can exist independently without requiring a formal parent program.

---

## Consequences

- The physical Prisma schema in `infrastructure/database/prisma/schema.prisma` reflects the updated domain-review model.
- Prevents database migrations from creating deprecated or conflicting columns.
