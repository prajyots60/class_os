'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Skeleton } from '@coaching-os/ui';
import { v1BillingClient } from '../api/v1-billing-client';
import type { BillingPlanDTO, InvoiceDTO, PaymentDTO, ReceiptDTO } from '../types';
import { BillingOverviewView } from './BillingOverviewView';
import { BillingPlansView } from './BillingPlansView';
import { BillingPlanFormModal } from './BillingPlanFormModal';
import { BillingPlanUpdateModal } from './BillingPlanUpdateModal';
import { InvoicesView } from './InvoicesView';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { GenerateInvoiceModal } from './GenerateInvoiceModal';
import { PaymentsView } from './PaymentsView';
import { RecordPaymentModal } from './RecordPaymentModal';
import { ReceiptsView } from './ReceiptsView';
import { ReceiptDetailsModal } from './ReceiptDetailsModal';

export type BillingTab = 'overview' | 'plans' | 'invoices' | 'payments' | 'receipts';

export interface BillingWorkspaceProps {
  userCapabilities?: string[];
  initialTab?: BillingTab;
}

function BillingWorkspaceInner({
  userCapabilities = [
    'billing:read',
    'billing:write',
    'payment:record',
    'receipt:read',
    'receipt:issue',
  ],
  initialTab = 'overview',
}: BillingWorkspaceProps) {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') as BillingTab | null;
  const urlInvoiceId = searchParams.get('invoiceId');
  const urlAction = searchParams.get('action');

  const [activeTab, setActiveTab] = React.useState<BillingTab>(() => {
    if (urlTab && ['overview', 'plans', 'invoices', 'payments', 'receipts'].includes(urlTab)) {
      return urlTab;
    }
    if (urlInvoiceId || urlAction === 'record-payment') {
      return 'invoices';
    }
    return initialTab;
  });

  // Capability Flags
  const canReadBilling = userCapabilities.includes('billing:read');
  const canWriteBilling = userCapabilities.includes('billing:write');
  const canRecordPayment = userCapabilities.includes('payment:record');
  const canReadReceipt = userCapabilities.includes('receipt:read');
  const canIssueReceipt = userCapabilities.includes('receipt:issue');

  // State
  const [plans, setPlans] = React.useState<BillingPlanDTO[]>([]);
  const [invoices, setInvoices] = React.useState<InvoiceDTO[]>([]);
  const [payments, setPayments] = React.useState<PaymentDTO[]>([]);
  const [receipts, setReceipts] = React.useState<ReceiptDTO[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Modal States
  const [isCreatePlanOpen, setIsCreatePlanOpen] = React.useState(false);
  const [selectedPlanForUpdate, setSelectedPlanForUpdate] = React.useState<BillingPlanDTO | null>(null);
  const [isGenerateInvoiceOpen, setIsGenerateInvoiceOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceDTO | null>(null);
  const [recordPaymentInvoice, setRecordPaymentInvoice] = React.useState<InvoiceDTO | null>(null);
  const [selectedReceipt, setSelectedReceipt] = React.useState<ReceiptDTO | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = React.useCallback(() => {
    if (!canReadBilling) return;
    Promise.all([
      v1BillingClient.listBillingPlans({ limit: 100 }).catch(() => ({ items: [] })),
      v1BillingClient.listInvoices({ limit: 100 }).catch(() => ({ items: [] })),
      v1BillingClient.listPayments({ limit: 100 }).catch(() => ({ items: [] })),
    ])
      .then(([plansRes, invoicesRes, paymentsRes]) => {
        const loadedInvoices = invoicesRes.items || [];
        setPlans(plansRes.items || []);
        setInvoices(loadedInvoices);
        setPayments(paymentsRes.items || []);

        const mappedReceipts: ReceiptDTO[] = (paymentsRes.items || [])
          .filter((p) => p.receiptNumber && p.receiptId)
          .map((p) => ({
            id: p.receiptId!,
            instituteId: p.instituteId,
            paymentId: p.id,
            receiptNumber: p.receiptNumber!,
            amount: p.amount,
            paymentMode: p.paymentMode,
            studentName: p.studentName,
            generatedAt: p.receivedOn,
            downloadUrl: null,
          }));
        setReceipts(mappedReceipts);

        // Auto-open modal if URL parameters passed
        if (urlInvoiceId) {
          const match = loadedInvoices.find((i) => i.id === urlInvoiceId);
          if (match) {
            if (urlAction === 'record-payment' && canRecordPayment) {
              setRecordPaymentInvoice(match);
            } else {
              setSelectedInvoice(match);
            }
          }
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [canReadBilling, urlInvoiceId, urlAction, canRecordPayment]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (!canReadBilling) {
    return (
      <div className="p-8 text-center" data-testid="billing-access-denied">
        <Card className="p-6 border-rose-200 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900 max-w-md mx-auto">
          <h2 className="font-bold text-lg">Access Denied (403)</h2>
          <p className="text-xs mt-1">
            You do not have the required capability (<code className="font-mono">billing:read</code>) to access the Fees &amp; Billing workspace.
          </p>
        </Card>
      </div>
    );
  }

  const handleIssueReceipt = async (paymentId: string) => {
    if (!canIssueReceipt) return;
    try {
      const receipt = await v1BillingClient.generateReceipt({ paymentId });
      showToast(`Receipt ${receipt.receiptNumber} issued successfully.`);
      setSelectedReceipt(receipt);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to issue receipt.';
      showToast(msg);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="billing-workspace">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          data-testid="billing-toast"
          className="fixed bottom-4 right-4 z-50 rounded-md bg-slate-900 text-white px-4 py-2.5 text-xs shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2"
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fees &amp; Billing Workspace</h1>
          <p className="text-xs text-muted-foreground">
            Manage billing plans, track invoices, record payments, and issue receipts
          </p>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-6 text-sm font-medium" aria-label="Billing Workspace Tabs">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'plans', label: 'Billing Plans' },
              { id: 'invoices', label: 'Invoices' },
              { id: 'payments', label: 'Payments' },
              { id: 'receipts', label: 'Receipts' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as BillingTab)}
              className={`py-2.5 border-b-2 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content Views */}
      {activeTab === 'overview' && (
        <BillingOverviewView
          invoices={invoices}
          payments={payments}
          loading={loading}
          canWriteBilling={canWriteBilling}
          canRecordPayment={canRecordPayment}
          onOpenCreatePlan={() => setIsCreatePlanOpen(true)}
          onOpenGenerateInvoice={() => setIsGenerateInvoiceOpen(true)}
          onSelectInvoice={(inv) => setSelectedInvoice(inv)}
          onSelectPayment={() => {}}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === 'plans' && (
        <BillingPlansView
          plans={plans}
          loading={loading}
          canWriteBilling={canWriteBilling}
          onOpenCreatePlan={() => setIsCreatePlanOpen(true)}
          onSelectPlan={(plan: BillingPlanDTO) => setSelectedPlanForUpdate(plan)}
        />
      )}

      {activeTab === 'invoices' && (
        <InvoicesView
          invoices={invoices}
          loading={loading}
          canWriteBilling={canWriteBilling}
          canRecordPayment={canRecordPayment}
          onOpenGenerateInvoice={() => setIsGenerateInvoiceOpen(true)}
          onSelectInvoice={(inv) => setSelectedInvoice(inv)}
          onRecordPayment={(inv) => setRecordPaymentInvoice(inv)}
        />
      )}

      {activeTab === 'payments' && (
        <PaymentsView
          payments={payments}
          loading={loading}
          canIssueReceipt={canIssueReceipt}
          onIssueReceipt={handleIssueReceipt}
          onSelectPayment={() => {}}
        />
      )}

      {activeTab === 'receipts' && (
        <ReceiptsView
          receipts={receipts}
          loading={loading}
          onSelectReceipt={(r) => setSelectedReceipt(r)}
        />
      )}

      {/* Modals */}
      <BillingPlanFormModal
        isOpen={isCreatePlanOpen}
        onClose={() => setIsCreatePlanOpen(false)}
        onSuccess={() => {
          setIsCreatePlanOpen(false);
          showToast('Billing plan created successfully.');
          loadData();
        }}
      />

      <BillingPlanUpdateModal
        plan={selectedPlanForUpdate}
        isOpen={!!selectedPlanForUpdate}
        onClose={() => setSelectedPlanForUpdate(null)}
        onSuccess={() => {
          setSelectedPlanForUpdate(null);
          showToast('Billing plan updated successfully.');
          loadData();
        }}
      />

      <GenerateInvoiceModal
        isOpen={isGenerateInvoiceOpen}
        onClose={() => setIsGenerateInvoiceOpen(false)}
        onSuccess={() => {
          setIsGenerateInvoiceOpen(false);
          showToast('Invoice generated successfully.');
          loadData();
        }}
      />

      <InvoiceDetailsModal
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        canRecordPayment={canRecordPayment}
        onClose={() => setSelectedInvoice(null)}
        onRecordPayment={(inv) => {
          setSelectedInvoice(null);
          setRecordPaymentInvoice(inv);
        }}
      />

      <RecordPaymentModal
        invoice={recordPaymentInvoice}
        isOpen={!!recordPaymentInvoice}
        onClose={() => setRecordPaymentInvoice(null)}
        onSuccess={(payment) => {
          setRecordPaymentInvoice(null);
          showToast(`Payment recorded. Receipt: ${payment.receiptNumber || 'N/A'}`);
          loadData();
        }}
      />

      <ReceiptDetailsModal
        receipt={selectedReceipt}
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
}

export function BillingWorkspace(props: BillingWorkspaceProps) {
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <BillingWorkspaceInner {...props} />
    </React.Suspense>
  );
}
