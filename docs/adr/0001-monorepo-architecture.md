# ADR-0001: Monorepo Architecture Strategy

## Status
Accepted

## Context
CoachingOS is engineered as a modular monolith multi-tenant SaaS platform for coaching institutes. The codebase requires tight operational consistency, cross-cutting type safety, and clean separation between presentation apps (`apps/web`), domain modules (`packages/*`), and infrastructure adapters (`infrastructure/*`).

A multi-repository (polyrepo) setup introduces friction in atomic refactoring, type sharing, dependency synchronization, and developer tooling overhead for a small engineering team.

## Decision
We adopt a **pnpm Workspaces + Turborepo monorepo architecture**.

### Workspace Structure
- **`apps/web`**: Primary Next.js App Router application (web presentation & REST API route handlers).
- **`packages/*`**: Bounded domain contexts (`identity`, `academics`, `billing`, `communication`, `administration`, `audit`) and shared boundaries (`shared`, `ui`).
- **`infrastructure/*`**: Persistence, storage, job queue, and observability adapter boundaries (`database`, `storage`, `queue`, `observability`).
- **`docs/adr/`**: Architecture Decision Records preserving project governance and design decisions.

### Key Rules
1. Workspace dependencies use standard pnpm workspace protocols (`workspace:*`).
2. Public package entry points are strictly constrained to `src/index.ts` via explicit `exports` manifests.
3. Domain packages (`packages/*`) remain strictly framework-independent (no direct Next.js, React, or ORM dependencies inside domain logic).

## Consequences

### Positive
- Single source of truth for all domain packages, apps, and infrastructure.
- Zero-drift TypeScript type safety across the entire application stack.
- Optimized local execution, task graph pipelines, and build caching powered by Turborepo.
- Clean isolation of bounded contexts while maintaining a single deployable unit.

### Tradeoffs / Considerations
- Requires disciplined package boundary enforcement to prevent improper cross-module dependencies.
- Monorepo tooling and workspace configurations must be maintained centrally at root.
