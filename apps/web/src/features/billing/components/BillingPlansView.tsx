import * as React from 'react';
import { Button, Input, Skeleton } from '@coaching-os/ui';
import { FeeTypeBadge } from './BillingStatusBadge';
import type { BillingPlanDTO } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export interface BillingPlansViewProps {
  plans: BillingPlanDTO[];
  loading: boolean;
  canWriteBilling: boolean;
  onOpenCreatePlan: () => void;
  onSelectPlan: (plan: BillingPlanDTO) => void;
}

export function BillingPlansView({
  plans,
  loading,
  canWriteBilling,
  onOpenCreatePlan,
  onSelectPlan,
}: BillingPlansViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredPlans = React.useMemo(() => {
    if (!searchQuery.trim()) return plans;
    const q = searchQuery.toLowerCase();
    return plans.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.enrollmentId.toLowerCase().includes(q) ||
        (p.studentName && p.studentName.toLowerCase().includes(q))
    );
  }, [plans, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-sm">
          <Input
            placeholder="Search plans by student or enrollment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs"
          />
        </div>
        {canWriteBilling && (
          <Button size="sm" onClick={onOpenCreatePlan}>
            + Create Billing Plan
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-card/40">
          <p className="text-sm font-medium text-foreground">No Billing Plans Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery ? 'Try adjusting your search query.' : 'No billing plans have been created yet.'}
          </p>
          {canWriteBilling && !searchQuery && (
            <Button size="sm" variant="outline" className="mt-4" onClick={onOpenCreatePlan}>
              Create First Billing Plan
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
          {/* Responsive Desktop Table / Mobile Cards */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-3">Plan / Enrollment ID</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Fee Type</th>
                  <th className="p-3">Total Obligation</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">Installments</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-muted/30 transition">
                    <td className="p-3 font-mono font-medium text-foreground">{plan.id.slice(0, 8)}...</td>
                    <td className="p-3 font-semibold text-foreground">
                      {plan.studentName || 'Enrollment Context'}
                    </td>
                    <td className="p-3">
                      <FeeTypeBadge type={plan.feeType} />
                    </td>
                    <td className="p-3 font-bold text-foreground">{formatCurrency(plan.totalAmount)}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(plan.billingStartDate)}</td>
                    <td className="p-3 text-muted-foreground">
                      {plan.installmentCount ? `${plan.installmentCount} payments` : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSelectPlan(plan)}>
                        View Rules
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
