'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { signOut } from '@coaching-os/auth/client';
import { Button, Spinner } from '@coaching-os/ui';

export interface SignOutButtonProps {
  variant?: 'outline' | 'ghost' | 'default' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
}

/**
 * SignOutButton — Client Component handling the sign-out flow.
 *
 * Connected directly to `@coaching-os/auth/client` `signOut()`.
 * Handles loading state, disables double-submits, and redirects to `/sign-in`.
 */
export function SignOutButton({
  variant = 'outline',
  size = 'sm',
  className = '',
  showIcon = true,
}: SignOutButtonProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await signOut();
      router.replace('/sign-in');
    } catch {
      // Fallback redirect even on network failure
      router.replace('/sign-in');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSignOut}
      disabled={isSigningOut}
      aria-busy={isSigningOut}
      aria-label="Sign out of CoachingOS"
      className={className}
    >
      {isSigningOut ? (
        <span className="flex items-center space-x-2">
          <Spinner size="sm" />
          <span>Signing out...</span>
        </span>
      ) : (
        <span className="flex items-center space-x-1.5">
          {showIcon && <LogOut className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>Sign Out</span>
        </span>
      )}
    </Button>
  );
}
