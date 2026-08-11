'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { signIn, useSession } from '@coaching-os/auth/client';
import { Input, Button, Spinner } from '@coaching-os/ui';
import { AuthHeader } from '../components/auth-header';
import { AuthField } from '../components/auth-field';
import { AuthError } from '../components/auth-error';
import { AuthFooter } from '../components/auth-footer';
import { signInSchema, type SignInFormValues } from './sign-in-schema';
import type { SignInState } from './sign-in-types';

/**
 * Sanitizes an optional callbackUrl query parameter.
 * SECURITY: Only allows relative internal paths starting with a single '/'
 * Rejects external URLs (e.g. https://..., //evil.com, javascript:...).
 */
export function sanitizeCallbackUrl(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !/^[a-z0-9+-.]+:/i.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
}

/**
 * Maps raw Better Auth / network errors into safe, user-facing messages.
 * NEVER exposes internal error codes, stack traces, database details,
 * or user enumeration clues.
 */
export function mapSignInError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (
      msg.includes('invalid email or password') ||
      msg.includes('invalid credentials') ||
      msg.includes('invalid email') ||
      msg.includes('invalid password') ||
      msg.includes('user not found') ||
      msg.includes('incorrect password')
    ) {
      return 'Invalid email or password.';
    }

    if (msg.includes('rate limit') || msg.includes('too many')) {
      return 'Too many sign-in attempts. Please wait a moment and try again.';
    }

    if (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('load')
    ) {
      return "We couldn't reach CoachingOS. Check your connection and try again.";
    }
  }

  // Fallback — never expose raw error
  return 'Invalid email or password.';
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl');
  const safeCallbackUrl = sanitizeCallbackUrl(rawCallbackUrl);

  const { data: session, isPending: isSessionPending } = useSession();
  const [formState, setFormState] = React.useState<SignInState>({
    phase: 'idle',
    errorMessage: null,
  });
  const [showPassword, setShowPassword] = React.useState(false);

  // Helper to resolve tenant state server-side and navigate to correct route
  const resolveTenantAndNavigate = React.useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/context', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (response.ok) {
        const body = await response.json();
        if (body.hasTenant) {
          router.replace(safeCallbackUrl || '/dashboard');
          return;
        }
      }
    } catch {
      // Ignore network errors on context check — fallback to /onboarding
    }
    router.replace('/onboarding');
  }, [router, safeCallbackUrl]);

  // Redirect already-authenticated users to /dashboard or /onboarding
  React.useEffect(() => {
    if (!isSessionPending && session) {
      resolveTenantAndNavigate();
    }
  }, [isSessionPending, session, resolveTenantAndNavigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onSubmit',
  });

  const isSubmitting = formState.phase === 'submitting';

  const onSubmit = React.useCallback(
    async (values: SignInFormValues) => {
      if (isSubmitting) return;

      setFormState({ phase: 'submitting', errorMessage: null });

      try {
        // SECURITY: Send ONLY email and password. Never send userId, role, instituteId, etc.
        const result = await signIn.email({
          email: values.email.trim().toLowerCase(),
          password: values.password,
        });

        if (result.error) {
          const rawMsg =
            typeof result.error === 'object' && result.error !== null && 'message' in result.error
              ? String((result.error as { message?: string }).message ?? '')
              : String(result.error);

          setFormState({
            phase: 'error',
            errorMessage: mapSignInError(new Error(rawMsg)),
          });
          return;
        }

        // Sign-in succeeded — session is established by Better Auth.
        setFormState({ phase: 'success', errorMessage: null });
        await resolveTenantAndNavigate();
      } catch (error) {
        setFormState({
          phase: 'error',
          errorMessage: mapSignInError(error),
        });
      }
    },
    [isSubmitting, resolveTenantAndNavigate],
  );

  return (
    <div>
      <AuthHeader
        title="Sign in to your institute"
        description="Enter your credentials to access your CoachingOS workspace."
        eyebrow="Account Access"
      />

      {/* Global auth error */}
      {formState.phase === 'error' && formState.errorMessage && (
        <AuthError message={formState.errorMessage} />
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Sign in form">
        <div className="space-y-4">
          {/* Email */}
          <AuthField
            label="Email Address"
            htmlFor="signin-email"
            error={errors.email?.message}
            required
          >
            <Input
              id="signin-email"
              type="email"
              placeholder="you@institute.com"
              autoComplete="email"
              autoFocus
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'signin-email-error' : undefined}
              {...register('email')}
            />
          </AuthField>

          {/* Password */}
          <AuthField
            label="Password"
            htmlFor="signin-password"
            error={errors.password?.message}
            required
          >
            <div className="relative">
              <Input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'signin-password-error' : undefined}
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                tabIndex={0}
                onClick={() => setShowPassword((v) => !v)}
                disabled={isSubmitting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] rounded-sm"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </AuthField>
        </div>

        {/* Submit */}
        <div className="mt-6">
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            aria-label={isSubmitting ? 'Signing in, please wait...' : 'Sign in'}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                <span>Signing in...</span>
              </span>
            ) : (
              'Sign in'
            )}
          </Button>
        </div>
      </form>

      <AuthFooter
        prompt="Don't have an account?"
        linkLabel="Create Institute Account"
        href="/sign-up"
      />
    </div>
  );
}
