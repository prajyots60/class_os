'use client';

import * as React from 'react';
import { FeeSummary } from './fee-summary';
import { InvoiceList } from './invoice-list';
import { PaymentList } from './payment-list';
import { ReceiptCard } from './receipt-card';
import { ReceiptDetailModal } from './receipt-detail-modal';
import { Card, CardContent } from '@coaching-os/ui';
import { FileText, ArrowUpRight, ReceiptText, Building2 } from 'lucide-react';
import type {
  ParentStudentBillingDTO,
  ParentReceiptItemDTO,
} from '../../types/parent-ui.types';

interface BillingViewProps {
  billingData: ParentStudentBillingDTO;
}

export function BillingView({ billingData }: BillingViewProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<'invoices' | 'payments' | 'receipts'>('invoices');
  const [selectedReceipt, setSelectedReceipt] = React.useState<ParentReceiptItemDTO | null>(null);

  const { summary, invoices, payments, receipts, student } = billingData;

  return (
    <div className="space-y-4">
      {/* Institute Context Header */}
      <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))] px-1">
        <div className="flex items-center gap-1.5 font-semibold text-[hsl(var(--foreground))]">
          <Building2 className="h-3.5 w-3.5 text-[hsl(var(--primary))]" aria-hidden="true" />
          <span>{student.instituteName}</span>
        </div>
        <span>{student.fullName} ({student.admissionNumber})</span>
      </div>

      {/* Top Fee Summary Banner */}
      <FeeSummary summary={summary} />

      {/* Sub-Tab Navigation Bar */}
      <div className="flex border-b border-[hsl(var(--border))]" role="tablist" aria-label="Billing sections">
        <button
          role="tab"
          aria-selected={activeSubTab === 'invoices'}
          id="subtab-invoices"
          onClick={() => setActiveSubTab('invoices')}
          className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-semibold min-h-[44px] border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
            activeSubTab === 'invoices'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          <span>Invoices ({invoices.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeSubTab === 'payments'}
          id="subtab-payments"
          onClick={() => setActiveSubTab('payments')}
          className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-semibold min-h-[44px] border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
            activeSubTab === 'payments'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          <span>Payments ({payments.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeSubTab === 'receipts'}
          id="subtab-receipts"
          onClick={() => setActiveSubTab('receipts')}
          className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-semibold min-h-[44px] border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
            activeSubTab === 'receipts'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <ReceiptText className="h-4 w-4" aria-hidden="true" />
          <span>Receipts ({receipts.length})</span>
        </button>
      </div>

      {/* Sub-Tab Panels */}
      {activeSubTab === 'invoices' && (
        <div role="tabpanel" id="panel-invoices" aria-labelledby="subtab-invoices">
          <InvoiceList invoices={invoices} instituteName={student.instituteName} />
        </div>
      )}

      {activeSubTab === 'payments' && (
        <div role="tabpanel" id="panel-payments" aria-labelledby="subtab-payments">
          <PaymentList payments={payments} />
        </div>
      )}

      {activeSubTab === 'receipts' && (
        <div role="tabpanel" id="panel-receipts" aria-labelledby="subtab-receipts" className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Official Receipts ({receipts.length})
          </h3>

          {receipts.length === 0 ? (
            <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6 sm:p-8">
              <CardContent className="space-y-2 pt-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))]">
                  <ReceiptText className="h-5 w-5" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  No Receipts Issued Yet
                </h4>
                <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                  Official receipts will be generated automatically as payments are recorded by the institute.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {receipts.map((rec) => (
                <ReceiptCard
                  key={rec.id}
                  receipt={rec}
                  onSelect={(selected) => setSelectedReceipt(selected)}
                />
              ))}
            </div>
          )}

          {/* Receipt Modal */}
          <ReceiptDetailModal
            receipt={selectedReceipt}
            studentId={student.id}
            studentName={student.fullName}
            instituteName={student.instituteName}
            onClose={() => setSelectedReceipt(null)}
          />
        </div>
      )}
    </div>
  );
}
