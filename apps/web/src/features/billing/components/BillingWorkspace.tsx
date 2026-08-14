'use client';

import * as React from 'react';
import { Card } from '@coaching-os/ui';
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

export function BillingWorkspace({
  userCapabilities = [
    'billing:read',
    'billing:write',
    'payment:record',
    'receipt:read',
    'receipt:issue',
  ],
  initialTab = 'overview',
}: BillingWorkspaceProps) {
  const [activeTab, setActiveTab] = React.useState<BillingTab>(initialTab);

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
        setPlans(plansRes.items || []);
        setInvoices(invoicesRes.items || []);
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
      })
      .finally(() => {
        setLoading(false);
      });
  }, [canReadBilling]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (!canReadBilling) {
    return (
      <div className="p-8 text-center" data-testid="billing-access-denied">
        <Card className="p-6 border-rose-200 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900 max-w-md mx-auto">
          <h2 className="font-bold text-lg">Access Denied (403)</h2>
          <p className="text-xs mt-1">
            You do not have the required capability (<code className="font-mono">billing:read</code>) to access the Fees & Billing workspace.
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
          <h1 className="text-2xl font-bold text-foreground">Fees & Billing Workspace</h1>
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
          onSelectPayment={(pay) => {
            if (pay.receiptId && canReadReceipt) {
              v1BillingClient.getReceiptById(pay.receiptId).then(setSelectedReceipt).catch(() => {});
            }
          }}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === 'plans' && (
        <BillingPlansView
          plans={plans}
          loading={loading}
          canWriteBilling={canWriteBilling}
          onOpenCreatePlan={() => setIsCreatePlanOpen(true)}
          onSelectPlan={(plan) => setSelectedPlanForUpdate(plan)}
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
          onSelectPayment={(pay) => {
            if (pay.receiptId && canReadReceipt) {
              v1BillingClient.getReceiptById(pay.receiptId).then(setSelectedReceipt).catch(() => {});
            }
          }}
          onIssueReceipt={handleIssueReceipt}
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
      {isCreatePlanOpen && (
        <BillingPlanFormModal
          isOpen={isCreatePlanOpen}
          onClose={() => setIsCreatePlanOpen(false)}
          onSuccess={() => {
            showToast(`Billing plan created.`);
            loadData();
          }}
        />
      )}

      {selectedPlanForUpdate && (
        <BillingPlanUpdateModal
          isOpen={!!selectedPlanForUpdate}
          plan={selectedPlanForUpdate}
          onClose={() => setSelectedPlanForUpdate(null)}
          onSuccess={() => {
            showToast(`Billing plan updated.`);
            loadData();
          }}
        />
      )}

      {isGenerateInvoiceOpen && (
        <GenerateInvoiceModal
          isOpen={isGenerateInvoiceOpen}
          onClose={() => setIsGenerateInvoiceOpen(false)}
          onSuccess={(inv) => {
            showToast(`Invoice ${inv.invoiceNumber} generated.`);
            loadData();
          }}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailsModal
          isOpen={!!selectedInvoice}
          invoice={selectedInvoice}
          payments={payments.filter((p) => p.invoiceId === selectedInvoice.id)}
          canRecordPayment={canRecordPayment}
          onClose={() => setSelectedInvoice(null)}
          onRecordPayment={(inv) => setRecordPaymentInvoice(inv)}
        />
      )}

      {recordPaymentInvoice && (
        <RecordPaymentModal
          isOpen={!!recordPaymentInvoice}
          invoice={recordPaymentInvoice}
          onClose={() => setRecordPaymentInvoice(null)}
          onSuccess={(payment) => {
            showToast(`Payment of ₹${payment.amount.toLocaleString('en-IN')} recorded.`);
            loadData();
          }}
        />
      )}

      {selectedReceipt && (
        <ReceiptDetailsModal
          isOpen={!!selectedReceipt}
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
