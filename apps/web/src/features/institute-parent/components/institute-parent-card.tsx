import * as React from 'react';
import { Card, Button } from '@coaching-os/ui';
import { Phone, FileText, Eye, Edit2, Archive } from 'lucide-react';
import { InstituteParentStatusBadge } from './institute-parent-status-badge';
import type { InstituteParentDTO } from '../types/institute-parent-ui.types';

export interface InstituteParentCardProps {
  parent: InstituteParentDTO;
  canUpdate: boolean;
  canArchive: boolean;
  onViewDetails: (parent: InstituteParentDTO) => void;
  onEdit: (parent: InstituteParentDTO) => void;
  onArchive: (parent: InstituteParentDTO) => void;
}

/**
 * InstituteParentCard — accessible mobile card presentation for single parent CRM record.
 */
export function InstituteParentCard({
  parent,
  canUpdate,
  canArchive,
  onViewDetails,
  onEdit,
  onArchive,
}: InstituteParentCardProps) {
  const identity = parent.parentIdentity;
  const displayName = identity?.name || 'Unnamed Parent';
  const phone = identity?.phone || 'No phone recorded';

  return (
    <Card
      className="p-4 border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3 shadow-sm"
      data-testid={`parent-card-${parent.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-sm font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
              {displayName}
            </h4>
            <div className="flex items-center text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              <Phone className="h-3 w-3 mr-1 shrink-0" aria-hidden="true" />
              <span className="font-mono text-[11px] truncate">{phone}</span>
            </div>
          </div>
        </div>

        <InstituteParentStatusBadge status={parent.status} />
      </div>

      {parent.notes && (
        <div className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)] p-2 rounded border border-[hsl(var(--border)/0.5)]">
          <div className="flex items-center text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-0.5">
            <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
            Internal Notes
          </div>
          <p className="line-clamp-2 italic">{parent.notes}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(parent)}
          className="h-8 text-xs border-[hsl(var(--border))]"
          aria-label={`View details for ${displayName}`}
          data-testid={`view-parent-${parent.id}`}
        >
          <Eye className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          Details
        </Button>

        {canUpdate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(parent)}
            className="h-8 text-xs border-[hsl(var(--border))]"
            aria-label={`Edit ${displayName}`}
            data-testid={`edit-parent-${parent.id}`}
          >
            <Edit2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Edit
          </Button>
        )}

        {canArchive && parent.status === 'active' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onArchive(parent)}
            className="h-8 text-xs text-[hsl(var(--destructive))] border-[hsl(var(--border))] hover:bg-[hsl(var(--destructive)/0.1)]"
            aria-label={`Archive ${displayName}`}
            data-testid={`archive-parent-${parent.id}`}
          >
            <Archive className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Archive
          </Button>
        )}
      </div>
    </Card>
  );
}
