# CoachingOS Engineering Playbook v1.0

> **Purpose**
>
> This document defines the engineering standards, technology choices, coding conventions, and development workflow for CoachingOS.
>
> It is the single source of truth for how the software is built.
>
> The goal is consistency, maintainability, scalability, and production readiness—not following trends.

---

## 1. Engineering Philosophy

### Principle 1 — Product First

Technology serves the product. Never adopt technology because it is popular. Adopt it only if it solves a real engineering problem.

### Principle 2 — Simplicity Over Cleverness

Simple code is preferred over clever code. Future maintainability is more important than writing fewer lines.

### Principle 3 — Architecture Before Features

Business rules belong in the Domain. Frameworks and libraries are implementation details.

### Principle 4 — Build for the Current Stage

Do not prematurely optimize. Build for 100 institutes and 50,000 students, not 10 million users.

### Principle 5 — Modular Design

Every module owns its business. Modules communicate through events or public interfaces, never through direct database access.

### Principle 6 — Replaceable Infrastructure

Business logic must never depend directly on Prisma, Better Auth, WhatsApp, Razorpay, or Cloudflare. Always use abstractions.

---

## 2. Official Technology Stack

### Frontend

| Category      | Technology                    |
| ------------- | ----------------------------- |
| Framework     | Next.js 16 (App Router)       |
| Language      | TypeScript                    |
| Styling       | Tailwind CSS v4               |
| UI Components | shadcn/ui                     |
| Icons         | Lucide React                  |
| Forms         | React Hook Form               |
| Validation    | Zod                           |
| Server State  | TanStack Query                |
| Client State  | Zustand                       |
| Tables        | TanStack Table                |
| Charts        | Recharts                      |
| Motion        | Framer Motion (minimal usage) |
| Dates         | date-fns                      |

---

### Backend

| Category       | Technology                    |
| -------------- | ----------------------------- |
| Runtime        | Node.js                       |
| API            | Next.js Route Handlers        |
| ORM            | Prisma                        |
| Database       | PostgreSQL                    |
| Authentication | Better Auth                   |
| Validation     | Zod                           |
| File Upload    | Signed Object Storage Uploads |

---

### Infrastructure

| Category         | Technology                     |
| ---------------- | ------------------------------ |
| Hosting          | Vercel                         |
| Database Hosting | Neon PostgreSQL                |
| Storage          | Cloudflare R2                  |
| CDN              | Cloudflare                     |
| Jobs             | Deferred (ADR-0003 evaluation) |
| Logging          | Pino                           |
| Monitoring       | Sentry                         |
| Email            | Resend (Future)                |
| WhatsApp         | Meta Cloud API                 |
| SMS              | Provider Abstraction           |
| Payments         | Manual (Razorpay V2)           |

---

### Testing

| Category    | Technology |
| ----------- | ---------- |
| Unit        | Vitest     |
| Integration | Vitest     |
| E2E         | Playwright |

---

### Tooling

| Category        | Tool                 |
| --------------- | -------------------- |
| Package Manager | pnpm                 |
| Monorepo        | Turborepo            |
| Linting         | ESLint               |
| Formatting      | Prettier             |
| Git Hooks       | Husky                |
| Staged Checks   | lint-staged          |
| Commits         | Conventional Commits |

---

## 3. Monorepo Structure

```text
coaching-os/

apps/
    web/

packages/
    identity/
    academics/
    billing/
    communication/
    administration/
    audit/
    shared/
    ui/

infrastructure/
    database/
    storage/
    queue/
    observability/

docs/
    adr/

tooling/
```

---

## 4. Module Structure

Every module follows exactly the same structure.

```text
identity/

    domain/
        entities/
        value-objects/
        enums/
        events/
        repositories/

    application/
        dto/
        use-cases/

    infrastructure/
        prisma/
        repositories/
        adapters/

    presentation/
        api/
        validators/
```

No exceptions.

---

## 5. Folder Conventions

### Domain

Contains only business logic. Must never import Prisma, React, Next.js, or Better Auth.

### Application

Coordinates use cases. Contains transactions, authorization, repository calls, and event publishing.

### Infrastructure

Implements interfaces. Contains Prisma, Storage, Queue, and Third-party APIs.

### Presentation

Contains route handlers, validation, and DTO mapping.

---

## 6. Naming Conventions

### Files

Always `kebab-case`.

- `create-student.ts`
- `record-attendance.ts`
- `payment-repository.ts`

### Components

`PascalCase`.

- `StudentCard.tsx`
- `AttendanceTable.tsx`
- `FeeStatusBadge.tsx`

### Hooks

- `useAttendance()`
- `useCurrentInstitute()`

### Interfaces

- `StudentRepository`
- `NotificationProvider`

### Enums

- `AttendanceStatus`
- `InvoiceStatus`
- `BatchStatus`

### Events

Past tense.

- `AttendanceRecorded`
- `InvoiceGenerated`
- `PaymentRecorded`

### Use Cases

Verb first.

- `CreateStudent`
- `RecordAttendance`
- `GenerateInvoice`
- `PublishHomework`

---

## 7. API Conventions

### REST

Resources only.

**Good:**

- `GET /students`
- `POST /students`
- `PATCH /students/{id}`

**Bad:**

- `POST /createStudent`

### Responses

Always:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "",
    "message": ""
  }
}
```

Never return Prisma errors.

---

## 8. Validation Rules

Validation has three layers:

1. **Request Validation:** Zod
2. **Business Validation:** Domain
3. **Database Validation:** Constraints

Never depend only on database constraints.

---

## 9. Error Handling

## 9. Error Handling Standards & Taxonomy

Never throw raw untyped strings or generic exceptions in application code:

```ts
// Bad
throw new Error('Something went wrong');
```

Use the framework-independent Application Error Taxonomy from `@coaching-os/shared`:

- `ValidationError` (400)
- `AuthenticationError` (401)
- `AuthorizationError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `RateLimitError` (429)
- `InternalError` (500)

### API Response Error Boundaries (`toErrorResponse`)

- The API layer maps application errors and normalized database errors into safe public JSON payloads via `toErrorResponse(err, requestId)`.
- Public error responses contain `{ error: { code, message, requestId } }` and set the `x-request-id` HTTP header.
- **Never expose internal details:** Stack traces, SQL queries, Prisma internal codes, file paths, or secrets are redacted from public client responses and logged strictly server-side.

---

## 10. Logging & Tracing Standards

Never use `console.log()` in production application code. Use the structured Pino logger abstraction from `@coaching-os/observability`:

```ts
import { logger } from '@coaching-os/observability';

logger.info(
  { requestId, instituteId, userId, operation: 'attendance.mark' },
  'Attendance recorded successfully',
);
```

### Logging Rules

1. **Machine-Readable Metadata:** Always pass structured JSON objects as context rather than concatenating strings.
2. **Correlation / Request IDs:** Every HTTP request receives or generates a unique `x-request-id` (`crypto.randomUUID()`) attached to request logs.
3. **Automated Redaction:** Pino automatically censors 24 sensitive paths (`password`, `token`, `cookie`, `authorization`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `otp`, `secret`, `apiKey`).
4. **No Raw Domain Entities:** Never log complete student/parent domain objects, full payment credentials, phone numbers, or passwords.

---

## 11. Observability & Asynchronous Infrastructure Policy

### Async Workflow Engine Policy (ADR-0003)

- **No Premature Workflow Infrastructure:** No background workflow engine (Inngest, Trigger.dev, BullMQ, Redis) is installed during Phase 0.
- **Event Contracts:** Domain code emits typed `ApplicationEvent` payloads defined in `@coaching-os/shared`.
- **Infrastructure Selection:** When asynchronous business workloads arrive (e.g. Phase 4 Notifications):
  - **Inngest:** Evaluated for event-driven workflow chains.
  - **Trigger.dev:** Evaluated for compute-heavy / long-running tasks (PDF rendering, AI summaries, bulk imports).

Sentry captures:

- Exceptions
- Performance
- Stack traces

Critical operations include trace IDs.

---

---

## 14. Testing Infrastructure & Standards

CoachingOS adheres to a strict 3-tier testing pyramid:

```text
       ┌───────────┐
       │    E2E    │  Playwright (Chromium, semantic selectors)
       ├───────────┤
       │Integration│  Vitest + Real PostgreSQL (TEST_DATABASE_URL)
       ├───────────┤
       │   Unit    │  Vitest (Fast, behavior-focused, zero mocks of DB)
       └───────────┘
```

### Key Testing Rules

1. **Real PostgreSQL for Integration:** Integration tests run against PostgreSQL via `TEST_DATABASE_URL` (`coachingos_test`). SQLite is strictly prohibited as a fake replacement.
2. **Fail-Closed Database Safety Guard:** `validateTestEnvironment()` aborts immediately if `TEST_DATABASE_URL` is missing or matches `DATABASE_URL`.
3. **Database Isolation Strategy:** `cleanTestDatabase()` performs synchronized `TRUNCATE TABLE ... CASCADE` via `db.$executeRawUnsafe` before/between tests.
4. **Deterministic Test Data Factories:** Use `createTestInstitute`, `createTestUser`, `createTestStudent`, `createTestBatch`, `createTestEnrollment` from `@coaching-os/database` to construct isolated entities with unique UUID suffixes.
5. **Multi-Tenant Isolation Testing:** Every query boundary must be tested to ensure an authenticated user from Institute A can NEVER read or mutate Institute B data by tampering with ID parameters.
6. **Hardened Request ID Verification:** Integration tests verify that client-supplied `X-Request-ID` headers are ignored and server-side UUID v4 is always generated as the canonical request ID.

---

## 15. Git Workflow & CI Standards

### Branch Integration Strategy

CoachingOS follows a protected integration branch workflow:

```text
feature/*  ──►  master (develop)  ──►  main (production)
```

- Short-lived feature branches (`feature/<domain>-<description>`).
- Direct commits to protected branches are prohibited once branch protection is enabled via GitHub settings.

### Conventional Commits Format

Commit messages MUST follow the Conventional Commits specification:

```text
type(scope): concise imperative description
```

Examples:

- `feat(auth): add parent session handling`
- `fix(attendance): prevent duplicate attendance`
- `test(identity): add tenant isolation coverage`
- `chore(ci): establish github actions pipeline`
- `docs(architecture): update SDD`

### Pull Request Quality Checklist

1. **Clear Scope:** PRs must remain focused and address a single architectural concern or feature.
2. **Mandatory CI Green:** All 4 pipeline jobs (`quality`, `database-and-tests`, `e2e`, `build`) must pass cleanly.
3. **Database Migration Requirement:** Any change to `prisma/schema.prisma` MUST include a generated migration in `prisma/migrations`. Changing `schema.prisma` without a migration fails CI (`prisma migrate status`).
4. **Security & Multi-Tenant Isolation:** Zero secrets committed; tenant boundaries (`institute_id`) strictly preserved.

### Recommended GitHub Branch Protection Settings

- Require Pull Request before merging.
- Require status checks to pass before merging: `quality`, `database-and-tests`, `e2e`, `build`.
- Require branches to be up to date before merging.
- Disable force pushes and deletion of protected branches.

---

## 16. Database Standards

Every table contains:

- `id`
- `created_at`
- `updated_at`

- Archive only when business requires it.
- No blanket soft deletes.
- Indexes only when justified.
- Prefer UUID/CUID primary keys consistently.
- Use `NUMERIC` for money. Never use floating-point types for currency.

---

## 15. Repository Rules

- One repository per Aggregate Root.
- Repositories return domain models, never Prisma models.

---

## 16. Transactions

One use case = One transaction.

Example:

```text
Enroll Student → Create Enrollment → Create Billing Plan → Publish Event → Commit
```

---

## 17. Event Rules

Modules never call each other directly.

Publish:

- `AttendanceRecorded`

Subscribers:

- Communication subscribes.
- Audit subscribes.
- Analytics subscribes.

Loose coupling only.

---

## 18. Background Jobs

Never send WhatsApp inside HTTP requests.

Jobs handle:

- Notifications
- Invoice generation
- Reminders
- Scheduled tasks

Durable workflow engine (to be evaluated per ADR-0003 when real workloads exist) owns execution.

---

## 19. State Management

### TanStack Query

Owns server state (e.g., Students, Attendance, Invoices).

### Zustand

Owns UI state (e.g., Sidebar, Theme, Dialogs, Selected batch).

Never duplicate server data in client state.

---

## 20. Theme & Branding System

Branding is token-driven.

Supported customization:

- Logo
- Institute Name
- Tagline
- Primary Color
- Secondary Color
- Accent Color
- Typography Pair
- Border Radius
- Card Style
- Button Style
- Receipt Branding

No custom CSS uploads.

---

## 21. Git Workflow

### Main Branches

- `main`
- `develop`

### Feature Branches

- `feature/identity`
- `feature/attendance`
- `feature/billing`

### Bug Fixes

- `fix/login`
- `fix/attendance`

### Hotfixes

- `hotfix/payment`

---

## 22. Commit Convention

Format: `<type>(<scope>): <description>`

Types:
`feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`

Example:

```bash
feat(identity): add student enrollment workflow
```

---

## 23. Pull Request Checklist

Every PR must answer:

- What problem does this solve?
- Is architecture respected?
- Are permissions checked?
- Are events published?
- Are logs added where needed?
- Are tests included?
- Are edge cases handled?
- Is documentation updated?

---

## 24. Testing Rules

Every feature should include:

- Unit tests for domain logic
- Integration tests for repositories
- E2E tests for critical workflows

Critical workflows:

- Student admission
- Attendance
- Fee recording
- Parent login

---

## 25. Performance Budgets

### API

- Average response: `< 200 ms`
- Heavy endpoints: `< 500 ms`

### Page Load

- Initial page: `< 2 seconds`

### Database

- Avoid N+1 queries.
- Paginate lists.
- Index frequent filters.

### Bundle

- Lazy load admin modules.
- Avoid unnecessary client-side JavaScript.

---

## 26. Security Standards

- Validate all input with Zod.
- Authorize every protected action.
- Never trust client-provided IDs for tenancy.
- Resolve institute context server-side.
- Use signed URLs for uploads/downloads.
- Rate-limit authentication and sensitive endpoints.
- Store secrets only in environment variables.
- Escape or sanitize user-generated content where appropriate.

---

## 27. Documentation Standards

Every significant feature should update:

- API documentation
- Architecture decision records (if applicable)
- Business rules (if changed)
- User-facing documentation (if needed)

---

## 28. Definition of Done

A feature is complete only if:

- Business requirements implemented.
- Code reviewed.
- Tests pass.
- Logging added.
- Permissions enforced.
- Responsive UI verified.
- Accessibility considered.
- Documentation updated.
- Deployable to production.

---

## 29. Architecture Decision Records (ADRs)

Maintain a `docs/adr/` directory containing one-page ADRs for key technical decisions.

Whenever a major technical decision is made, document:

- Context and problem statement.
- Options considered.
- Chosen solution and rationale.
- Consequences (pros and cons).

Examples of documented decisions:

- Why Next.js (App Router) was chosen.
- Why Billing is enrollment-centric.
- Why background workflow engine selection is deferred until real asynchronous workloads exist (ADR-0003).
- Why modules communicate via domain events.

---

## 30. Things We Will NOT Do Prematurely

- Microservices
- Kubernetes
- Elasticsearch
- Redis (until there is a clear need)
- Event sourcing
- CQRS
- AI features without validated use cases
- Over-customization through arbitrary CSS or scripting

---

## 31. Architecture Motto

> **"Build a product that is simple for users, structured for developers, and flexible for the future."**
