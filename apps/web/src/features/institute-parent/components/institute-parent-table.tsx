import * as React from 'react';
import { Card, Button, Badge } from '@coaching-os/ui';
import { Eye, Edit2, Archive, Phone } from 'lucide-react';
import { InstituteParentStatusBadge } from './institute-parent-status-badge';
import type { InstituteParentDTO } from '../types/institute-parent-ui.types';

export interface InstituteParentTableProps {
  parents: InstituteParentDTO[];
  canUpdate: boolean;
  canArchive: boolean;
  onViewDetails: (parent: InstituteParentDTO) => void;
  onEdit: (parent: InstituteParentDTO) => void;
  onArchive: (parent: InstituteParentDTO) => void;
}

/**
 * InstituteParentTable — desktop table presentation for parent CRM list with accessible semantics.
 */
export function InstituteParentTable({
  parents,
  canUpdate,
  canArchive,
  onViewDetails,
  onEdit,
  onArchive,
}: InstituteParentTableProps) {
  return (
    <Card className="overflow-hidden border-[hsl(var(--border))] shadow-sm" data-testid="parent-table-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse" aria-label="Institute parents table">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] uppercase font-semibold text-[10px] tracking-wider">
              <th scope="col" className="px-4 py-3">Parent Name</th>
              <th scope="col" className="px-4 py-3">Contact Phone</th>
              <th scope="col" className="px-4 py-3">Global Identity</th>
              <th scope="col" className="px-4 py-3">Institute Standing</th>
              <th scope="col" className="px-4 py-3">Internal Notes</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {parents.map((parent) => {
              const identity = parent.parentIdentity;
              const displayName = identity?.name || 'Unnamed Parent';
              const phone = identity?.phone || '—';
              const globalStatus = identity?.status || 'active';

              return (
                <tr
                  key={parent.id}
                  className="hover:bg-[hsl(var(--muted)/0.2)] transition-colors"
                  data-testid={`parent-row-${parent.id}`}
                >
                  {/* Name + Avatar */}
                  <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                    <div className="flex items-center space-x-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-xs font-bold">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate font-semibold">{displayName}</span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] font-mono text-[11px]">
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3 w-3 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                      <span>{phone}</span>
                    </div>
                  </td>

                  {/* Global Identity Standing */}
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wider font-medium border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
                    >
                      Global: {globalStatus}
                    </Badge>
                  </td>

                  {/* Institute Standing */}
                  <td className="px-4 py-3">
                    <InstituteParentStatusBadge status={parent.status} />
                  </td>

                  {/* Internal Notes */}
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] max-w-xs truncate italic">
                    {parent.notes || <span className="text-[hsl(var(--muted-foreground)/0.5)] font-normal not-italic">No notes</span>}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(parent)}
                        className="h-7 px-2 text-xs border-[hsl(var(--border))]"
                        aria-label={`View details for ${displayName}`}
                        data-testid={`view-parent-${parent.id}`}
                      >
                        <Eye className="h-3 w-3 mr-1" aria-hidden="true" />
                        Details
                      </Button>

                      {canUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(parent)}
                          className="h-7 px-2 text-xs border-[hsl(var(--border))]"
                          aria-label={`Edit ${displayName}`}
                          data-testid={`edit-parent-${parent.id}`}
                        >
                          <Edit2 className="h-3 w-3 mr-1" aria-hidden="true" />
                          Edit
                        </Button>
                      )}

                      {canArchive && parent.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onArchive(parent)}
                          className="h-7 px-2 text-xs text-[hsl(var(--destructive))] border-[hsl(var(--border))] hover:bg-[hsl(var(--destructive)/0.1)]"
                          aria-label={`Archive ${displayName}`}
                          data-testid={`archive-parent-${parent.id}`}
                        >
                          <Archive className="h-3 w-3 mr-1" aria-hidden="true" />
                          Archive
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
