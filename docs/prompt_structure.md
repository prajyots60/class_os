ROLE
You are the implementation engineer for CoachingOS.

PROJECT CONTEXT
[Relevant architecture]

AUTHORITATIVE DOCUMENTS
[SDD rules]
[DADD rules]
[Engineering Playbook rules]

CURRENT MILESTONE
Phase 0.1 — Repository Initialization

OBJECTIVE
[exact objective]

TECHNICAL REQUIREMENTS
[exact requirements]

ARCHITECTURAL CONSTRAINTS
[things you MUST NOT do]

FILES / STRUCTURE
[expected structure]

IMPLEMENTATION TASKS

1.
2.
3.
4.

VALIDATION
Run:

- ...
- ...
- ...

SUCCESS CRITERIA

- ...
- ...

DO NOT

- implement business features
- introduce new architecture
- install unnecessary dependencies
- modify frozen architecture

FINAL REPORT
Return:

- files created
- files modified
- commands executed
- tests passed
- unresolved issues

......................
EXAMPLE

ROLE

You are the implementation engineer for CoachingOS.

You are continuing an existing repository after successful completion of:

PHASE 0.1 — Repository Initialization
PHASE 0.2 — Monorepo Architecture
PHASE 0.3 — Web Application Foundation
PHASE 0.4 — Database + Prisma Foundation
PHASE 0.5 — Environment / Configuration Foundation
PHASE 0.6 — Authentication Foundation
PHASE 0.7 — Shared Engineering Infrastructure

All previous phases are accepted.

This milestone is:

PHASE 0.8 — TESTING INFRASTRUCTURE

==================================================
PRIMARY OBJECTIVE
==================================================

Establish a production-quality but intentionally lightweight testing
foundation for CoachingOS.

The purpose is to make the repository safe for rapid feature development
after Phase 0.

The testing system must support:

1. Unit tests
2. Integration tests
3. Database integration tests
4. Authentication tests
5. Authorization / RBAC tests
6. Multi-tenant isolation tests
7. API contract tests
8. Browser / E2E tests
9. Deterministic test data
10. Reliable local and CI execution

Do NOT build a giant testing framework.

Do NOT test implementation details.

Prefer testing:

- business behavior
- contracts
- security boundaries
- database constraints
- API behavior
- user-visible behavior

==================================================
IMPORTANT EXISTING ARCHITECTURE
==================================================

Current repository:

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
config/
auth/

Existing technology:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Turborepo
- pnpm
- PostgreSQL
- Prisma 7
- Better Auth 1.6.x
- Zod
- TanStack Query
- Zustand
- React Hook Form
- Pino

Phase 0.7 already provides:

- structured logging
- error taxonomy
- API error handling
- request IDs
- database error normalization
- event contracts

Do not duplicate those systems.

==================================================
TASK 1 — INSPECT BEFORE MODIFYING
==================================================

Inspect:

- root package.json
- turbo.json
- tsconfig.json
- pnpm-workspace.yaml
- all workspace package.json files
- infrastructure/database
- infrastructure/auth
- infrastructure/config
- infrastructure/observability
- apps/web
- Prisma schema
- existing verification scripts
- Engineering Playbook
- ADRs
- SDD
- DADD
- CONTEXT.md

Identify:

- existing test scripts
- existing test dependencies
- existing test files
- existing database utilities
- existing authentication verification
- existing seed logic
- existing API routes
- existing route handlers

Do not assume the repository is clean simply because Phase 0.7 passed.

==================================================
TASK 2 — TESTING TECHNOLOGY DECISION
==================================================

Use:

- Vitest for unit and integration testing
- Playwright for browser / E2E testing

Do NOT install Jest.

Do NOT install Cypress.

Do NOT introduce Mocha.

Do NOT introduce another unit testing framework.

Testing stack:

Vitest
↓
unit + integration

Playwright
↓
browser + E2E

PostgreSQL
↓
database integration

Prisma
↓
database access

==================================================
TASK 3 — CURRENT STABLE VERSIONS
==================================================

Before installation, inspect the current package registry versions.

Install current stable versions compatible with:

- Node.js 24
- TypeScript 5.9.x
- Next.js 16
- React 19
- Prisma 7

Do not blindly use versions from examples or old documentation.

Prefer the latest stable release that is compatible with this repository.

After installation, record the exact installed versions.

==================================================
TASK 4 — PACKAGE PLACEMENT
==================================================

Use the monorepo architecture correctly.

Vitest should be installed where it is actually needed.

Do not install every testing dependency in the root package merely for
convenience.

A reasonable structure is:

Root:

- shared test commands / orchestration

Domain packages:

- Vitest where unit tests belong

Infrastructure packages:

- Vitest where infrastructure tests belong

apps/web:

- Vitest for application-level tests where appropriate
- Playwright for E2E

Do not create unnecessary packages such as:

packages/testing-framework

unless there is a concrete architectural reason.

==================================================
TASK 5 — ROOT TEST COMMANDS
==================================================

Establish clear commands:

pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e

And useful variants where appropriate:

pnpm test:watch
pnpm test:coverage

The exact implementation may use Turborepo.

The commands must be understandable to a new contributor.

Avoid obscure scripts.

==================================================
TASK 6 — TURBO INTEGRATION
==================================================

Integrate testing with Turborepo appropriately.

Unit tests should participate in the workspace task graph.

Do not make E2E tests execute automatically as part of every normal
package build.

Recommended conceptual separation:

lint
typecheck
build
test
test:integration
test:e2e

E2E should be an explicit operation.

Do not make:

pnpm build

start a browser test suite.

==================================================
TASK 7 — VITEST BASE CONFIGURATION
==================================================

Create a sensible Vitest configuration.

Requirements:

- TypeScript support
- ESM compatibility
- clear test discovery
- deterministic execution
- useful failure output
- isolated tests where appropriate

Do not introduce unnecessary plugins.

Use the smallest configuration that works correctly with the repository.

==================================================
TASK 8 — TEST FILE CONVENTION
==================================================

Adopt one consistent convention.

Preferred:

*.test.ts
*.test.tsx

Examples:

errors.test.ts
logger.test.ts
validation.test.ts
repository.test.ts
attendance.test.ts

Do not mix:

.spec.ts
.test.ts
.tests.ts

unless there is a documented reason.

Use:

describe()
it()
expect()

Keep test names behavior-oriented.

GOOD:

it("rejects access to another institute")

BAD:

it("calls getMembership() twice")

==================================================
TASK 9 — TEST CATEGORIES
==================================================

Clearly distinguish:

UNIT

Tests a function/class/module in isolation.

Examples:

- validation
- error normalization
- date utilities
- permission calculations
- billing calculations

INTEGRATION

Tests multiple real components together.

Examples:

- Prisma repository
- authentication + database
- API + database
- tenant authorization

E2E

Tests actual user workflows through the browser.

Examples:

- login
- dashboard access
- student creation
- attendance marking
- parent workflow later

Do not classify everything as E2E.

==================================================
TASK 10 — DATABASE TEST STRATEGY
==================================================

This is critical.

We use:

PostgreSQL + Prisma 7.

Do NOT use SQLite as a fake replacement for PostgreSQL.

Do NOT silently test PostgreSQL-specific behavior against SQLite.

The production database and test database must use PostgreSQL.

Establish a dedicated test database.

Example conceptual configuration:

DATABASE_URL
development database

TEST_DATABASE_URL
dedicated test database

Never run integration tests against the normal development database.

==================================================
TASK 11 — TEST DATABASE SAFETY
==================================================

Test execution must be unable to accidentally destroy the development
database.

Implement explicit test environment validation.

For example:

TEST_DATABASE_URL must point to a dedicated test database.

Before destructive setup/reset operations, verify:

- NODE_ENV is test
- test database is explicitly configured
- database name is clearly test-specific where possible

If the safety condition is not satisfied:

FAIL CLOSED.

Never automatically run:

prisma migrate reset

against an arbitrary DATABASE_URL.

==================================================
TASK 12 — PRISMA TEST DATABASE
==================================================

Establish a repeatable database setup strategy.

Preferred lifecycle:

1. Create / verify test database.
2. Apply migrations.
3. Seed deterministic baseline data if required.
4. Run tests.
5. Clean up test data/database as appropriate.

Do not modify production/development data.

Do not create a second competing Prisma schema.

Use the canonical Prisma schema.

==================================================
TASK 13 — DATABASE ISOLATION
==================================================

Tests must be isolated.

Evaluate practical strategies:

Option A:
Transaction rollback per test.

Option B:
Truncate test tables between tests.

Option C:
Dedicated database/schema per test worker.

Choose the simplest reliable strategy compatible with Prisma 7 and the
current repository.

Do NOT introduce extremely complex database infrastructure merely to
achieve theoretical maximum parallelism.

Correctness > maximum test speed.

If transaction rollback is not practical because the code under test
opens independent connections/transactions, use a safer cleanup strategy.

Document the decision.

==================================================
TASK 14 — TEST DATA FACTORIES
==================================================

Create deterministic test factories.

Avoid putting massive fixtures directly into tests.

Factories should be capable of creating entities such as:

Institute
User
InstituteMembership
ParentIdentity
ChildProfile
InstituteParent
Student
Subject
Batch
Enrollment

Later factories can include:

Attendance
Homework
Test
Marks
BillingPlan
Invoice
Payment

Do not build factories for every schema model automatically.

Create factories based on actual testing requirements.

==================================================
TASK 15 — TEST DATA PRINCIPLES
==================================================

Tests should use clearly identifiable test data.

Example:

test-institute-a
test-institute-b

test-owner-a
test-teacher-a

student-a
student-b

Do not use real personal information.

Do not reuse production seed data blindly.

Test factories should create isolated records.

==================================================
TASK 16 — AUTHENTICATION TESTING
==================================================

Test the existing Better Auth foundation.

At minimum verify:

1. Sign-up succeeds.
2. Sign-in succeeds.
3. Session is created.
4. Session can be retrieved.
5. Sign-out invalidates the session.
6. Invalid credentials are rejected.
7. Protected route without session is rejected.
8. Expired/invalid session is rejected where applicable.

Do NOT test Better Auth's internal implementation.

Test our integration with Better Auth.

==================================================
TASK 17 — RBAC TESTING
==================================================

Test our authorization boundary.

Roles currently include:

owner
teacher
assistant
parent

Verify permissions according to the existing architecture.

At minimum test:

Owner
→ allowed appropriate institute administration

Teacher
→ allowed appropriate academic operations

Assistant
→ allowed only permitted operations

Parent
→ cannot access staff-only operations

Do not invent new permissions.

Use the existing SDD/DADD/authorization rules.

==================================================
TASK 18 — MULTI-TENANT ISOLATION
==================================================

This is one of the highest-priority test categories.

Create:

Institute A
Institute B

User A → Institute A

User B → Institute B

Student A → Institute A

Student B → Institute B

Verify:

User A cannot access:

- Institute B students
- Institute B batches
- Institute B attendance
- Institute B billing
- Institute B administration

and vice versa.

Test both:

1. API-level authorization
2. database/service-level authorization where applicable

The important invariant:

A valid authenticated user from Institute A must never gain access
to Institute B data simply by changing an ID in a request.

Example:

/api/institutes/A/students/student-A

must not become:

/api/institutes/B/students/student-B

by replacing a URL parameter.

==================================================
TASK 19 — PARENT IDENTITY TESTING
==================================================

Test the two-layer parent architecture.

Current conceptual model:

ParentIdentity
↓
ChildProfile
↓
StudentLink
↓
Institute Student

And:

ParentIdentity
↓
InstituteMembership
↓
Institute

Verify that:

- one ParentIdentity can relate to multiple institutes
- one ParentIdentity can have multiple ChildProfiles
- ChildProfile can be linked to tenant Students
- StudentLink remains tenant-safe
- parent cannot access unrelated student records
- institute membership does not automatically imply access to every
  student in the platform

Do not implement new parent features.

Test the architecture already established.

==================================================
TASK 20 — ERROR CONTRACT TESTING
==================================================

Test Phase 0.7 error behavior.

Verify:

ValidationError → 400
AuthenticationError → 401
AuthorizationError → 403
NotFoundError → 404
ConflictError → 409
RateLimitError → 429
InternalError → 500

Verify public responses do NOT contain:

- stack trace
- SQL
- Prisma internals
- environment variables
- secrets

Verify request ID is included where the API contract specifies it.

==================================================
TASK 21 — PRISMA ERROR TESTING
==================================================

Test normalization for important known errors:

P2002 → ConflictError
P2025 → NotFoundError
P2003 → ValidationError

Unknown database errors:

→ InternalError

Do not create a huge exhaustive test matrix for every Prisma code.

Focus on the codes explicitly supported by our application boundary.

==================================================
TASK 22 — LOGGING TESTING
==================================================

Test the Phase 0.7 logging contract.

Verify:

- logger initializes
- structured metadata is preserved
- Error objects serialize correctly
- sensitive fields are redacted
- passwords are never emitted
- tokens are redacted
- authorization headers are redacted
- cookies are redacted

Do not assert exact Pino internal formatting.

Test the observable security behavior.

==================================================
TASK 23 — REQUEST ID TESTING
==================================================

Test:

1. Request receives server-generated request ID.
2. ID is cryptographically generated.
3. Response contains X-Request-ID.
4. Logs use the same canonical ID where request context is available.
5. Client-supplied X-Request-ID cannot override the server-generated ID.

The last test is mandatory because it was explicitly hardened in Phase
0.7.

==================================================
TASK 24 — API TESTING
==================================================

Where actual API routes exist, create integration tests.

Test behavior:

request
↓
authentication
↓
authorization
↓
validation
↓
business operation
↓
database
↓
response

Do not test Next.js framework internals.

Test our route behavior.

==================================================
TASK 25 — ZOD VALIDATION TESTING
==================================================

Test important application schemas.

At minimum verify:

- required fields
- invalid types
- invalid enums
- invalid IDs
- malformed URLs where applicable
- length constraints
- invalid dates where applicable

Do not test Zod itself.

Test our schemas.

==================================================
TASK 26 — BILLING TESTING
==================================================

Do not build billing features yet.

But if existing billing utilities or calculations exist, create unit tests
for them.

Focus on:

- amounts
- discounts
- invoice totals
- payment status
- receipt relationships

Do not invent business rules that are not already specified.

==================================================
TASK 27 — ACADEMIC TESTING
==================================================

Do not build academic features yet.

If existing academic domain functions exist, test them.

Potential future areas include:

- attendance status
- test marks
- percentage calculations
- batch/session relationships

Only test behavior that already exists.

Do not create speculative business logic merely to populate tests.

==================================================
TASK 28 — PLAYWRIGHT
==================================================

Install current stable Playwright compatible with the project.

Configure:

- Chromium initially
- deterministic test startup
- local Next.js application
- test base URL
- retries appropriate for CI
- trace capture on failure
- screenshot capture on failure if useful

Do NOT configure a huge browser matrix yet.

Initially:

Chromium only.

Later:

Firefox/WebKit/mobile browsers if product requirements justify them.

==================================================
TASK 29 — PLAYWRIGHT TEST ENVIRONMENT
==================================================

E2E tests must run against a controlled test environment.

Do NOT run E2E tests against production.

Do NOT run E2E tests against the user's normal development database.

Prefer:

test environment
↓
test database
↓
Next.js test server
↓
Playwright

Document the lifecycle.

==================================================
TASK 30 — INITIAL E2E TESTS
==================================================

Do not create dozens of E2E tests.

Create a minimal smoke suite.

At minimum:

1. Application loads.
2. Public page renders.
3. Authentication page/flow renders if implemented.
4. Authenticated user can reach the appropriate protected surface if
   currently implemented.
5. Unauthorized access is rejected.

Only test workflows that actually exist.

Do not invent future dashboard pages.

==================================================
TASK 31 — ACCESSIBILITY
==================================================

Do not install a dedicated accessibility framework yet unless there is
already a concrete requirement.

However, Playwright tests should use semantic selectors where possible:

getByRole()
getByLabel()
getByText()

Prefer:

page.getByRole("button", { name: "Sign in" })

over:

page.locator(".btn-primary")

This makes tests more resilient and closer to user behavior.

==================================================
TASK 32 — MOCKING
==================================================

Use mocks carefully.

Do NOT mock PostgreSQL/Prisma for integration tests.

Do NOT mock Better Auth for authentication integration tests.

Unit tests may mock external dependencies where appropriate.

Never create tests that pass only because every dependency is mocked.

Testing pyramid:

Unit:
small mocks allowed.

Integration:
real PostgreSQL.

E2E:
real application stack.

==================================================
TASK 33 — EXTERNAL SERVICES
==================================================

There are currently no required production external services for testing.

Do not add:

- Redis
- Inngest
- Trigger.dev
- Sentry
- WhatsApp provider
- SMS provider
- payment gateway

for testing infrastructure.

Those belong to later feature phases.

==================================================
TASK 34 — TEST ENVIRONMENT VARIABLES
==================================================

Extend the typed configuration system safely.

Introduce only the test variables actually required.

Potentially:

TEST_DATABASE_URL
PLAYWRIGHT_BASE_URL

Do not expose test secrets to client bundles.

Ensure test configuration cannot accidentally load production credentials.

==================================================
TASK 35 — TEST DATABASE SECURITY
==================================================

The test database must be explicitly identifiable.

The test setup should fail if:

NODE_ENV !== "test"

or

TEST_DATABASE_URL is missing

or

the configured database appears to be the normal development database.

Fail closed.

Do not silently fall back from TEST_DATABASE_URL to DATABASE_URL.

==================================================
TASK 36 — COVERAGE
==================================================

Configure coverage using a sensible Vitest-supported provider.

Do not chase an arbitrary:

100%

coverage target.

Establish initial guidance.

Suggested principle:

Critical security/business logic:
high coverage

Infrastructure utilities:
high coverage

UI:
behavior-focused coverage

Do not inflate coverage using meaningless tests.

If coverage tooling adds unnecessary dependencies or complexity, document
the decision.

==================================================
TASK 37 — TEST NAMING
==================================================

Tests should explain behavior.

GOOD:

"rejects student access across institutes"

"normalizes Prisma P2002 to conflict"

"ignores client supplied request id"

"returns 401 without a session"

BAD:

"works"

"test1"

"calls function"

==================================================
TASK 38 — DETERMINISM
==================================================

Tests must not depend on:

- current wall-clock time unless intentionally controlled
- random values unless controlled
- production data
- network availability
- external APIs
- execution order
- developer machine state

Use deterministic fixtures.

If dates are involved, freeze or inject time where appropriate.

==================================================
TASK 39 — PARALLEL TESTING
==================================================

Do not blindly enable maximum parallelism for database tests.

Determine which tests can safely run concurrently.

If database cleanup makes parallelism unsafe:

run those integration tests serially or isolate them appropriately.

Correctness takes priority.

==================================================
TASK 40 — CI PREPARATION
==================================================

Phase 0.9 will establish CI.

Do NOT build the complete CI workflow now.

However, ensure test commands can run non-interactively:

pnpm test
pnpm test:integration
pnpm test:e2e

should have deterministic behavior suitable for CI.

Document any CI prerequisites.

==================================================
TASK 41 — DOCUMENTATION
==================================================

Update:

docs/ENGINEERING_PLAYBOOK.md

with:

Testing philosophy
Test pyramid
Unit test rules
Integration test rules
E2E rules
Database test safety
Factory rules
Tenant isolation testing
Authentication testing
Mocking rules
Coverage philosophy
Test naming conventions

Create an ADR if a significant database testing strategy decision is made.

For example:

docs/adr/0004-testing-database-strategy.md

Only create it if the chosen strategy represents a meaningful architectural
decision.

==================================================
TASK 42 — NO DATABASE SCHEMA CHANGES
==================================================

This phase must NOT change:

prisma/schema.prisma

unless an existing test requirement exposes a genuine schema defect.

Do not modify the production schema merely to make tests easier.

Prefer test infrastructure around the existing schema.

No Prisma migration should be created by this phase.

==================================================
TASK 43 — VALIDATION
==================================================

Run all existing checks:

pnpm env:check
pnpm db:validate
pnpm db:generate
pnpm db:health
pnpm verify:auth
pnpm verify:infra

Then run:

pnpm test
pnpm test:unit
pnpm test:integration

Then:

pnpm test:e2e

Then:

pnpm typecheck
pnpm lint
pnpm build

If E2E requires a dedicated test server, document exactly how it was
started.

Do not claim success unless commands actually ran.

==================================================
TASK 44 — TEST FAILURE SAFETY
==================================================

If any test fails:

Do NOT hide it.

Do NOT weaken the assertion merely to make the suite green.

Investigate whether:

1. Test is wrong.
2. Implementation is wrong.
3. Existing architecture is incomplete.
4. Environment is misconfigured.

Fix the correct layer.

==================================================
TASK 45 — GIT
==================================================

Review:

git status
git diff

Ensure no:

- .env files
- database dumps
- Playwright artifacts
- screenshots
- traces
- coverage output
- temporary test databases
- secrets

are committed.

Add appropriate ignores.

Then create:

feat(testing): establish testing infrastructure

Do not mix unrelated feature work.

==================================================
SUCCESS CRITERIA
==================================================

[ ] Vitest installed at current compatible stable version

[ ] Playwright installed at current compatible stable version

[ ] Jest not installed

[ ] Cypress not installed

[ ] Root test commands established

[ ] Turborepo integration established

[ ] Unit testing works

[ ] Integration testing works

[ ] PostgreSQL used for database integration tests

[ ] SQLite is NOT used as a PostgreSQL substitute

[ ] Dedicated test database exists/configured

[ ] Test database safety checks exist

[ ] Tests cannot silently use development database

[ ] Test data factories exist for required entities

[ ] Authentication integration tests exist

[ ] RBAC tests exist

[ ] Multi-tenant isolation tests exist

[ ] ParentIdentity architecture tests exist where applicable

[ ] Error taxonomy tests exist

[ ] Prisma error normalization tests exist

[ ] Logging security tests exist

[ ] Request ID security tests exist

[ ] API behavior tests exist where routes exist

[ ] Zod schema tests exist where schemas exist

[ ] Playwright configured

[ ] Chromium E2E works

[ ] E2E uses controlled test environment

[ ] E2E does not use production

[ ] E2E does not use development DB

[ ] Browser tests use semantic selectors

[ ] No unnecessary external services installed

[ ] No Redis

[ ] No BullMQ

[ ] No Inngest

[ ] No Trigger.dev

[ ] No Sentry

[ ] No WhatsApp/SMS/payment integrations

[ ] Coverage configured sensibly or decision documented

[ ] Deterministic testing rules documented

[ ] Testing strategy documented

[ ] No production Prisma migration created

[ ] Environment validation passes

[ ] Database validation passes

[ ] Database health passes

[ ] Authentication verification passes

[ ] Infrastructure verification passes

[ ] Unit tests pass

[ ] Integration tests pass

[ ] E2E tests pass

[ ] Typecheck passes

[ ] Lint passes

[ ] Build passes

[ ] Git status clean except intentional commit state

[ ] Git commit created

==================================================
FINAL REPORT
==================================================

Return a detailed Phase 0.8 report containing:

1. Vitest version
2. Playwright version
3. Testing architecture
4. Package placement
5. Root test commands
6. Turborepo integration
7. Test database strategy
8. Test database safety mechanism
9. Database isolation strategy
10. Test factory architecture
11. Authentication tests
12. RBAC tests
13. Multi-tenant isolation tests
14. ParentIdentity tests
15. Error contract tests
16. Prisma error tests
17. Logging security tests
18. Request ID tests
19. API tests
20. Playwright architecture
21. Initial E2E tests
22. Coverage strategy
23. Files created
24. Files modified
25. Dependencies added
26. Dependencies deliberately NOT added
27. ADRs created
28. Engineering Playbook changes
29. Database migration status
30. All validation commands
31. Validation results
32. Test count summary
33. Git commit hash/message
34. Warnings
35. Unresolved issues
36. Exact recommendation for Phase 0.9

SECURITY RULE

Never include in the report:

- DATABASE_URL
- TEST_DATABASE_URL
- passwords
- Better Auth secrets
- session tokens
- access tokens
- refresh tokens
- cookies
- API keys
- OTP values
- payment credentials

END OF PHASE 0.8 TASK
