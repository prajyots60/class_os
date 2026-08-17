import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './app-shell';
import type { UserDisplay, TenantDisplay, InstituteDisplay } from '../types/app-shell-types';

// Mock next/navigation for SSR rendering tests
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

const MOCK_USER: UserDisplay = {
  id: 'usr-123',
  name: 'Rakesh Sharma',
  email: 'rakesh@sharmaclasses.com',
};

const MOCK_TENANT: TenantDisplay = {
  role: 'owner',
  status: 'active',
  capabilities: ['institute:read', 'staff:read'],
};

const MOCK_INSTITUTE: InstituteDisplay = {
  name: 'Sharma Physics Classes',
  slug: 'sharma-physics',
  status: 'active',
};

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

describe('AppShell Component Architecture & Boundary Suite', () => {
  it('renders AppShell HTML with user name, institute name, and dashboard heading', () => {
    const html = renderWithQueryClient(
      <AppShell user={MOCK_USER} tenant={MOCK_TENANT} institute={MOCK_INSTITUTE}>
        <div>Workspace Dashboard Page</div>
      </AppShell>,
    );

    expect(html).toContain('Sharma Physics Classes');
    expect(html).toContain('Rakesh Sharma');
    expect(html).toContain('Workspace Dashboard Page');
    expect(html).toContain('Dashboard');
    expect(html).toContain('SP'); // Initials fallback for Sharma Physics
  });

  it('renders semantic <aside>, <header>, and <main> landmarks', () => {
    const html = renderWithQueryClient(
      <AppShell user={MOCK_USER} tenant={MOCK_TENANT} institute={MOCK_INSTITUTE}>
        <div>Workspace Content</div>
      </AppShell>,
    );

    expect(html).toContain('<aside');
    expect(html).toContain('<header');
    expect(html).toContain('<main');
  });
});
