import * as React from 'react';
import { Button, Input, Skeleton } from '@coaching-os/ui';
import type { ReceiptDTO } from '../types';
import { formatDate } from '../utils/formatters';

export interface ReceiptsViewProps {
  receipts: ReceiptDTO[];
  loading: boolean;
  onSelectReceipt: (receipt: ReceiptDTO) => void;
}

export function ReceiptsView({ receipts, loading, onSelectReceipt }: ReceiptsViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredReceipts = React.useMemo(() => {
    if (!searchQuery.trim()) return receipts;
    const q = searchQuery.toLowerCase();
    return receipts.filter(
      (r) =>
        r.receiptNumber.toLowerCase().includes(q) ||
        r.paymentId.toLowerCase().includes(q) ||
        (r.studentName && r.studentName.toLowerCase().includes(q))
    );
  }, [receipts, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 border border-border rounded-lg shadow-sm">
        <Input
          placeholder="Search by receipt # or payment ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-72 text-xs"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-card/40">
          <p className="text-sm font-medium text-foreground">No Receipts Issued</p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery ? 'Try adjusting your search query.' : 'No receipts have been issued yet.'}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-3">Receipt Number</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Issued Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition">
                    <td
                      className="p-3 font-mono font-bold text-primary cursor-pointer hover:underline"
                      onClick={() => onSelectReceipt(r)}
                    >
                      {r.receiptNumber}
                    </td>
                    <td className="p-3 font-semibold text-foreground">{r.studentName || 'Student Context'}</td>
                    <td className="p-3 font-mono text-muted-foreground">{r.paymentId.slice(0, 8)}...</td>
                    <td className="p-3 text-muted-foreground">{formatDate(r.generatedAt)}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSelectReceipt(r)}>
                        View Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
