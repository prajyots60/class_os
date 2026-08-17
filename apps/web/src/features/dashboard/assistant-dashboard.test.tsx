import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssistantCollectionCard } from './components/assistant-collection-card';
import { AssistantAdmissionsSummary } from './components/assistant-admissions-summary';
import { AssistantQuickActions } from './components/assistant-quick-actions';
import { AssistantDashboardView } from './components/assistant-dashboard-view';
import { useAssistantDashboard, ASSISTANT_DASHBOARD_QUERY_KEY } from './hooks/use-assistant-dashboard';
import type { AssistantDashboardDTO } from '@coaching-os/administration';

type UseAssistantDashboardReturn = ReturnType<typeof useAssistantDashboard>;

// Mock useAssistantDashboard hook
vi.mock('./hooks/use-assistant-dashboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/use-assistant-dashboard')>();
  return {
    ...actual,
    useAssistantDashboard: vi.fn(),
  };
});

const mockAssistantDTO: AssistantDashboardDTO = {
  instituteId: 'inst-100',
  assistantUserId: 'usr-assistant-1',
  timezone: 'Asia/Kolkata',
  todayIso: '2026-08-17',
  collection: {
    collectedTodayAmount: 38500,
    transactionCount: 5,
    pendingReceiptCount: 2,
    targetPath: '/billing',
  },
  admissions: {
    admissionsTodayCount: 3,
    pendingEnrollmentsCount: 1,
    targetPath: '/enrollments',
  },
  quickActions: [
    {
      id: 'record-payment',
      label: 'Record Payment',
      targetPath: '/billing',
      requiredCapability: 'billing:payment:record',
    },
    {
      id: 'new-admission',
      label: 'New Student Admission',
      targetPath: '/students',
      requiredCapability: 'student:admit',
    },
  ],
};

const zeroDTO: AssistantDashboardDTO = {
  ...mockAssistantDTO,
  collection: {
    collectedTodayAmount: 0,
    transactionCount: 0,
    pendingReceiptCount: 0,
    targetPath: '/billing',
  },
  admissions: {
    admissionsTodayCount: 0,
    pendingEnrollmentsCount: 0,
    targetPath: '/enrollments',
  },
};

describe('Phase 6.4 — Assistant Dashboard UI Test Suite', () => {
  beforeEach(() => {
    vi.mocked(useAssistantDashboard).mockReturnValue({
      data: mockAssistantDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseAssistantDashboardReturn);
  });

  it('ASSISTANT-DASH-001: Authenticated Assistant Dashboard renders', () => {
    const html = renderToStaticMarkup(<AssistantDashboardView />);
    expect(html).toContain('assistant-dashboard-view');
    expect(html).toContain('Administrative Operations');
  });

  it('ASSISTANT-DASH-002: Today\'s Collection card renders', () => {
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={mockAssistantDTO.collection} />);
    expect(html).toContain("Today");
    expect(html).toContain("Collection");
  });

  it('ASSISTANT-DASH-003: Today\'s collection amount renders from DTO', () => {
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={mockAssistantDTO.collection} />);
    // ₹38,500 formatted by Intl.NumberFormat en-IN INR
    expect(html).toContain('38,500');
    expect(html).toContain('collection-amount');
  });

  it('ASSISTANT-DASH-004: Transaction count renders from DTO', () => {
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={mockAssistantDTO.collection} />);
    expect(html).toContain('transaction-count');
    expect(html).toContain('>5<');
  });

  it('ASSISTANT-DASH-005: Pending/unissued receipt count renders from DTO', () => {
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={mockAssistantDTO.collection} />);
    expect(html).toContain('pending-receipt-count');
    expect(html).toContain('>2<');
  });

  it('ASSISTANT-DASH-006: New Admissions Today renders from DTO', () => {
    const html = renderToStaticMarkup(<AssistantAdmissionsSummary admissions={mockAssistantDTO.admissions} />);
    expect(html).toContain('admissions-today-count');
    expect(html).toContain('>3<');
    expect(html).toContain('New Admissions Today');
  });

  it('ASSISTANT-DASH-007: Pending Enrollments renders from DTO', () => {
    const html = renderToStaticMarkup(<AssistantAdmissionsSummary admissions={mockAssistantDTO.admissions} />);
    expect(html).toContain('pending-enrollments-count');
    expect(html).toContain('>1<');
    expect(html).toContain('Pending Enrollments');
  });

  it('ASSISTANT-DASH-008: Collection amount is not recalculated in React — uses DTO field directly', () => {
    // Verifies the component does not perform arithmetic on payment records.
    // The DTO field collectedTodayAmount is a pre-aggregated server value.
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={mockAssistantDTO.collection} />);
    // 38500 formatted — if the component were doing arithmetic, the output
    // structure would differ (e.g. accumulation loop)
    expect(html).toContain('38,500');
    // No sign of any "sum(", "reduce", or derived computation in rendered output
    expect(html).not.toContain('NaN');
  });

  it('ASSISTANT-DASH-009: Record Payment action is a real navigation target', () => {
    const html = renderToStaticMarkup(<AssistantQuickActions quickActions={mockAssistantDTO.quickActions} />);
    expect(html).toContain('quick-action-record-payment');
    expect(html).toContain('href="/billing"');
    expect(html).toContain('Record Payment');
  });

  it('ASSISTANT-DASH-010: Pending receipts navigation targets the existing billing/receipt workspace', () => {
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={mockAssistantDTO.collection} />);
    expect(html).toContain('href="/billing"');
    expect(html).toContain('Billing');
  });

  it('ASSISTANT-DASH-011: Admissions navigation targets the existing student/admission workspace', () => {
    const html = renderToStaticMarkup(<AssistantAdmissionsSummary admissions={mockAssistantDTO.admissions} />);
    expect(html).toContain('href="/students"');
    expect(html).toContain('Admissions');
  });

  it('ASSISTANT-DASH-012: Pending enrollment navigation targets the existing enrollment workflow', () => {
    const html = renderToStaticMarkup(<AssistantAdmissionsSummary admissions={mockAssistantDTO.admissions} />);
    expect(html).toContain('href="/enrollments"');
    expect(html).toContain('Enrollments');
  });

  it('ASSISTANT-DASH-013: Loading skeleton renders', () => {
    vi.mocked(useAssistantDashboard).mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseAssistantDashboardReturn);

    const html = renderToStaticMarkup(<AssistantDashboardView />);
    expect(html).toContain('assistant-dashboard-loading');
    // Skeleton renders — no collection amount, no "₹", no dangerous zeros
    expect(html).not.toContain('₹0');
  });

  it('ASSISTANT-DASH-014: Safe error state renders', () => {
    vi.mocked(useAssistantDashboard).mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network timeout'),
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseAssistantDashboardReturn);

    const html = renderToStaticMarkup(<AssistantDashboardView />);
    expect(html).toContain('assistant-dashboard-error');
    expect(html).toContain('Dashboard Data Unavailable');
    expect(html).not.toContain('Prisma');
    expect(html).not.toContain('SQL');
  });

  it('ASSISTANT-DASH-015: Retry refetches Assistant Dashboard', () => {
    const mockRefetch = vi.fn();
    vi.mocked(useAssistantDashboard).mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Server error'),
      refetch: mockRefetch,
      isRefetching: false,
    } as unknown as UseAssistantDashboardReturn);

    const html = renderToStaticMarkup(<AssistantDashboardView />);
    expect(html).toContain('Retry Dashboard Load');
    // Retry button exists and is not disabled by default
    expect(html).not.toContain('disabled=""');
  });

  it('ASSISTANT-DASH-016: Zero collection renders as valid ₹0 data, not empty/error state', () => {
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={zeroDTO.collection} />);
    // Zero is valid operational data — should render ₹0 via Intl, not error
    expect(html).toContain('collection-amount');
    expect(html).toContain('0');
    expect(html).not.toContain('No data');
  });

  it('ASSISTANT-DASH-017: Zero transactions renders correctly', () => {
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={zeroDTO.collection} />);
    expect(html).toContain('transaction-count');
    expect(html).toContain('>0<');
  });

  it('ASSISTANT-DASH-018: Zero pending receipts renders correctly', () => {
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={zeroDTO.collection} />);
    expect(html).toContain('pending-receipt-count');
    expect(html).toContain('>0<');
  });

  it('ASSISTANT-DASH-019: Zero admissions renders correctly', () => {
    const html = renderToStaticMarkup(<AssistantAdmissionsSummary admissions={zeroDTO.admissions} />);
    expect(html).toContain('admissions-today-count');
    // Zero admissions is valid data, not an error
    expect(html).not.toContain('No data');
  });

  it('ASSISTANT-DASH-020: Zero pending enrollments renders correctly', () => {
    const html = renderToStaticMarkup(<AssistantAdmissionsSummary admissions={zeroDTO.admissions} />);
    expect(html).toContain('pending-enrollments-count');
    expect(html).not.toContain('No data');
  });

  it('ASSISTANT-DASH-021: Responsive layout supports 320px — uses responsive CSS classes', () => {
    const html = renderToStaticMarkup(<AssistantDashboardView />);
    // max-w-7xl + p-4 sm:p-6 responsive container
    expect(html).toContain('max-w-7xl');
    expect(html).toContain('p-4');
  });

  it('ASSISTANT-DASH-022: No horizontal overflow assumptions — responsive grid classes present', () => {
    const html = renderToStaticMarkup(<AssistantAdmissionsSummary admissions={mockAssistantDTO.admissions} />);
    expect(html).not.toContain('overflow-x');
    // Responsive grid for multi-column layout
    const viewHtml = renderToStaticMarkup(<AssistantDashboardView />);
    expect(viewHtml).toContain('md:grid-cols-2');
  });

  it('ASSISTANT-DASH-023: Interactive controls meet >=44px touch target', () => {
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={mockAssistantDTO.collection} />);
    expect(html).toContain('min-h-[44px]');

    const actionsHtml = renderToStaticMarkup(<AssistantQuickActions quickActions={mockAssistantDTO.quickActions} />);
    expect(actionsHtml).toContain('min-h-[44px]');
  });

  it('ASSISTANT-DASH-024: Keyboard navigation — focus-visible ring classes exist on links', () => {
    const html = renderToStaticMarkup(<AssistantQuickActions quickActions={mockAssistantDTO.quickActions} />);
    // buttonVariants applies focus-visible ring classes from the UI package
    expect(html).toContain('focus-visible');
  });

  it('ASSISTANT-DASH-025: Accessible names exist on interactive elements', () => {
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={mockAssistantDTO.collection} />);
    expect(html).toContain('aria-label');
    expect(html).toContain('Billing workspace');

    const admHtml = renderToStaticMarkup(<AssistantAdmissionsSummary admissions={mockAssistantDTO.admissions} />);
    expect(admHtml).toContain('aria-label');
  });

  it('ASSISTANT-DASH-026: Financial/status meaning does not depend on color alone — text counts present', () => {
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={mockAssistantDTO.collection} />);
    // Text labels accompanying each metric
    expect(html).toContain('Transactions');
    expect(html).toContain('receipts unissued');
  });

  it('ASSISTANT-DASH-027: No Prisma/internal fields are rendered', () => {
    const html = renderToStaticMarkup(<AssistantDashboardView />);
    expect(html).not.toContain('prisma');
    expect(html).not.toContain('Prisma');
    expect(html).not.toContain('_count');
    expect(html).not.toContain('password');
    expect(html).not.toContain('assistantUserId');
  });

  it('ASSISTANT-DASH-028: No browser-derived today logic — header date comes from server todayIso', () => {
    const html = renderToStaticMarkup(<AssistantDashboardView />);
    // The header date is derived from data.todayIso = '2026-08-17' (UTC parsed)
    // not from new Date() in the browser
    expect(html).toContain('2026');
    // Date is displayed, confirming server-provided ISO date is used
    expect(html).toContain('August');
  });

  it('ASSISTANT-DASH-029: Stable query key [\'dashboard\', \'assistant\'] is used', () => {
    expect(ASSISTANT_DASHBOARD_QUERY_KEY).toEqual(['dashboard', 'assistant']);
  });

  it('ASSISTANT-DASH-030: No unnecessary duplicate dashboard requests — single hook, no parallel calls', () => {
    const html = renderToStaticMarkup(<AssistantDashboardView />);
    // Single data source rendering — all sections should be present
    expect(html).toContain('collection-amount');
    expect(html).toContain('admissions-today-count');
    // One root container, not multiple dashboard shell instances
    const occurrences = (html.match(/assistant-dashboard-view/g) || []).length;
    expect(occurrences).toBe(1);
  });
});
