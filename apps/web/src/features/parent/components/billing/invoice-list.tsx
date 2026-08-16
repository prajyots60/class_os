'use client';

import * as React from 'react';
import { Card, CardContent, Input, Button } from '@coaching-os/ui';
import { Search, CreditCard } from 'lucide-react';
import { InvoiceCard } from './invoice-card';
import { InvoiceDetailModal } from './invoice-detail-modal';
import type { ParentInvoiceItemDTO } from '../../types/parent-ui.types';

interface InvoiceListProps {
  invoices: ParentInvoiceItemDTO[];
  instituteName?: string;
}

export function InvoiceList({ invoices, instituteName }: InvoiceListProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'partial' | 'paid'>('all');
  const [selectedInvoice, setSelectedInvoice] = React.useState<ParentInvoiceItemDTO | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch = inv.batchName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending'
        ? inv.status === 'pending'
        : statusFilter === 'partial'
        ? inv.status === 'partial'
        : inv.status === 'paid';

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search invoice by batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 min-h-[44px]"
            aria-label="Search invoice by batch"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Invoice status filter">
          {(['all', 'pending', 'partial', 'paid'] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter)}
              className="min-h-[44px] text-xs capitalize px-3"
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Invoice List Grid */}
      {filteredInvoices.length === 0 ? (
        <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6 sm:p-8">
          <CardContent className="space-y-2 pt-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))]">
              <CreditCard className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {searchTerm || statusFilter !== 'all'
                ? 'No Matching Invoices Found'
                : 'No Fee Invoices Issued Yet'}
            </h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Invoices will appear here when issued by the coaching institute.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredInvoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              onSelect={(selected) => setSelectedInvoice(selected)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        instituteName={instituteName}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
