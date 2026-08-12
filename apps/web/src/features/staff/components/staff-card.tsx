'use client';

import React from 'react';
import { Card, CardContent, Button } from '@coaching-os/ui';
import { Eye, Shield, UserX, UserCheck, Trash2 } from 'lucide-react';
import { StaffRoleBadge, StaffStatusBadge } from './staff-status-badge';
import type { StaffMembershipDTO } from '../types/staff-ui.types';

interface StaffCardListProps {
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

export function StaffCardList({
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
}: StaffCardListProps) {
  return (
    <div className="block md:hidden space-y-3" data-testid="staff-card-list">
      {members.map((member) => {
        const isSelf = member.userId === currentUserId;
        const isRemoved = member.status === 'removed';

        return (
          <Card key={member.id} className="border-border bg-card shadow-sm" data-testid="staff-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground text-base">
                    {member.user?.name || member.userId}
                    {isSelf && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">You</span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground break-all">{member.user?.email || 'N/A'}</p>
                </div>
                <StaffStatusBadge status={member.status} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-muted-foreground">
                  Role: <StaffRoleBadge role={member.role} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(member)}
                  className="h-8 text-xs px-2.5"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Details
                </Button>

                {!isRemoved && (
                  <>
                    {canChangeRole && !isSelf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onChangeRole(member)}
                        className="h-8 text-xs px-2.5"
                      >
                        <Shield className="h-3.5 w-3.5 mr-1 text-primary" aria-hidden="true" />
                        Role
                      </Button>
                    )}

                    {member.status === 'active' && canRemoveStaff && !isSelf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSuspend(member)}
                        className="h-8 text-xs px-2.5 text-amber-700 hover:text-amber-800"
                      >
                        <UserX className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                        Suspend
                      </Button>
                    )}

                    {member.status === 'suspended' && canUpdateStatus && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onActivate(member)}
                        className="h-8 text-xs px-2.5 text-emerald-700 hover:text-emerald-800"
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                        Activate
                      </Button>
                    )}

                    {canRemoveStaff && !isSelf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(member)}
                        className="h-8 text-xs px-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
