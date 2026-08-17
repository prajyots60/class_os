# Phase 6.5 — Global Search Implementation

**Status:** 🟢 COMPLETED & VERIFIED  
**Milestone:** Phase 6 — Staff Dashboard & UX Polish  
**Type:** Application & App Shell Header Feature  
**Prisma Schema Modifications:** ❌ 0  
**Database Migrations:** ❌ 0  

---

## 1. Executive Summary

Phase 6.5 delivers the authenticated staff application's global search experience integrated into the app shell header (`AppHeader`).

It provides operational search across three core categories (**Students**, **Batches**, **Invoices**), performing server-side PostgreSQL queries strictly scoped to the active tenant (`institute_id`) with a 300ms client debounce, minimum 2-character requirement, and a maximum limit of 10 results per category (30 total max).

Selecting search results navigates directly to target workspace URLs with appropriate pre-filtered context (`/students?search=...`, `/academics?batchId=...`, `/billing?invoiceId=...`).

---

## 2. Architecture & Data Flow

```text
Header Search UI (<GlobalSearchBar />)
    ↓ (300ms debounce, min 2 chars)
useGlobalSearch() React Query hook
    ↓
SearchApiClient.globalSearch(query)
    ↓
GET /api/v1/search?q=<query>  (Server-authoritative tenant scoping)
    ↓
GlobalSearchUseCase
    ↓
PrismaGlobalSearchRepository (Promise.all parallel PostgreSQL query execution)
    ↓
GlobalSearchDTO { query, students[], batches[], invoices[] }
    ↓
<GlobalSearchBar /> Grouped Result Panel (Keyboard & Touch Accessible)
```

---

## 3. Search Scope & Category Mapping

| Category | Searchable Fields | Max Results | Target Path Navigation |
|---|---|---|---|
| **Students** | `firstName`, `lastName`, `admissionNumber` | 10 | `/students?search=${encodeURIComponent(displayName)}` |
| **Batches** | `name`, `code` | 10 | `/academics?batchId=${batch.id}` |
| **Invoices** | `id` (UUID format), `student.firstName`, `student.lastName`, `student.admissionNumber` | 10 | `/billing?invoiceId=${invoice.id}` |

---

## 4. Security & Tenant Scoping Invariants

| ID | Invariant |
|---|---|
| P6.5-SEC-001 | Unauthenticated search request returns 401 UNAUTHENTICATED |
| P6.5-SEC-002 | Client query param `instituteId` cannot override server tenant context |
| P6.5-SEC-003 | Cross-institute students are NEVER returned |
| P6.5-SEC-004 | Cross-institute batches are NEVER returned |
| P6.5-SEC-005 | Cross-institute invoices are NEVER returned |
| P6.5-SEC-006 | Client query param `userId` cannot alter search context |
| P6.5-SEC-007 | Client query param `role` cannot elevate search access |
| P6.5-SEC-008 | Category result limits (<=10/category) enforced server-side |
| P6.5-SEC-009 | Raw Prisma / internal fields (secrets, passwords) excluded from DTO |
| P6.5-SEC-010 | HTTP methods POST, PUT, PATCH, DELETE return 405 Method Not Allowed |
| P6.5-SEC-011 | Queries < 2 characters return empty DTO without database query |
| P6.5-SEC-012 | Unauthenticated access throws AuthenticationError |
| P6.5-SEC-013 | Missing tenant context throws AuthorizationError |
| P6.5-SEC-014 | Malformed query input with special characters is safely sanitized |
| P6.5-SEC-015 | Search cannot be used for cross-tenant record enumeration |

---

## 5. UX & Accessibility Features

- **Combobox ARIA Semantics:** `role="combobox"`, `role="listbox"`, `role="option"`, `aria-expanded`, `aria-selected`.
- **Keyboard Navigation:** `ArrowDown` & `ArrowUp` to cycle through visible result items, `Enter` to navigate, `Escape` to close result panel.
- **Touch & Viewport:** 44×44 CSS px touch targets for interactive links/buttons; responsive at 320px+ viewports with text truncation (`truncate`).
- **Loading & Empty States:** Compact loading spinner during search; clear messages for short queries ("Type at least 2 characters") and zero results ("No results found").

---

## 6. Test Suite Matrix

### UI Tests (GLOBAL-SEARCH-001..030) — 30/30 ✅
Covers input rendering, accessible labels, min query length, debounce, 10-result category limits, workspace target URLs, category grouping, loading/error/empty states, keyboard nav, touch targets, and truncation.

### Security Tests (P6.5-SEC-001..015) — 15/15 ✅
Covers authentication, tenant isolation, client override resistance, server-side limits, DTO safety, method safety, min query length, and SQL injection safety.

---

## 7. Quality Gates Evaluation

```bash
pnpm env:check          # 🟢 PASSED
pnpm db:validate        # 🟢 PASSED
pnpm db:health          # 🟢 PASSED
pnpm typecheck          # 🟢 PASSED (13/13 workspace packages clean)
pnpm turbo lint --force # 🟢 PASSED (0 errors, 0 warnings)
pnpm test (Focused)     # 🟢 PASSED (45/45 tests passing)
pnpm build              # 🟢 PASSED (13/13 build tasks successful)
```

---

## 8. Database Impact

- **Schema changes:** 0
- **Migrations:** 0
- No new tables, views, functions, or indexes introduced.

---

## 9. Explicit Non-Goals

This phase does NOT implement:
- External search engines (Redis, Elasticsearch, Algolia, Typesense)
- Full-text AI / fuzzy matching search
- Multi-table export / reporting search
- Search across teachers, staff, parents, or system settings
- Custom detail pages created specifically for search

---

## 10. Phase 6.6 Handoff

**Next Active Target:** Phase 6.6 — Operational Tables & Multi-Criteria Filtering

With Global Search (6.5) fully integrated into the App Shell header, Phase 6.6 targets server-applied multi-criteria operational tables for Students, Invoices, and Sessions using TanStack Table v8 with token-driven design discipline.
