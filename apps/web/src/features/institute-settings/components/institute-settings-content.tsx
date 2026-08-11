'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Alert, AlertTitle, AlertDescription } from '@coaching-os/ui';
import { SettingsSkeleton } from './settings-skeleton';
import { InstituteProfileForm } from './institute-profile-form';
import { InstituteBrandingForm } from './institute-branding-form';
import { instituteSettingsFormSchema } from '../schemas/institute-settings-form-schema';
import type { ApiSettingsResponse, InstituteSettingsDTO } from '../types/institute-settings.types';

export function InstituteSettingsContent() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialSettings, setInitialSettings] = useState<InstituteSettingsDTO | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    timezone: 'Asia/Kolkata',
    slug: '',
    logoUrl: '',
    primaryColor: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Fetch settings from API on mount
  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setIsLoading(true);
      setGlobalError(null);
      setAccessDenied(false);

      try {
        const res = await fetch('/api/institute/settings', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!isMounted) return;

        if (res.status === 401) {
          router.push('/sign-in');
          return;
        }

        if (res.status === 403) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        const json: ApiSettingsResponse = await res.json();

        if (!isMounted) return;

        if (res.ok && json.success) {
          const dto = json.data;
          setInitialSettings(dto);
          setFormData({
            name: dto.name || '',
            phone: dto.phone || '',
            email: dto.email || '',
            timezone: dto.timezone || 'Asia/Kolkata',
            slug: dto.slug || '',
            logoUrl: dto.logoUrl || '',
            primaryColor: dto.primaryColor || '',
          });
        } else {
          const msg =
            !json.success && json.error
              ? json.error.message
              : 'We couldn\'t load your institute settings.';
          setGlobalError(msg);
        }
      } catch {
        if (isMounted) {
          setGlobalError('Network error. We couldn\'t load your institute settings.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setGlobalError(null);
    setSuccessMessage(null);
  };

  const handleColorPickerChange = (hex: string) => {
    setFormData((prev) => ({ ...prev, primaryColor: hex }));
    setFieldErrors((prev) => ({ ...prev, primaryColor: '' }));
    setGlobalError(null);
    setSuccessMessage(null);
  };

  // Reset form back to initial server state
  const handleReset = () => {
    if (initialSettings) {
      setFormData({
        name: initialSettings.name || '',
        phone: initialSettings.phone || '',
        email: initialSettings.email || '',
        timezone: initialSettings.timezone || 'Asia/Kolkata',
        slug: initialSettings.slug || '',
        logoUrl: initialSettings.logoUrl || '',
        primaryColor: initialSettings.primaryColor || '',
      });
    }
    setFieldErrors({});
    setGlobalError(null);
    setSuccessMessage(null);
  };

  // Check dirty state
  const isDirty = initialSettings
    ? formData.name !== (initialSettings.name || '') ||
      formData.phone !== (initialSettings.phone || '') ||
      formData.email !== (initialSettings.email || '') ||
      formData.timezone !== (initialSettings.timezone || 'Asia/Kolkata') ||
      formData.logoUrl !== (initialSettings.logoUrl || '') ||
      formData.primaryColor !== (initialSettings.primaryColor || '')
    : false;

  // Validate form using Zod
  const validateForm = (): boolean => {
    const result = instituteSettingsFormSchema.safeParse({
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      timezone: formData.timezone,
      logoUrl: formData.logoUrl.trim() || null,
      primaryColor: formData.primaryColor.trim() || null,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[String(issue.path[0])] = issue.message;
        }
      });
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  // Handle Save submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // SECURITY INVARIANT: Send ONLY editable profile and branding fields.
      // Server-side session determines identity and tenant scoping — NEVER the client.
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        timezone: formData.timezone.trim(),
        logoUrl: formData.logoUrl.trim() || null,
        primaryColor: formData.primaryColor.trim() || null,
      };

      const res = await fetch('/api/institute/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setGlobalError('Session expired. Please sign in again.');
        setTimeout(() => router.push('/sign-in'), 1500);
        return;
      }

      if (res.status === 403) {
        setGlobalError("You don't have permission to update institute settings.");
        return;
      }

      const json: ApiSettingsResponse = await res.json();

      if (res.ok && json.success) {
        const updated = json.data;
        setInitialSettings(updated);
        setFormData({
          name: updated.name || '',
          phone: updated.phone || '',
          email: updated.email || '',
          timezone: updated.timezone || 'Asia/Kolkata',
          slug: updated.slug || '',
          logoUrl: updated.logoUrl || '',
          primaryColor: updated.primaryColor || '',
        });
        setSuccessMessage('Settings saved successfully.');
        router.refresh();
        return;
      }

      if (res.status === 400 && !json.success && json.error.details) {
        const details = json.error.details as Record<string, string[] | string>;
        const mapped: Record<string, string> = {};
        Object.entries(details).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        setFieldErrors(mapped);
        setGlobalError(json.error.message || 'Please check the highlighted fields.');
        return;
      }

      const errMsg = !json.success && json.error ? json.error.message : "We couldn't save your changes. Please try again.";
      setGlobalError(errMsg);
    } catch {
      setGlobalError('Network error. We couldn\'t save your changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Institute Settings
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage your institute profile and white-label branding.
          </p>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don&apos;t have permission to manage institute settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Institute Settings
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage your institute profile details, regional timezone, and white-label visual branding.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Alerts Feedback */}
        {globalError && (
          <Alert variant="destructive">
            <AlertTitle>Update Error</AlertTitle>
            <AlertDescription>{globalError}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <AlertTitle className="text-emerald-900 dark:text-emerald-200">Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Section 1: Profile */}
        <InstituteProfileForm
          formData={formData}
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          onInputChange={handleInputChange}
        />

        {/* Section 2: Branding */}
        <InstituteBrandingForm
          formData={formData}
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          onInputChange={handleInputChange}
          onColorPickerChange={handleColorPickerChange}
        />

        {/* Actions Bar */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          {isDirty && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Reset
            </Button>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            aria-busy={isSubmitting}
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <span className="flex items-center space-x-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Saving...</span>
              </span>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
