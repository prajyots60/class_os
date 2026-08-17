'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, buttonVariants } from '@coaching-os/ui';
import { AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import type { OwnerPendingFeeSummaryDTO, OwnerOperationalSummaryDTO } from '@coaching-os/administration';

export interface OwnerOperationalAttentionProps {
  fees: OwnerPendingFeeSummaryDTO;
  operational: OwnerOperationalSummaryDTO;
}

export function OwnerOperationalAttention({ fees, operational }: OwnerOperationalAttentionProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Card 1: Pending Fees & Overdue Summary */}
      <Card className="shadow-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between">
        <div>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-md bg-amber-500/10 text-amber-600">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[hsl(var(--foreground))]">
                  Fee Collection Status
                </CardTitle>
                <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                  Outstanding fee balances &amp; overdue invoices
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-3">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Total Pending Fees
              </span>
              <p className="text-2xl font-extrabold text-[hsl(var(--foreground))] mt-1">
                {formatCurrency(fees.pendingAmount)}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))] px-1">
              <span>{fees.pendingInvoiceCount} pending invoices</span>
              <span className="font-semibold text-amber-700">{fees.overdueStudentCount} students overdue</span>
            </div>
          </CardContent>
        </div>
        <CardFooter className="pt-2 border-t border-[hsl(var(--border))]">
          <Link
            href={fees.targetPath || '/billing?tab=invoices&status=pending'}
            className={buttonVariants({ variant: 'outline', size: 'default' }) + ' w-full justify-between min-h-[44px]'}
            aria-label="Navigate to Billing workspace to manage invoices"
          >
            <span className="font-semibold text-xs">Manage Fee Invoices</span>
            <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
          </Link>
        </CardFooter>
      </Card>

      {/* Card 2: Today's Operational Schedule */}
      <Card className="shadow-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between">
        <div>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-md bg-blue-500/10 text-blue-600">
                <Calendar className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[hsl(var(--foreground))]">
                  Today&apos;s Operational Schedule
                </CardTitle>
                <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                  Scheduled classes and examinations for today
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-3">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Scheduled Classes
              </span>
              <p className="text-2xl font-extrabold text-[hsl(var(--foreground))] mt-1">
                {operational.scheduledClassesCount}
              </p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-3">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Scheduled Tests
              </span>
              <p className="text-2xl font-extrabold text-[hsl(var(--foreground))] mt-1">
                {operational.scheduledTestsCount}
              </p>
            </div>
          </CardContent>
        </div>
        <CardFooter className="pt-2 border-t border-[hsl(var(--border))]">
          <Link
            href="/academics?tab=sessions"
            className={buttonVariants({ variant: 'outline', size: 'default' }) + ' w-full justify-between min-h-[44px]'}
            aria-label="Navigate to Academics workspace to view full schedule"
          >
            <span className="font-semibold text-xs">View Full Schedule</span>
            <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
          </Link>

        </CardFooter>
      </Card>
    </div>
  );
}
