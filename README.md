# CoachingOS

CoachingOS is a multi-tenant SaaS platform built specifically for founder-led coaching institutes. It digitizes operational workflows—attendance, academics, billing, and parent communication—while providing an isolated digital identity for every institute.

---

## Architecture

CoachingOS is engineered as a **Modular Monolith**.

Key architectural characteristics:

- Single codebase managed via pnpm workspaces and Turborepo.
- Clean separation between presentation layer (`apps/web`), domain modules (`packages/*`), and infrastructure adapters (`infrastructure/*`).
- Multi-tenancy achieved via database-level tenant scoping (`institute_id`).
- Event-driven asynchronous background processing.

---

## Repository Structure

```text
coaching-os/

├── apps/
│   └── web/                # Next.js 16 App Router web application
│
├── packages/
│   ├── identity/           # Multi-tenant identity, institute, user, student & parent boundaries
│   ├── academics/          # Schedules, sessions, attendance, homework & test evaluations
│   ├── billing/            # Billing plans, invoicing, payments & printable receipts
│   ├── communication/      # Announcements, notification pipeline & WhatsApp workers
│   ├── administration/     # Institute branding, settings, roles & permissions
│   ├── audit/              # Immutable audit logging boundary
│   ├── shared/             # Cross-cutting utilities, types & shared primitives
│   └── ui/                 # Shared UI components & design system tokens
│
├── infrastructure/
│   ├── database/           # Database schema, migrations & seeds
│   ├── storage/            # Object storage abstractions
│   ├── queue/              # Asynchronous job queue drivers
│   └── observability/      # Logging & telemetry setup
│
├── docs/
│   └── adr/                # Architecture Decision Records
│
├── tooling/                # Shared build, linting & formatting configurations
```

---

## Development

### Prerequisites

- Node.js LTS (>= 20.x, recommended 24.x)
- pnpm (>= 11.x)

### Setup & Workflow Commands

```bash
# Install workspace dependencies
pnpm install

# Start local development server
pnpm dev

# Build all workspace packages and apps
pnpm build

# Run ESLint across workspace
pnpm lint

# Run TypeScript typechecks across workspace
pnpm typecheck

# Format code with Prettier
pnpm format
```

---

## Engineering Rules

1. **Domain Isolation:** All business logic belongs to its respective module inside `packages/*`. `apps/web` handles presentation, routing, and DTO mapping.
2. **Boundary Protection:** Direct module-to-module internal state mutations are prohibited. Modules communicate exclusively through published domain interfaces or domain events.
3. **Architectural Truth:** All system behaviors, schemas, and API contracts must conform strictly to the **System Design Document (SDD)**, **Database & API Design Document (DADD)**, and **Engineering Playbook**.
4. **Architecture Decision Records:** Any proposed deviations or evolutions to the architecture require a formal, documented Architecture Decision Record inside `docs/adr/`.
