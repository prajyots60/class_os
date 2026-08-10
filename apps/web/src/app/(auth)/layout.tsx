import * as React from 'react';
import type { Metadata } from 'next';
import { AuthLayoutShell } from '../../features/auth';

export const metadata: Metadata = {
  title: 'Authentication — CoachingOS',
  description: 'Sign in or create an account for your coaching institute workspace.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
