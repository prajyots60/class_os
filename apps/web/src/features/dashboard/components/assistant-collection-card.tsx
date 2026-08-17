'use client';

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  buttonVariants,
} from '@coaching-os/ui';
import { IndianRupee, Receipt, ArrowRight, CreditCard } from 'lucide-react';
import type { AssistantCollectionSummaryDTO } from '@coaching-os/administration';

export interface AssistantCollectionCardProps {
  collection: AssistantCollectionSummaryDTO;
}

export function AssistantCollectionCard({ collection }: AssistantCollectionCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <Card className="shadow-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600">
                <IndianRupee className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-[hsl(var(--foreground))]">
                  Today&apos;s Collection
                </CardTitle>
                <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                  Payments collected in institute local time today
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {/* Primary metric — collection amount */}
          <div
            className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4"
            data-testid="collection-amount"
          >
            <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
              Collected Today
            </p>
            <p className="text-4xl font-extrabold text-[hsl(var(--foreground))] mt-1 break-all">
              {formatCurrency(collection.collectedTodayAmount)}
            </p>
          </div>

          {/* Secondary metrics row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Transaction count */}
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-3">
              <div className="flex items-center space-x-1.5 mb-1">
                <CreditCard className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                  Transactions
                </span>
              </div>
              <p
                className="text-2xl font-bold text-[hsl(var(--foreground))]"
                data-testid="transaction-count"
              >
                {collection.transactionCount}
              </p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                {collection.transactionCount === 1 ? 'payment today' : 'payments today'}
              </p>
            </div>

            {/* Pending receipt count */}
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-3">
              <div className="flex items-center space-x-1.5 mb-1">
                <Receipt className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                  Pending Receipts
                </span>
              </div>
              <p
                className="text-2xl font-bold text-[hsl(var(--foreground))]"
                data-testid="pending-receipt-count"
              >
                {collection.pendingReceiptCount}
              </p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                {collection.pendingReceiptCount === 1 ? 'receipt unissued' : 'receipts unissued'}
              </p>
            </div>
          </div>
        </CardContent>
      </div>

      <CardFooter className="pt-2 border-t border-[hsl(var(--border))]">
        <Link
          href={collection.targetPath || '/billing?tab=payments'}
          className={buttonVariants({ variant: 'outline', size: 'default' }) + ' w-full justify-between min-h-[44px]'}
          aria-label="Navigate to Billing workspace to view collections and receipts"
        >

          <span className="font-semibold text-xs">View Billing &amp; Receipts</span>
          <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
