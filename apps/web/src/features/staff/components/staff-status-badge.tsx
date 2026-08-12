'use client';

import React from 'react';
import { Badge } from '@coaching-os/ui';
import type { StaffRole, StaffStatus } from '../types/staff-ui.types';

interface StaffRoleBadgeProps {
  role: StaffRole;
}

export function StaffRoleBadge({ role }: StaffRoleBadgeProps) {
  switch (role) {
    case 'owner':
      return (
        <Badge variant="default" className="bg-primary text-primary-foreground font-medium">
          Owner
        </Badge>
      );
    case 'teacher':
      return (
        <Badge variant="secondary" className="bg-secondary text-secondary-foreground font-medium">
          Teacher
        </Badge>
      );
    case 'assistant':
      return (
        <Badge variant="outline" className="border-border text-foreground font-medium">
          Assistant
        </Badge>
      );
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}

interface StaffStatusBadgeProps {
  status: StaffStatus;
}

export function StaffStatusBadge({ status }: StaffStatusBadgeProps) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
          Active
        </Badge>
      );
    case 'suspended':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">
          Suspended
        </Badge>
      );
    case 'removed':
      return (
        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 font-medium">
          Removed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
