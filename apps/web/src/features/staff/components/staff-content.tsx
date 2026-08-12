'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getCapabilitiesForRole } from '@coaching-os/identity/client';
import { Card, CardContent, Alert, AlertTitle, AlertDescription, Button } from '@coaching-os/ui';
import { ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';

import { StaffHeader } from './staff-header';
import { StaffSkeleton } from './staff-skeleton';
import { StaffEmptyState } from './staff-empty-state';
import { StaffTable } from './staff-table';
import { StaffCardList } from './staff-card';
import { StaffDetailsModal } from './staff-details-modal';
import { StaffInviteModal } from './staff-invite-modal';
import { StaffRoleModal } from './staff-role-modal';
import { StaffStatusModal } from './staff-status-modal';
import { StaffRemoveModal } from './staff-remove-modal';

import {
  fetchStaffList,
  inviteStaffMember,
  updateStaffRole,
  activateStaffMember,
  suspendStaffMember,
  removeStaffMember,
} from '../api/staff-api';

import type {
  StaffMembershipDTO,
  StaffFilterState,
  StaffRole,
  InviteStaffFormValues,
} from '../types/staff-ui.types';

export function StaffWorkspaceContent() {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [members, setMembers] = useState<StaffMembershipDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [filters, setFilters] = useState<StaffFilterState>({
    search: '',
    role: 'all',
    status: 'all',
    page: 1,
    limit: 10,
  });

  const [selectedMember, setSelectedMember] = useState<StaffMembershipDTO | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);
  const [isRoleOpen, setIsRoleOpen] = useState<boolean>(false);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [statusActionType, setStatusActionType] = useState<'suspend' | 'activate' | null>(null);
  const [isRemoveOpen, setIsRemoveOpen] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch authenticated session & context
  useEffect(() => {
    async function loadContext() {
      try {
        const res = await fetch('/api/dashboard/context', { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const resolvedUserId = json.tenantContext?.userId || json.data?.user?.id || '';
          const resolvedRole = json.tenantContext?.role || json.data?.membership?.role || '';
          setCurrentUserId(resolvedUserId);
          setUserRole(resolvedRole);
        }
      } catch (err) {
        console.error('Failed to load session context:', err);
      } finally {
        setIsAuthLoading(false);
      }
    }
    loadContext();
  }, []);

  // Capability derivation from RBAC engine
  const capabilities = React.useMemo(() => {
    return getCapabilitiesForRole((userRole || 'assistant').toLowerCase());
  }, [userRole]);

  const canReadStaff = capabilities.has('staff:read');
  const canInviteStaff = capabilities.has('staff:invite');
  const canChangeRole = capabilities.has('staff:role_change');
  const canUpdateStatus = capabilities.has('staff:update');
  const canRemoveStaff = capabilities.has('staff:remove');

  // 2. Fetch staff collection
  const loadStaffData = useCallback(async () => {
    if (!canReadStaff && !isAuthLoading) return;

    setIsLoading(true);
    setFetchError(null);

    const res = await fetchStaffList({
      role: filters.role,
      status: filters.status,
      limit: filters.limit,
    });

    if (res.success) {
      let data = res.data || [];
      // Client search filter (by name, email, userId, or membershipId)
      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        data = data.filter(
          (m) =>
            (m.user?.name && m.user.name.toLowerCase().includes(q)) ||
            (m.user?.email && m.user.email.toLowerCase().includes(q)) ||
            m.userId.toLowerCase().includes(q) ||
            m.id.toLowerCase().includes(q)
        );
      }
      setMembers(data);
    } else {
      setFetchError(res.error?.message || 'Failed to fetch staff collection.');
    }
    setIsLoading(false);
  }, [canReadStaff, isAuthLoading, filters.role, filters.status, filters.limit, filters.search]);

  useEffect(() => {
    let isMounted = true;
    if (!isAuthLoading && canReadStaff) {
      fetchStaffList({
        role: filters.role,
        status: filters.status,
        limit: filters.limit,
      }).then((res) => {
        if (!isMounted) return;
        if (res.success) {
          let data = res.data || [];
          if (filters.search.trim()) {
            const q = filters.search.trim().toLowerCase();
            data = data.filter(
              (m) =>
                (m.user?.name && m.user.name.toLowerCase().includes(q)) ||
                (m.user?.email && m.user.email.toLowerCase().includes(q)) ||
                m.userId.toLowerCase().includes(q) ||
                m.id.toLowerCase().includes(q)
            );
          }
          setMembers(data);
        } else {
          setFetchError(res.error?.message || 'Failed to fetch staff collection.');
        }
        setIsLoading(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, canReadStaff, filters.role, filters.status, filters.limit, filters.search]);

  // Toast feedback auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleFilterChange = (updated: Partial<StaffFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated, page: 1 }));
  };

  // Handlers for Modals
  const handleOpenDetails = (member: StaffMembershipDTO) => {
    setSelectedMember(member);
    setIsDetailsOpen(true);
  };

  const handleOpenRole = (member: StaffMembershipDTO) => {
    setSelectedMember(member);
    setIsRoleOpen(true);
  };

  const handleOpenSuspend = (member: StaffMembershipDTO) => {
    setSelectedMember(member);
    setStatusActionType('suspend');
    setIsStatusOpen(true);
  };

  const handleOpenActivate = (member: StaffMembershipDTO) => {
    setSelectedMember(member);
    setStatusActionType('activate');
    setIsStatusOpen(true);
  };

  const handleOpenRemove = (member: StaffMembershipDTO) => {
    setSelectedMember(member);
    setIsRemoveOpen(true);
  };

  // API Action Handlers
  const handleInviteSubmit = async (values: InviteStaffFormValues) => {
    const res = await inviteStaffMember(values);
    if (res.success) {
      setToastMessage({ type: 'success', text: 'Staff member invited successfully.' });
      loadStaffData();
      return { success: true };
    }
    return { success: false, error: res.error?.message };
  };

  const handleUpdateRoleSubmit = async (memberId: string, role: StaffRole) => {
    const res = await updateStaffRole(memberId, role);
    if (res.success) {
      setToastMessage({ type: 'success', text: 'Staff role updated successfully.' });
      loadStaffData();
      return { success: true };
    }
    return { success: false, error: res.error?.message };
  };

  const handleStatusSubmit = async (memberId: string, action: 'suspend' | 'activate') => {
    const res = action === 'suspend' ? await suspendStaffMember(memberId) : await activateStaffMember(memberId);
    if (res.success) {
      setToastMessage({
        type: 'success',
        text: `Staff member ${action === 'suspend' ? 'suspended' : 'activated'} successfully.`,
      });
      loadStaffData();
      return { success: true };
    }
    return { success: false, error: res.error?.message };
  };

  const handleRemoveSubmit = async (memberId: string) => {
    const res = await removeStaffMember(memberId);
    if (res.success) {
      setToastMessage({ type: 'success', text: 'Staff membership removed successfully.' });
      loadStaffData();
      return { success: true };
    }
    return { success: false, error: res.error?.message };
  };

  if (isAuthLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="staff-workspace">
        <StaffSkeleton />
      </div>
    );
  }

  // Capability Gate: staff:read required
  if (!canReadStaff) {
    return (
      <div className="p-6 max-w-4xl mx-auto mt-8" data-testid="staff-unauthorized-card">
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto rounded-full bg-destructive/10 p-3 w-fit">
              <ShieldAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                You do not have the required authorization capability (<code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">staff:read</code>) to access the Staff & Team Workspace. Please contact your institute owner.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="staff-workspace">
      {toastMessage && (
        <Alert
          variant={toastMessage.type === 'error' ? 'destructive' : 'default'}
          className={toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : ''}
          data-testid="staff-toast-alert"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{toastMessage.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
          <AlertDescription>{toastMessage.text}</AlertDescription>
        </Alert>
      )}

      <StaffHeader
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={loadStaffData}
        onOpenInviteModal={() => setIsInviteOpen(true)}
        canInviteStaff={canInviteStaff}
        isLoading={isLoading}
      />

      {fetchError && (
        <Alert variant="destructive" data-testid="staff-fetch-error">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Failed to load staff list</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{fetchError}</span>
            <Button variant="outline" size="sm" onClick={loadStaffData} className="ml-4">
              <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <StaffSkeleton />
      ) : members.length === 0 ? (
        <StaffEmptyState
          isSearch={Boolean(filters.search || filters.role !== 'all' || filters.status !== 'all')}
          onClearFilters={() => setFilters({ search: '', role: 'all', status: 'all', page: 1, limit: 10 })}
          onOpenInviteModal={() => setIsInviteOpen(true)}
          canInviteStaff={canInviteStaff}
        />
      ) : (
        <>
          <StaffTable
            members={members}
            currentUserId={currentUserId}
            canChangeRole={canChangeRole}
            canUpdateStatus={canUpdateStatus}
            canRemoveStaff={canRemoveStaff}
            onViewDetails={handleOpenDetails}
            onChangeRole={handleOpenRole}
            onActivate={handleOpenActivate}
            onSuspend={handleOpenSuspend}
            onRemove={handleOpenRemove}
          />

          <StaffCardList
            members={members}
            currentUserId={currentUserId}
            canChangeRole={canChangeRole}
            canUpdateStatus={canUpdateStatus}
            canRemoveStaff={canRemoveStaff}
            onViewDetails={handleOpenDetails}
            onChangeRole={handleOpenRole}
            onActivate={handleOpenActivate}
            onSuspend={handleOpenSuspend}
            onRemove={handleOpenRemove}
          />
        </>
      )}

      {/* Feature Modals */}
      <StaffDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
      />

      <StaffInviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInvite={handleInviteSubmit}
      />

      <StaffRoleModal
        isOpen={isRoleOpen}
        onClose={() => {
          setIsRoleOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onUpdateRole={handleUpdateRoleSubmit}
      />

      <StaffStatusModal
        isOpen={isStatusOpen}
        onClose={() => {
          setIsStatusOpen(false);
          setSelectedMember(null);
          setStatusActionType(null);
        }}
        member={selectedMember}
        actionType={statusActionType}
        onConfirmStatusChange={handleStatusSubmit}
      />

      <StaffRemoveModal
        isOpen={isRemoveOpen}
        onClose={() => {
          setIsRemoveOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onConfirmRemove={handleRemoveSubmit}
      />
    </div>
  );
}
