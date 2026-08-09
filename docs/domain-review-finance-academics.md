# Domain Review — Finance & Academics

**Product:** CoachingOS  
**Version:** 1.0  
**Status:** Frozen  
**Prepared By:** Product & Engineering

> This document captures the Schema Freeze Review for the Finance and Academics domains.  
> Both domains are now frozen. Changes require a formal ADR.

---

## Table of Contents

1. [Finance Domain Review](#1-finance-domain-review)
2. [Finance — Final Model](#2-finance--final-model)
3. [Finance — Freeze Scorecard](#3-finance--freeze-scorecard)
4. [Academics Domain Review](#4-academics-domain-review)
5. [Academics — Final Model](#5-academics--final-model)
6. [Academics — Freeze Scorecard](#6-academics--freeze-scorecard)
7. [Domain Confidence Scores](#7-domain-confidence-scores)

---

## 1. Finance Domain Review

### The Core Insight

Most coaching software models fees like this:

```
Student → Fees
```

This is wrong.

Fees are never owned by the student. They are owned by the **agreement between the student and the coaching** — the **Enrollment**.

### Real Scenarios That Drive the Model

| Scenario | What it proves |
|----------|---------------|
| Rahul joins Physics at ₹2,000/month | Fee belongs to the enrollment, not to Rahul |
| Rahul joins Physics + Maths | Each enrollment has its own fee — ₹2,000 and ₹1,500 separately |
| Rahul joins on June 20 | Billing starts from join date — enrollment owns the start date |
| Crash course at ₹8,000 one-time | Still one enrollment, different billing type |
| NEET batch ₹60,000 in 3 installments | One enrollment, one billing plan, multiple invoices |

**Conclusion:** `Enrollment` owns billing. `Student` owns nothing financial.

---

### Q1 — Fee Plan vs Billing Plan

The existing name `fee_plan` was renamed to `billing_plan`.

**Reason:** "Fee Plan" describes an amount. "Billing Plan" describes *how invoices are generated* — the schedule, the rules, the agreement. The name change makes the responsibility explicit.

| Old Name    | New Name       | Reason                                       |
|-------------|----------------|----------------------------------------------|
| `fee_plan`  | `billing_plan` | Clarifies that this stores generation rules, not just amounts |
| `fee_plans` | `billing_plans`| Table renamed accordingly                    |

**Billing Plan is the contract. It never changes because of payments.**

---

### Q2 — Billing Plan Types

| Type           | Example                                | Invoice Generation                |
|----------------|----------------------------------------|-----------------------------------|
| `monthly`      | ₹2,000/month starting June             | One invoice per month             |
| `one_time`     | ₹15,000 crash course                   | Single invoice on creation        |
| `installment`  | ₹60,000 in 3 parts                     | N invoices based on schedule      |

Same architecture. Different schedule. The billing plan drives all three.

---

### Q3 — Where Do Discounts Live?

| Option              | Problem                                        |
|---------------------|------------------------------------------------|
| On Invoice          | Must repeat every month — no good              |
| On Student          | Student may have different discounts per batch |
| **On Billing Plan** | ✅ Inherited by all invoices from this plan    |

**Decision: Discounts belong to the Billing Plan.**

Example:
```
Billing Plan
  Amount:   ₹2,000
  Discount: 20% scholarship
  → All invoices generated: ₹1,600
```

---

### Q4 — Late Join Handling

Rather than hardcoding proration logic, the Billing Plan stores:

| Field                         | Purpose                                         |
|-------------------------------|-------------------------------------------------|
| `billing_start_date`          | When billing begins — may differ from join date |
| `first_invoice_amount_override` | Optional manual override for first invoice    |

This handles every real-world case (full month, half month, free till next month) without complicated proration logic.

---

### Q5 — Partial Payments

```
Invoice: ₹2,000
    ↓
Payment 1: ₹1,200 → Status: partial
    ↓
Payment 2: ₹800   → Status: paid
```

One Invoice → Many Payments. Already modeled correctly.

**Outstanding amount is computed, never stored:**
```
Outstanding = Invoice.amount - SUM(payments.amount)
```

Only optimize with a stored column if performance becomes an issue.

---

### Q6 — Receipts

| Question                        | Decision                                      |
|---------------------------------|-----------------------------------------------|
| Should Invoice generate receipt? | No                                           |
| Should Payment generate receipt? | **Yes** — receipt proves money received      |
| One receipt per payment?         | Yes — even if invoice has multiple payments  |

```
Payment → Receipt (1:1)
```

Receipt contains: Receipt Number, Payment details, Institute Branding, Generated At.

---

### Q7 — What is Explicitly Out of Scope

| Feature            | Decision  | Notes                                                     |
|--------------------|-----------|-----------------------------------------------------------|
| Refunds            | ⏳ Future | Credit/adjustment model can be added later                |
| Late fees          | ⏳ Future | `late_fee_policy` field reserved on BillingPlan for V2   |
| Fee waiver         | ⏳ Future | Represented as adjustment, not invoice edit               |
| Online payment gateway | ⏳ V2 | Add `gateway_reference` to payments — no schema change   |
| Accounting/GST     | ❌ Never (MVP) | Separate future module                               |

---

### Q8 — Module Rename: Finance → Billing

| Old Name  | New Name  | Reason                                                          |
|-----------|-----------|-----------------------------------------------------------------|
| `Finance` | `Billing` | MVP does not do accounting, ledgers, GST, or P&L. It does fee agreements, invoices, payments, and receipts. The name `billing` reflects the actual responsibility and leaves room for a future `accounting` module. |

> The UI may still say "Fees" — users don't see module names. Internally the module is `billing`.

---

## 2. Finance — Final Model

```
Enrollment
      │
      ▼
BillingPlan
  (amount, type, discount, start_date)
      │
      ├──────────────┬──────────────┐
      ▼              ▼              ▼
 Invoice 1      Invoice 2      Invoice 3
      │              │
      ▼              ▼
 Payments       Payments
      │
      ▼
  Receipt
```

### Entity Responsibilities

#### BillingPlan

| Owns                    |
|-------------------------|
| Amount                  |
| Billing type            |
| Discount type + value   |
| Billing start date      |
| First invoice override  |

#### Invoice

| Owns        |
|-------------|
| Due date    |
| Amount      |
| Status      |

#### Payment

| Owns                     |
|--------------------------|
| Amount                   |
| Payment mode             |
| Received by (user)       |
| Received on (date)       |
| Reference (optional)     |
| Notes                    |

#### Receipt

| Owns                  |
|-----------------------|
| Receipt number        |
| Payment reference     |
| Institute branding    |
| Generated at          |

---

## 3. Finance — Freeze Scorecard

| Decision                              | Status         |
|---------------------------------------|----------------|
| Enrollment owns billing               | ✅ Frozen       |
| `fee_plan` renamed to `billing_plan`  | ✅ Frozen       |
| BillingPlan generates invoices        | ✅ Frozen       |
| Discounts on BillingPlan              | ✅ Frozen       |
| Invoice generated from BillingPlan    | ✅ Frozen       |
| Payment belongs to Invoice            | ✅ Frozen       |
| Receipt belongs to Payment (1:1)      | ✅ Frozen       |
| Partial payments supported            | ✅ Frozen       |
| Outstanding amount computed, not stored | ✅ Frozen     |
| Late join via billing_start_date      | ✅ Frozen       |
| Manual payment recording only (MVP)   | ✅ Frozen       |
| Finance module renamed to Billing     | ✅ Frozen       |
| Online payment gateway                | ⏳ V2           |
| Refunds / Credits                     | ⏳ V2           |

---

## 4. Academics Domain Review

### The Core Insight

Most coaching software models academics around screens, not workflows.

A teacher doesn't think "open the attendance table." They think:

> **"I have Physics Batch at 7 AM."**

Everything revolves around **Batch** — not Student, not Subject, not Teacher.

---

### Q1 — Should Homework belong to Student?

Many systems model `Homework → Student`. This is wrong.

A teacher assigns homework to the **Batch**. Every enrolled student reads it.

```
Batch → Homework
```

Students only view homework. They never own it individually.

**Decision: Homework belongs to Batch. Frozen.**

---

### Q2 — Should Attendance reference Enrollment or Student directly?

Attendance references **Enrollment**, not Student directly.

**Why?**

Enrollment records join date, status, and batch membership. If Rahul leaves and rejoins:
- Two separate enrollments
- Attendance history is preserved per enrollment period
- No historical data is mixed

```
Enrollment → Attendance
```

**Decision: Attendance references Enrollment. Frozen.**

---

### Q3 — Should Test belong to Subject or Batch?

```
Physics Morning Batch → Weekly Test 1
Physics Evening Batch → Weekly Test 1 (different)
```

Two batches of the same subject can have different tests on different dates. Tests belong to **Batch**.

**Decision: Test belongs to Batch. Frozen.**

---

### Q4 — Should Marks belong to Student?

Marks belong to a **Test** for a specific **Enrollment**.

```
Test → Marks (per enrollment)
```

This preserves marks history even if a student has multiple enrollments over time.

**Decision: Marks belong to Test + Enrollment. Frozen.**

---

### Q5 — Should Timetable belong to Teacher?

A teacher may teach multiple batches with different schedules. Timetable belongs to **Batch**.

**Decision: Timetable belongs to Batch. Frozen.**  
*(See also Q10 — Timetable is superseded by Schedule.)*

---

### Q6 — Multi-teacher Batches

| Option               | Notes                                             |
|----------------------|---------------------------------------------------|
| `batch.teacher_id`   | Simple — covers 90% of ICP (founder + one teacher) |
| `BatchTeacher` join  | Correct for NEET batches with Physics/Chemistry/Biology teachers |

**Decision for MVP:** Keep `teacher_id` on Batch. Migration to `BatchTeacher` join table in V1 is straightforward. Don't optimize for multi-teacher in MVP.

---

### Q7 — Homework Submissions

Students in offline coaching submit homework physically — not digitally.

**Decision: Remove homework submissions entirely. Not an LMS.**

---

### Q8 — Study Material

PDFs, videos, notes — out of scope for MVP.

**Decision: Future module. No schema today.**

---

### Q9 — Should we introduce BatchSession?

**This is the most significant Academics decision.**

**Option A — Attendance references Date:**
```
Attendance
  enrollment_id
  date
  status
```
Simple but limited.

**Option B — Attendance references Session:**
```
BatchSession
  batch_id
  date
  status (scheduled / completed / cancelled)
  
Attendance
  session_id
  enrollment_id
  status
```

**Why Session wins:**

| Scenario              | Without Session            | With Session                     |
|-----------------------|----------------------------|----------------------------------|
| Cancelled class       | Special attendance logic   | `session.status = cancelled`     |
| Extra class           | Hard to distinguish        | Create new session               |
| Holiday               | No clean representation    | `session.status = cancelled`     |
| Attendance reopen     | Requires date logic        | Reopen by session                |
| Future QR attendance  | Attach to date             | Attach to session                |
| Future RFID           | Attach to date             | Attach to session                |
| Analytics             | Query by date range        | Query by session with rich metadata |
| Substitute teacher    | No field                   | `session.substitute_teacher_id`  |

**Decision: Introduce `batch_sessions` table. Attendance references Session. Frozen.**

---

### Q10 — Schedule vs Timetable

**This is the second most significant Academics decision.**

"Timetable" implies a static weekly grid. Real coaching institutes have:
- Regular weekly classes
- Holiday cancellations
- Extra revision sessions
- Sunday crash classes

The correct model (same pattern as Google Calendar recurring events):

| Entity       | Represents                                        | Example                            |
|--------------|---------------------------------------------------|------------------------------------|
| `Schedule`   | Recurring rule — what *should* happen every week  | Mon/Wed/Fri 7–8 AM Physics         |
| `Session`    | Generated instance — what *actually* happened     | Monday Aug 10, 7–8 AM, completed   |

```
Batch
  │
  ├── Schedule (recurring rule)
  │       Mon/Wed/Fri, 7:00–8:00 AM
  │
  └── BatchSession (generated occurrence)
          Aug 10 (Mon), 7:00–8:00 AM, completed
          Aug 12 (Wed), 7:00–8:00 AM, cancelled (holiday)
          Aug 14 (Fri), 7:00–8:00 AM, completed
```

**Why this separation matters:**

- **Plan vs Reality** — Schedule is what was planned. Session is what happened.
- **Reports** — "How many classes were actually conducted?" requires Sessions.
- **Analytics** — Attendance % needs session count, not just dates.
- **Future features** — Rescheduling, substitute teachers, session notes all attach to Session naturally.

**Decision: Rename `timetable` to `schedules`. Introduce `batch_sessions`. Frozen.**

---

## 5. Academics — Final Model

```
Subject
  │
  └── Batch
        │
        ├── Schedule (recurring rule)
        │       └── BatchSession (generated occurrence)
        │                 │
        │                 └── Attendance (per enrollment)
        │
        ├── Homework
        │
        ├── Test
        │     └── Marks (per enrollment)
        │
        ├── Announcement
        │
        └── Enrollment
```

### Entity Responsibilities

#### Schedule

| Owns              |
|-------------------|
| Days of week      |
| Start time        |
| End time          |
| Assigned teacher  |

*(Replaces `timetable`)*

#### BatchSession

| Owns                      |
|---------------------------|
| Batch reference           |
| Date                      |
| Start time                |
| End time                  |
| Status (scheduled / completed / cancelled) |
| Attendance taken flag     |
| Source (manual / rfid)    |

#### Attendance

| Owns              |
|-------------------|
| Session reference |
| Enrollment reference |
| Status (present / absent / late) |

---

## 6. Academics — Freeze Scorecard

| Decision                                    | Status           |
|---------------------------------------------|------------------|
| Batch is center of academics                | ✅ Frozen         |
| Homework belongs to Batch                   | ✅ Frozen         |
| Attendance references Enrollment            | ✅ Frozen         |
| Attendance references Session (not date)    | ✅ Frozen         |
| `batch_sessions` table introduced           | ✅ Frozen         |
| Tests belong to Batch                       | ✅ Frozen         |
| Marks belong to Test + Enrollment           | ✅ Frozen         |
| `timetable` renamed to `schedules`          | ✅ Frozen         |
| Schedule = recurring rule                   | ✅ Frozen         |
| Session = generated occurrence              | ✅ Frozen         |
| Announcements belong to Batch or Institute  | ✅ Frozen         |
| Multi-teacher batches                       | ⏳ V1 (`BatchTeacher` join table) |
| Homework submissions                        | ❌ Removed        |
| Study Material                              | ⏳ Future module  |

---

## 7. Domain Confidence Scores

| Domain                    | Score  | Notes                                                        |
|---------------------------|--------|--------------------------------------------------------------|
| Identity                  | 9.8/10 | `ParentIdentity` refinement solved the biggest long-term concern |
| Academics                 | 9.7/10 | `Schedule + Session` model is the biggest architectural improvement after `ParentIdentity` |
| Billing (formerly Finance) | 9.7/10 | `BillingPlan` model is flexible enough for 10-year operation |
| Communication             | Pending review |                                                      |
| Permissions               | 9.5/10 | Atomic strings — extensible without migration                |

---

*Domain Review — Finance & Academics: Frozen*  
*Next: Communication & Notifications Domain Review*
