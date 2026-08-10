'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { signUp, useSession } from '@coaching-os/auth/client';
import { Input, Button, Spinner } from '@coaching-os/ui';
import { AuthHeader } from '../components/auth-header';
import { AuthField } from '../components/auth-field';
import { AuthError } from '../components/auth-error';
import { AuthFooter } from '../components/auth-footer';
import { signUpSchema, type SignUpFormValues } from './sign-up-schema';
import type { SignUpState } from './sign-up-types';

/**
 * Maps raw Better Auth / network errors into safe, user-facing messages.
 * NEVER exposes internal error codes, stack traces, or database details.
 */
function mapSignUpError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes('user already exists') || msg.includes('email already') || msg.includes('already been taken')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (msg.includes('password') && (msg.includes('too short') || msg.includes('weak') || msg.includes('length'))) {
      return 'Your password does not meet security requirements. Please choose a stronger password.';
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('load')) {
      return "We couldn't reach CoachingOS. Check your connection and try again.";
    }
    if (msg.includes('invalid email') || msg.includes('valid email')) {
      return 'Please enter a valid email address.';
    }
  }

  // Fallback — never expose raw error
  return 'Something went wrong while creating your account. Please try again.';
}

export function SignUpForm() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const [formState, setFormState] = React.useState<SignUpState>({
    phase: 'idle',
    errorMessage: null,
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Redirect already-authenticated users to onboarding/dashboard.
  // This runs after session resolves to avoid a flash of the form.
  React.useEffect(() => {
    if (!isSessionPending && session) {
      router.replace('/onboarding');
    }
  }, [isSessionPending, session, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onSubmit',
  });

  const isSubmitting = formState.phase === 'submitting';

  const onSubmit = React.useCallback(
    async (values: SignUpFormValues) => {
      // Prevent duplicate submission
      if (isSubmitting) return;

      setFormState({ phase: 'submitting', errorMessage: null });

      try {
        // SECURITY: Only send name, email, password. Never send userId, role, instituteId, etc.
        const result = await signUp.email({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
        });

        if (result.error) {
          // Better Auth returned an error object
          const rawMsg =
            typeof result.error === 'object' && result.error !== null && 'message' in result.error
              ? String((result.error as { message?: string }).message ?? '')
              : String(result.error);
          setFormState({
            phase: 'error',
            errorMessage: mapSignUpError(new Error(rawMsg)),
          });
          return;
        }

        // Registration succeeded — session is established by Better Auth automatically.
        // Transition immediately to onboarding (no artificial delay).
        setFormState({ phase: 'success', errorMessage: null });
        router.push('/onboarding');
      } catch (error) {
        setFormState({
          phase: 'error',
          errorMessage: mapSignUpError(error),
        });
      }
    },
    [isSubmitting, router],
  );

  return (
    <div>
      <AuthHeader
        title="Create your CoachingOS account"
        description="Start managing your coaching institute from one connected workspace."
        eyebrow="New Account"
      />

      {/* Global auth error */}
      {formState.phase === 'error' && formState.errorMessage && (
        <AuthError
          message={
            formState.errorMessage.includes('already exists') ? (
              <>
                {formState.errorMessage}{' '}
                <a
                  href="/sign-in"
                  className="font-semibold underline hover:no-underline"
                >
                  Sign in
                </a>
              </>
            ) : (
              formState.errorMessage
            )
          }
        />
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label="Create account form"
      >
        <div className="space-y-4">
          {/* Full Name */}
          <AuthField
            label="Full Name"
            htmlFor="signup-name"
            error={errors.name?.message}
            required
          >
            <Input
              id="signup-name"
              type="text"
              placeholder="Rakesh Sharma"
              autoComplete="name"
              autoFocus
              disabled={isSubmitting}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'signup-name-error' : undefined}
              {...register('name')}
            />
          </AuthField>

          {/* Email */}
          <AuthField
            label="Email Address"
            htmlFor="signup-email"
            error={errors.email?.message}
            required
          >
            <Input
              id="signup-email"
              type="email"
              placeholder="you@institute.com"
              autoComplete="email"
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'signup-email-error' : undefined}
              {...register('email')}
            />
          </AuthField>

          {/* Password */}
          <AuthField
            label="Password"
            htmlFor="signup-password"
            error={errors.password?.message}
            description="At least 8 characters."
            required
          >
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'signup-password-error' : 'signup-password-desc'}
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

          {/* Confirm Password */}
          <AuthField
            label="Confirm Password"
            htmlFor="signup-confirm-password"
            error={errors.confirmPassword?.message}
            required
          >
            <div className="relative">
              <Input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined}
                className="pr-10"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                tabIndex={0}
                onClick={() => setShowConfirmPassword((v) => !v)}
                disabled={isSubmitting}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] rounded-sm"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
            aria-label={isSubmitting ? 'Creating account, please wait...' : 'Create account'}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                <span>Creating account...</span>
              </span>
            ) : (
              'Create account'
            )}
          </Button>
        </div>

        <p className="mt-4 text-center text-[11px] text-[hsl(var(--muted-foreground))]">
          By creating an account, you agree to the{' '}
          <span className="font-medium text-[hsl(var(--foreground))]">CoachingOS Terms of Service</span>.
        </p>
      </form>

      <AuthFooter
        prompt="Already have an account?"
        linkLabel="Sign in"
        href="/sign-in"
      />
    </div>
  );
}
