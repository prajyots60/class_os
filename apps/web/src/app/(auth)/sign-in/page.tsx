import * as React from 'react';
import { AuthHeader, AuthFooter } from '../../../features/auth';

export default function SignInPlaceholderPage() {
  return (
    <>
      <AuthHeader
        title="Sign in to your institute"
        description="Enter your credentials to access your CoachingOS workspace."
        eyebrow="Account Access"
      />
      <div className="py-8 text-center text-xs font-mono text-[hsl(var(--muted-foreground))] rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10">
        [ Sign In Form UI Placeholder &mdash; Phase 0.12.5 ]
      </div>
      <AuthFooter
        prompt="Don't have an account?"
        linkLabel="Create Institute Account"
        href="/sign-up"
      />
    </>
  );
}
