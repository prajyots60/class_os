import * as React from 'react';
import { AuthHeader, AuthFooter } from '../../../features/auth';

export default function SignUpPlaceholderPage() {
  return (
    <>
      <AuthHeader
        title="Get started with CoachingOS"
        description="Create your institute account to set up your operational workspace."
        eyebrow="New Account"
      />
      <div className="py-8 text-center text-xs font-mono text-[hsl(var(--muted-foreground))] rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10">
        [ Sign Up Form UI Placeholder &mdash; Phase 0.12.4 ]
      </div>
      <AuthFooter
        prompt="Already have an account?"
        linkLabel="Sign In"
        href="/sign-in"
      />
    </>
  );
}
