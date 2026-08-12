'use client';

import React from 'react';
import { Button } from '@coaching-os/ui';
import { Eye, Shield, UserX, UserCheck, Trash2 } from 'lucide-react';
import { StaffRoleBadge, StaffStatusBadge } from './staff-status-badge';
import type { StaffMembershipDTO } from '../types/staff-ui.types';

interface StaffTableProps {
  members: StaffMembershipDTO[];
  currentUserId: string;
  canChangeRole: boolean;
  canUpdateStatus: boolean;
  canRemoveStaff: boolean;
  onViewDetails: (member: StaffMembershipDTO) => void;
  onChangeRole: (member: StaffMembershipDTO) => void;
  onActivate: (member: StaffMembershipDTO) => void;
  onSuspend: (member: StaffMembershipDTO) => void;
  onRemove: (member: StaffMembershipDTO) => void;
}

export function StaffTable({
  members,
  currentUserId,
  canChangeRole,
  canUpdateStatus,
  canRemoveStaff,
  onViewDetails,
  onChangeRole,
  onActivate,
  onSuspend,
  onRemove,
}: StaffTableProps) {
  return (
    <div className="hidden md:block border border-border rounded-lg overflow-hidden bg-card shadow-sm" data-testid="staff-table">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
          <tr>
            <th scope="col" className="px-4 py-3">Member</th>
            <th scope="col" className="px-4 py-3">Email</th>
            <th scope="col" className="px-4 py-3">Role</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-foreground">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const isRemoved = member.status === 'removed';

            return (
              <tr key={member.id} className="hover:bg-muted/30 transition-colors" data-testid={`staff-row-${member.id}`}>
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span>{member.user?.name || member.userId}</span>
                    {isSelf && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">You</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{member.user?.email || 'N/A'}</td>
                <td className="px-4 py-3">
                  <StaffRoleBadge role={member.role} />
                </td>
                <td className="px-4 py-3">
                  <StaffStatusBadge status={member.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(member)}
                      aria-label={`View details for ${member.user?.name || member.userId}`}
                      title="View Details"
                      data-testid={`staff-view-action-${member.id}`}
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </Button>

                    {!isRemoved && (
                      <>
                        {canChangeRole && !isSelf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onChangeRole(member)}
                            aria-label={`Change role for ${member.user?.name || member.userId}`}
                            title="Change Role"
                            data-testid={`staff-role-action-${member.id}`}
                          >
                            <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                          </Button>
                        )}

                        {member.status === 'active' && canRemoveStaff && !isSelf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSuspend(member)}
                            aria-label={`Suspend ${member.user?.name || member.userId}`}
                            title="Suspend Member"
                            data-testid={`staff-suspend-action-${member.id}`}
                          >
                            <UserX className="h-4 w-4 text-amber-600" aria-hidden="true" />
                          </Button>
                        )}

                        {member.status === 'suspended' && canUpdateStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onActivate(member)}
                            aria-label={`Activate ${member.user?.name || member.userId}`}
                            title="Activate Member"
                            data-testid={`staff-activate-action-${member.id}`}
                          >
                            <UserCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                          </Button>
                        )}

                        {canRemoveStaff && !isSelf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemove(member)}
                            aria-label={`Remove ${member.user?.name || member.userId}`}
                            title="Remove Member"
                            data-testid={`staff-remove-action-${member.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
