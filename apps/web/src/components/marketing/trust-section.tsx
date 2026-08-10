import * as React from 'react';
import { Shield, Lock, KeyRound, Eye, ShieldCheck } from 'lucide-react';
import { Card, Badge } from '@coaching-os/ui';
import { Container, Section } from '../layout/container';

const TRUST_CONCEPTS = [
  {
    title: 'Row-Level Tenant Isolation',
    description:
      'Every database operation is explicitly scoped by institute_id at the repository layer, ensuring complete data boundary isolation between institutes.',
    tag: 'Tenant Isolation',
    icon: Shield,
  },
  {
    title: 'Capability-Based RBAC',
    description:
      'Access permissions are governed by 49 fine-grained domain capabilities resolved server-side, never trusting client-supplied parameters.',
    tag: 'Capability RBAC',
    icon: Lock,
  },
  {
    title: 'Server-Controlled Sessions',
    description:
      'User authentication state and institute memberships are verified server-side using encrypted session tokens powered by Better Auth.',
    tag: 'Better Auth Infrastructure',
    icon: KeyRound,
  },
  {
    title: 'Audit Logging & Redaction',
    description:
      'Security-sensitive actions record canonical request correlation IDs, structured Pino logs, and automatic sensitive field redaction.',
    tag: 'Observability & PII Redaction',
    icon: Eye,
  },
];

export function TrustSection() {
  return (
    <Section padding="lg" id="security" className="scroll-mt-16 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <Container size="lg">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Architectural Trust & Security
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] sm:text-4xl">
            Enterprise security designed for coaching data.
          </h2>
          <p className="mt-4 text-base text-[hsl(var(--muted-foreground))] sm:text-lg">
            Your institute data is protected by strict multi-tenant isolation, capability-based access controls, and server-side session authorization.
          </p>
        </div>

        {/* Trust Concepts Grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_CONCEPTS.map((concept) => {
            const Icon = concept.icon;

            return (
              <Card
                key={concept.title}
                className="group relative flex flex-col justify-between p-6 transition-all hover:border-[hsl(var(--primary))]/50 hover:shadow-md"
              >
                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] transition-colors group-hover:bg-[hsl(var(--primary))] group-hover:text-[hsl(var(--primary-foreground))]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {concept.tag}
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <h3 className="mt-5 text-base font-bold text-[hsl(var(--foreground))]">
                    {concept.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {concept.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Technical Guarantee Micro-banner */}
        <div className="mt-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
          <span className="font-semibold text-[hsl(var(--foreground))]">Security Invariant:</span> All authorization and multi-tenant isolation rules are enforced server-side. Public marketing pages contain zero database dependencies or dynamic authorization state.
        </div>
      </Container>
    </Section>
  );
}
