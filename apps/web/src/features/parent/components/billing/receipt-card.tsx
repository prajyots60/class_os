'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@coaching-os/ui';
import { Calendar, ReceiptText, ExternalLink, CreditCard } from 'lucide-react';
import type { ParentReceiptItemDTO } from '../../types/parent-ui.types';

interface ReceiptCardProps {
  receipt: ParentReceiptItemDTO;
  onSelect: (item: ParentReceiptItemDTO) => void;
}

export function ReceiptCard({ receipt, onSelect }: ReceiptCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getModeLabel = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'upi':
        return 'UPI';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'cash':
        return 'Cash';
      default:
        return mode.toUpperCase();
    }
  };

  const generatedDateFormatted = receipt.generatedAt
    ? new Date(receipt.generatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  const ariaText = `Receipt ${receipt.receiptNumber} for ${formatCurrency(receipt.amount)} paid via ${getModeLabel(receipt.paymentMode)} on ${generatedDateFormatted}`;

  return (
    <Card
      className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm hover:border-[hsl(var(--primary)/0.5)] transition-all"
      aria-label={ariaText}
    >
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="text-[10px] font-bold">
            <ReceiptText className="h-3 w-3 mr-1 inline text-[hsl(var(--primary))]" aria-hidden="true" />
            {receipt.receiptNumber}
          </Badge>
          <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {generatedDateFormatted}
          </span>
        </div>

        <CardTitle className="text-base font-bold text-[hsl(var(--foreground))] pt-1">
          {formatCurrency(receipt.amount)}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-1 space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-2.5 text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">Payment Method</span>
          <span className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-1">
            <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
            {getModeLabel(receipt.paymentMode)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border)/0.5)]">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Official Receipt
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect(receipt)}
            className="min-h-[44px] min-w-[44px] gap-1 text-xs text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]"
            aria-label={`View or print receipt ${receipt.receiptNumber}`}
          >
            <span>View Receipt</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
