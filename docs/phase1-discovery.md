# Product Discovery — Phase 1 (Frozen)

**Product:** CoachingOS  
**Status:** FROZEN — Do not modify  
**Purpose:** Single source of truth for all product decisions

> Every future decision — database, API, UI, pricing, tech stack — must trace back to this document.  
> This document does not change. New decisions become new documents.

---

## Table of Contents

1. [Vision](#1-vision)
2. [Ideal Customer Profile (ICP)](#2-ideal-customer-profile-icp)
3. [Product Philosophy](#3-product-philosophy)
4. [User Personas](#4-user-personas)
5. [Core Business Capabilities](#5-core-business-capabilities)
6. [Core Business Entities](#6-core-business-entities)
7. [Attendance](#7-attendance)
8. [Finance](#8-finance)
9. [Timetable](#9-timetable)
10. [Tests](#10-tests)
11. [Parent Experience](#11-parent-experience)
12. [Notifications](#12-notifications)
13. [Branding](#13-branding)
14. [MVP Features](#14-mvp-features)
15. [V1 Features](#15-v1-features)
16. [V2 Features](#16-v2-features)
17. [Product Boundaries](#17-product-boundaries)
18. [Core Product Loops](#18-core-product-loops)
19. [North Star Goal](#19-north-star-goal)
20. [Strategic Decisions](#20-strategic-decisions)

---

## 1. Vision

### We are NOT building

| Not This        |
| --------------- |
| School ERP      |
| College ERP     |
| LMS             |
| Payment Gateway |
| Generic ERP     |

### We ARE building

> **The Operating System for Founder-led Coaching Institutes**

A platform that helps coaching institutes run professionally, while giving parents full transparency into their child's learning.

---

## 2. Ideal Customer Profile (ICP)

### Primary Target

**Founder-led coaching institutes**

| Attribute     | Value                                             |
| ------------- | ------------------------------------------------- |
| Student range | 50–500 students                                   |
| Founder role  | Usually still teaches or manages daily operations |

**Supported institute types:**

| Type                              |
| --------------------------------- |
| Solo tutor (growing)              |
| Founder + Assistant               |
| Founder + Teachers                |
| Small / Medium coaching institute |

### Not Targeting (Initially)

| Excluded                           |
| ---------------------------------- |
| Schools                            |
| Colleges                           |
| Enterprise coaching chains         |
| Home tutors with very few students |

---

## 3. Product Philosophy

These principles are immutable. Every product and engineering decision must respect them.

| #   | Principle                                                                                           |
| --- | --------------------------------------------------------------------------------------------------- |
| 1   | Software must save time.                                                                            |
| 2   | Teachers teach. Software must never interrupt teaching.                                             |
| 3   | Parents seek reassurance — not reports.                                                             |
| 4   | Everything revolves around **Batch**, not Student.                                                  |
| 5   | **Enrollment** is more important than Student. Student is a person. Enrollment is the relationship. |
| 6   | Configuration over customization.                                                                   |
| 7   | One action updates everyone. Attendance → Parent → Reports → Analytics.                             |
| 8   | Build around workflows, not job titles.                                                             |
| 9   | Every notification must justify its cost.                                                           |

---

## 4. User Personas

### Buyer

**Founder / Coaching Owner** — the person who pays for the product.

### Daily Users

| Persona   | Role                                         |
| --------- | -------------------------------------------- |
| Founder   | Manages everything — operations and teaching |
| Assistant | Handles admissions, fees, daily tasks        |
| Teacher   | Attendance, homework, marks                  |
| Parent    | Read-only — visibility into child's progress |
| Student   | Read-only — homework, marks, announcements   |

### Authorization Model Decision

We do **not** model: Owner, Teacher, Admin as fixed roles.

We model: **Users + Permissions** — roles are permission templates, not identities.

---

## 5. Core Business Capabilities

| Capability     | Scope                                                               |
| -------------- | ------------------------------------------------------------------- |
| Identity       | Institute, Students, Parents, Staff, Enrollment                     |
| Academics      | Subjects, Batches, Attendance, Homework, Tests, Marks, Timetable    |
| Finance        | Fee Plans, Invoices, Payment Records, Receipts (no payment gateway) |
| Communication  | Announcements, Notifications, Parent Portal                         |
| Administration | Branding, Reports, Settings, Permissions                            |

---

## 6. Core Business Entities

### Institute

Everything belongs to exactly one institute.

---

### Program _(Optional)_

Optional grouping mechanism.

**Examples:** 11th Science, 12th Commerce, Foundation

---

### Subject

**Examples:** Maths, Physics, Chemistry, English

---

### Batch ⭐

**The heart of the system.**

A batch represents:

- One subject
- One timing
- One group of students

A batch owns:

| Owned By Batch |
| -------------- |
| Attendance     |
| Homework       |
| Tests          |
| Timetable      |
| Announcements  |

---

### Student

The person. Contains identity only — no fee or attendance data.

---

### Parent

> **Updated per ADR-001.** Parent is modelled across two layers.

**Platform Layer (global):**

| Entity           | Purpose                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| `ParentIdentity` | One record per phone number — spans all coaching institutes                |
| `ChildProfile`   | Parent-created labels e.g. "Rahul", "Priya" — personal, not institute data |
| `StudentLink`    | Maps a ChildProfile → a specific institute's student record                |

**Institute Layer (tenant):**

| Field           |
| --------------- |
| Primary Phone   |
| Secondary Phone |

One `InstituteParent` → Many students within that institute.

The parent logs in once and sees all their coaching institutes. They organize their children into ChildProfiles themselves — the platform never auto-merges identities across institutes. See ADR-001.

---

### Enrollment ⭐

**The most important operational entity.**

Represents: Student joined Batch.

Contains:

| Field     |
| --------- |
| Join Date |
| Status    |
| Discount  |
| Fee Plan  |

---

### Staff / User

Users + Permissions. Not hardcoded roles.

---

### Attendance

| Source | Status |
| ------ | ------ |
| Manual | MVP    |
| RFID   | MVP    |
| QR     | Future |

Attendance is event-based. Source does not change the event model.

---

### Homework

Assigned to an entire batch. Never individual in MVP.

---

### Test

Generic — the platform does not differentiate test types.

**Examples:** Weekly, Monthly, Mock, Unit, Full Syllabus

Each test has: Name, Batch, Date, Maximum Marks

---

### Marks

Score per student per test.

---

### Timetable

Simple recurring schedule.

| Field      |
| ---------- |
| Days       |
| Start Time |
| End Time   |
| Teacher    |

No rooms. No extra classes. No scheduling engine.

---

### Announcement

Targets: Institute-wide **or** specific Batch.

---

### Fee Plan

| Type         |
| ------------ |
| Monthly      |
| Yearly       |
| Installments |

---

### Invoice

Generated from a Fee Plan.

---

### Payment Record

Manual business record only. No payment gateway.

---

### Branding

Per-institute: Logo, Theme Color, Name, Contact, Receipt Branding.

---

### Settings

Per-institute operational configuration.

---

## 7. Attendance

| Source           | Status |
| ---------------- | ------ |
| Manual           | MVP    |
| RFID             | MVP    |
| QR Code          | Future |
| Face Recognition | Future |

Attendance is **event-based**. The source does not matter to downstream consumers — the event is the same regardless.

---

## 8. Finance

### Core Decision

We are **NOT** building payments.  
We are building **Fee Management**.

| Feature              | Supported |
| -------------------- | --------- |
| Monthly fees         | Yes       |
| One-time fees        | Yes       |
| Installments         | Yes       |
| Discounts            | Yes       |
| Partial payments     | Yes       |
| Receipts             | Yes       |
| Pending fee tracking | Yes       |

### Payment Modes (Manual Recording Only)

| Mode          |
| ------------- |
| Cash          |
| UPI           |
| Bank Transfer |

---

## 9. Timetable

Intentionally simple.

```
Batch → Days → Start Time → End Time → Teacher
```

| Excluded             |
| -------------------- |
| Room scheduling      |
| Extra classes        |
| Scheduling engine    |
| Calendar integration |

---

## 10. Tests

Generic model — the platform treats all assessments uniformly.

| Field         |
| ------------- |
| Name          |
| Batch         |
| Date          |
| Maximum Marks |

**Examples:** Weekly Test, Unit Test, Monthly Test, Mock Test, Full Syllabus Test

The software does not differentiate between test types.

---

## 11. Parent Experience

One of the biggest product differentiators.

| Feature                      |
| ---------------------------- |
| OTP login (no password)      |
| Multiple children supported  |
| Multiple coaching institutes |
| Attendance visibility        |
| Homework visibility          |
| Marks visibility             |
| Fee status and history       |
| Receipt download             |
| Announcements                |

> Parents should find the answer within seconds — without calling the institute.

---

## 12. Notifications

Priority-based delivery model.

| Priority      | Events                                                             | Channels           |
| ------------- | ------------------------------------------------------------------ | ------------------ |
| Critical      | Absent, Fee Due, Fee Received, Test Result, Emergency Announcement | App + WhatsApp/SMS |
| Important     | Homework, Timetable Changes                                        | App (primarily)    |
| Informational | General updates                                                    | In-App only        |

**Rules:**

- Institute decides notification preferences.
- Communication cost must remain under control.
- WhatsApp / SMS will likely be usage-based in the future.

---

## 13. Branding

Every institute feels like they own the software — not us.

| Branding Element |
| ---------------- |
| Logo             |
| Primary Color    |
| Institute Name   |
| Contact Info     |
| Receipt Branding |

---

## 14. MVP Features

### Identity

- [x] Institute
- [x] Students
- [x] Parents
- [x] Staff
- [x] Subjects
- [x] Batches
- [x] Enrollment

### Academics

- [x] Attendance
- [x] Homework
- [x] Tests
- [x] Marks
- [x] Timetable

### Finance

- [x] Fee Plans
- [x] Invoice Tracking
- [x] Payment Recording
- [x] Receipts
- [x] Pending Fees

### Communication

- [x] Announcements
- [x] Notifications

### Parent Portal

- [x] Attendance
- [x] Homework
- [x] Marks
- [x] Fees
- [x] Receipts

### Administration

- [x] Branding
- [x] Reports
- [x] Settings

---

## 15. V1 Features

| Feature                           |
| --------------------------------- |
| Admissions Workflow               |
| Study Material                    |
| Better Analytics                  |
| Batch Transfer                    |
| WhatsApp Integration Improvements |
| Attendance Percentage             |
| Export PDF / Excel                |
| Advanced Permission Templates     |

---

## 16. V2 Features

| Feature          |
| ---------------- |
| Payment Gateway  |
| QR Attendance    |
| Face Recognition |
| AI Reports       |
| CRM              |
| Website Builder  |
| Marketing Tools  |
| Multi Branch     |
| Accounting       |
| Payroll          |
| Custom Domain    |

---

## 17. Product Boundaries

Explicitly out of scope — forever unless a deliberate strategic decision changes this.

| Excluded        |
| --------------- |
| LMS             |
| Online Classes  |
| Video Streaming |
| Library         |
| Hostel          |
| Payroll         |
| Inventory       |
| Transport       |
| Accounting      |
| School ERP      |
| College ERP     |

---

## 18. Core Product Loops

### Attendance Loop

```
Student Arrives
      ↓
Attendance Recorded
      ↓
Parent Updated
      ↓
Reports Updated
```

### Academic Loop

```
Homework Assigned
      ↓
Student Views
      ↓
Test Conducted
      ↓
Marks Entered
      ↓
Parent Notified
```

### Finance Loop

```
Invoice Generated
      ↓
Reminder Sent
      ↓
Payment Recorded
      ↓
Receipt Generated
```

---

## 19. North Star Goal

> **A coaching institute should be able to complete all daily operational work quickly, while parents get complete transparency without calling the institute.**

---

## 20. Strategic Decisions

These decisions are frozen for Phase 1. Each one was made deliberately.

| Decision                   | Detail                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Coaching only              | No other industries — focus until product-market fit                                                                                                                           |
| Single external product    | Not an internal platform                                                                                                                                                       |
| PWA-first                  | No Play Store dependency — instant access via browser                                                                                                                          |
| Parent-first experience    | Parents are a key differentiator vs competitors                                                                                                                                |
| Batch-centric architecture | Everything operational is batch-scoped                                                                                                                                         |
| Enrollment-centric model   | Enrollment is the operational entity, not Student                                                                                                                              |
| Workflow-first design      | Design workflows before designing screens                                                                                                                                      |
| Event-driven thinking      | Attendance, Marks, Fees are domain events with downstream consumers                                                                                                            |
| Responsive web             | One product — desktop and mobile, task-optimized                                                                                                                               |
| Users + Permissions        | No hardcoded roles — permission templates instead                                                                                                                              |
| Two-layer parent identity  | Global `ParentIdentity` + personal `ChildProfile` + tenant `InstituteParent`. Parent organizes their own children — platform never auto-merges across institutes. See ADR-001. |

---

## Product Discovery Completion

| Area                        | Status      |
| --------------------------- | ----------- |
| Vision                      | ✅ Complete |
| Market                      | ✅ Complete |
| ICP                         | ✅ Complete |
| Product Philosophy          | ✅ Complete |
| User Personas               | ✅ Complete |
| Business Workflows          | ✅ Complete |
| Business Entities           | ✅ Complete |
| Core Features               | ✅ Complete |
| Product Roadmap (MVP/V1/V2) | ✅ Complete |
| Product Boundaries          | ✅ Complete |

**Product Discovery: 100% complete.**

---

## Phase 2 — Architecture ✅ Complete

Engineering design is complete. All documents are frozen.

| Phase 2 Deliverable           | Document                                | Status  |
| ----------------------------- | --------------------------------------- | ------- |
| Business Rules                | SRS                                     | ✅ Done |
| Entity Relationship Diagram   | DADD                                    | ✅ Done |
| Permission Matrix             | SDD                                     | ✅ Done |
| Database Schema (logical)     | DADD                                    | ✅ Done |
| Event Architecture            | SDD                                     | ✅ Done |
| REST API Contract             | DADD                                    | ✅ Done |
| Tech Stack & Folder Structure | SDD                                     | ✅ Done |
| Parent Identity Architecture  | adr-001-parent-identity.md              | ✅ Done |
| Engineering Constitution      | SDD Ch.2 §28 + phase3-execution-plan.md | ✅ Done |
| Schema Freeze Review          | phase3-execution-plan.md                | ✅ Done |

---

## Phase 3 — Implementation Design 🔄 In Progress

Product Discovery and Architecture are frozen. Implementation design begins.

| Milestone | Deliverable                           | Status  | Document |
| --------- | ------------------------------------- | ------- | -------- |
| Phase 3.1 | Master ERD — all entities, all fields | 🔄 Next | TBD      |
| Phase 3.2 | PostgreSQL Schema                     | Pending | TBD      |
| Phase 3.3 | Prisma Models                         | Pending | TBD      |
| Phase 3.4 | Folder Structure                      | Pending | TBD      |
| Phase 3.5 | Auth Architecture (final decisions)   | Pending | TBD      |
| Phase 3.6 | Module Specifications (all 5)         | Pending | TBD      |
| Phase 3.7 | REST API Implementation               | Pending | TBD      |
| Phase 3.8 | Frontend                              | Pending | TBD      |

> Full Phase 3 execution plan and implementation order in `phase3-execution-plan.md`.

> From this point forward, every technical decision must trace back to the SRS, SDD, or DADD — not introduce new product ideas. That is how we keep the product focused and avoid feature creep.

---

_Phase 1 — Frozen. Version 1.0._
