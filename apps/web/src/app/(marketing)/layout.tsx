import * as React from 'react';
import { MarketingHeader } from '../../components/marketing/marketing-header';
import { MarketingFooter } from '../../components/marketing/marketing-footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
