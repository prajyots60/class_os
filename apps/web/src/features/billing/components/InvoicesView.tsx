import * as React from 'react';
import { Button } from '@coaching-os/ui';
import { InvoiceOperationalTable, type InvoiceRowItem } from './invoice-operational-table';
import type { InvoiceDTO, InvoiceStatus } from '../types';

export interface InvoicesViewProps {
  invoices: InvoiceDTO[];
  loading: boolean;
  canWriteBilling: boolean;
  canRecordPayment: boolean;
  onOpenGenerateInvoice: () => void;
  onSelectInvoice: (inv: InvoiceDTO) => void;
  onRecordPayment: (inv: InvoiceDTO) => void;
}

export function InvoicesView({
  invoices,
  canWriteBilling,
  canRecordPayment,
  onOpenGenerateInvoice,
  onSelectInvoice,
  onRecordPayment,
}: InvoicesViewProps) {
  const rowToDto = (row: InvoiceRowItem): InvoiceDTO => {
    const existing = invoices.find((i) => i.id === row.id);
    if (existing) return existing;

    return {
      id: row.id,
      instituteId: '',
      billingPlanId: '',
      studentId: '',
      studentName: row.studentName,
      invoiceNumber: row.invoiceNumber,
      amount: row.amount,
      paidAmount: row.paidAmount,
      outstanding: row.outstandingAmount,
      dueDate: row.dueDateIso,
      status: row.status as InvoiceStatus,
      isOverdue: false,
      createdAt: row.createdAtIso,
      updatedAt: row.createdAtIso,
    };
  };

  return (
    <div className="space-y-4" data-testid="invoices-view">
      {canWriteBilling && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onOpenGenerateInvoice} className="min-h-[44px]">
            ⚡ Generate Invoice
          </Button>
        </div>
      )}

      {/* Server-Side TanStack Operational Table */}
      <InvoiceOperationalTable
        canRecordPayment={canRecordPayment}
        onViewDetails={(row) => onSelectInvoice(rowToDto(row))}
        onRecordPayment={(row) => onRecordPayment(rowToDto(row))}
      />
    </div>
  );
}
