'use client';

import React, { useState, useId, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@coaching-os/auth/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Badge,
} from '@coaching-os/ui';

function formatSlugPreview(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Guard: if user already has an active tenant, redirect to dashboard before showing the form
  const [tenantCheckDone, setTenantCheckDone] = useState(false);

  useEffect(() => {
    if (isPending || !session) {
      // Not ready to check — wait for session to resolve
      return;
    }

    let cancelled = false;

    async function checkExistingTenant() {
      try {
        const res = await fetch('/api/dashboard/context', {
          method: 'GET',
          cache: 'no-store',
        });
        if (cancelled) return;

        if (res.ok) {
          const body = await res.json();
          if (body.hasTenant) {
            // User already has an active institute — redirect to dashboard
            router.push('/dashboard');
            return;
          }
        }
      } catch {
        // Network failure — allow form to render; server will enforce via 409 on submit
      }

      if (!cancelled) {
        setTenantCheckDone(true);
      }
    }

    checkExistingTenant();

    return () => {
      cancelled = true;
    };
  }, [isPending, session, router]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    slug: '',
    timezone: 'Asia/Kolkata',
    logoUrl: '',
    primaryColor: '#6366F1',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const slugId = useId();
  const timezoneId = useId();
  const logoUrlId = useId();
  const primaryColorId = useId();

  // Compute live slug preview from custom slug or institute name
  const rawSlugCandidate = formData.slug || formData.name;
  const slugPreview = rawSlugCandidate ? formatSlugPreview(rawSlugCandidate) : '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setGlobalError(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Institute name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Institute name must be at least 2 characters.';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Primary phone number is required.';
    } else if (!/^\+?[1-9]\d{7,14}$/.test(formData.phone.trim().replace(/[\s-]/g, ''))) {
      errors.phone = 'Please enter a valid phone number (e.g. +919876543210).';
    }

    if (!formData.email.trim()) {
      errors.email = 'Contact email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (formData.slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug.trim().toLowerCase())) {
      errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // SECURITY INVARIANT: Send ONLY legitimate institute profile fields.
      // Server-side session determines identity and owner tenancy.
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        timezone: formData.timezone.trim() || 'Asia/Kolkata',
        slug: formData.slug.trim() ? formatSlugPreview(formData.slug) : undefined,
        logoUrl: formData.logoUrl.trim() || null,
        primaryColor: formData.primaryColor.trim() || null,
      };

      const response = await fetch('/api/onboarding/institute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (response.ok && json.success) {
        // 201 Created -> Redirect to dashboard
        router.push('/dashboard');
        return;
      }

      if (response.status === 401) {
        setGlobalError('Session expired. Please sign in again.');
        setTimeout(() => {
          router.push('/sign-in');
        }, 1500);
        return;
      }

      if (response.status === 409) {
        const msg = json.error?.message || 'Conflict during onboarding.';
        if (msg.includes('already associated')) {
          setGlobalError('You already belong to an active institute tenant.');
        } else if (msg.includes('already exists')) {
          setFieldErrors((prev) => ({
            ...prev,
            slug: 'This institute URL slug is already taken. Please choose another.',
          }));
          setGlobalError('An institute with this URL slug already exists.');
        } else {
          setGlobalError(msg);
        }
        return;
      }

      if (response.status === 400) {
        if (json.error?.details) {
          const apiDetails = json.error.details as Record<string, string[] | string>;
          const mappedErrors: Record<string, string> = {};
          Object.entries(apiDetails).forEach(([key, val]) => {
            mappedErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
          });
          setFieldErrors(mappedErrors);
        }
        setGlobalError(json.error?.message || 'Invalid onboarding information. Please check form fields.');
        return;
      }

      setGlobalError('Something went wrong while creating your institute. Please try again.');
    } catch {
      setGlobalError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading until both session and tenant guard have resolved
  const isReady = !isPending && (tenantCheckDone || !session);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="flex items-center space-x-3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
          <svg className="h-5 w-5 animate-spin text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Verifying authentication session...</span>
        </div>
      </div>
    );
  }

  if (!isReady || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to complete institute onboarding.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.push('/sign-in')}>Sign In</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(var(--background))] p-4 text-[hsl(var(--foreground))]">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))] font-bold text-white shadow-md">
              C
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CoachingOS</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Founder Institute Bootstrap</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Step 1 of 1
          </Badge>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Setup Your Coaching Institute</CardTitle>
            <CardDescription>
              Create your institute workspace. As the founder, you will receive full owner privileges.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-5">
              {globalError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                >
                  {globalError}
                </div>
              )}

              {/* Institute Name */}
              <div className="space-y-1.5">
                <Input
                  id={nameId}
                  name="name"
                  label="Institute Name *"
                  placeholder="e.g. Sharma Physics Classes"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={fieldErrors.name}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Contact Phone & Email */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id={phoneId}
                  name="phone"
                  label="Primary Phone *"
                  placeholder="+919876543210"
                  value={formData.phone}
                  onChange={handleInputChange}
                  error={fieldErrors.phone}
                  disabled={isSubmitting}
                  required
                />
                <Input
                  id={emailId}
                  name="email"
                  type="email"
                  label="Contact Email *"
                  placeholder="contact@sharmaclasses.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={fieldErrors.email}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Custom Slug & Preview */}
              <div className="space-y-1.5">
                <Input
                  id={slugId}
                  name="slug"
                  label="Custom URL Slug (Optional)"
                  placeholder="e.g. sharma-physics"
                  value={formData.slug}
                  onChange={handleInputChange}
                  error={fieldErrors.slug}
                  disabled={isSubmitting}
                />
                {slugPreview && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Institute Slug Preview:{' '}
                    <span className="font-mono font-medium text-[hsl(var(--primary))]">
                      {slugPreview}
                    </span>
                  </p>
                )}
              </div>

              {/* Advanced Optional Settings */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id={timezoneId}
                  name="timezone"
                  label="Timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
                <Input
                  id={logoUrlId}
                  name="logoUrl"
                  label="Logo URL (Optional)"
                  placeholder="https://..."
                  value={formData.logoUrl}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>

              {/* Primary Color Accent */}
              <div className="space-y-1.5">
                <Input
                  id={primaryColorId}
                  name="primaryColor"
                  label="Primary Color Hex (Optional)"
                  placeholder="#6366F1"
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center space-x-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Provisioning Institute...</span>
                  </span>
                ) : (
                  'Complete Onboarding'
                )}
              </Button>
              <p className="text-center text-[11px] text-[hsl(var(--muted-foreground))]">
                By completing onboarding, you establish yourself as the primary owner of this institute tenant.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
