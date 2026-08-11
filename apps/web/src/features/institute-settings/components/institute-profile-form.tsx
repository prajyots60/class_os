'use client';

import React, { useId } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label } from '@coaching-os/ui';
import { TIMEZONE_OPTIONS } from '../schemas/institute-settings-form-schema';

export interface InstituteProfileFormProps {
  formData: {
    name: string;
    phone: string;
    email: string;
    timezone: string;
    slug: string;
  };
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function InstituteProfileForm({
  formData,
  fieldErrors,
  isSubmitting,
  onInputChange,
}: InstituteProfileFormProps) {
  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const timezoneId = useId();
  const slugId = useId();

  const nameErrorId = `${nameId}-error`;
  const phoneErrorId = `${phoneId}-error`;
  const emailErrorId = `${emailId}-error`;
  const timezoneErrorId = `${timezoneId}-error`;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Institute Profile</CardTitle>
        <CardDescription>
          Update your coaching institute display name, primary contact credentials, and regional
          timezone.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Institute Name */}
        <div className="space-y-1.5">
          <Input
            id={nameId}
            name="name"
            label="Institute Name *"
            placeholder="e.g. Sharma Physics Classes"
            value={formData.name}
            onChange={onInputChange}
            error={fieldErrors.name}
            disabled={isSubmitting}
            required
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? nameErrorId : undefined}
          />
        </div>

        {/* Contact Phone & Email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 min-w-0">
            <Input
              id={phoneId}
              name="phone"
              label="Contact Phone *"
              placeholder="+919876543210"
              value={formData.phone}
              onChange={onInputChange}
              error={fieldErrors.phone}
              disabled={isSubmitting}
              required
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? phoneErrorId : undefined}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <Input
              id={emailId}
              name="email"
              type="email"
              label="Contact Email *"
              placeholder="contact@sharmaclasses.com"
              value={formData.email}
              onChange={onInputChange}
              error={fieldErrors.email}
              disabled={isSubmitting}
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? emailErrorId : undefined}
            />
          </div>
        </div>

        {/* Timezone & Read-Only Slug */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Timezone Dropdown */}
          <div className="space-y-1.5 min-w-0">
            <Label htmlFor={timezoneId} className="text-xs font-semibold">
              Timezone *
            </Label>
            <select
              id={timezoneId}
              name="timezone"
              value={formData.timezone}
              onChange={onInputChange}
              disabled={isSubmitting}
              required
              aria-invalid={Boolean(fieldErrors.timezone)}
              aria-describedby={fieldErrors.timezone ? timezoneErrorId : undefined}
              className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-xs font-medium text-[hsl(var(--foreground))] shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            {fieldErrors.timezone && (
              <p id={timezoneErrorId} className="text-xs text-red-500 font-medium">
                {fieldErrors.timezone}
              </p>
            )}
          </div>

          {/* Read-Only Slug */}
          <div className="space-y-1.5 min-w-0">
            <Input
              id={slugId}
              name="slug"
              label="Institute Slug (Immutable)"
              value={formData.slug}
              disabled
              readOnly
            />
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Public URL handle assigned during onboarding.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
