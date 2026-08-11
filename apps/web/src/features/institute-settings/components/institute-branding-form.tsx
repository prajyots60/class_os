'use client';

import React, { useId } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label } from '@coaching-os/ui';
import { LogoPreview } from './logo-preview';
import { ColorPreview } from './color-preview';

export interface InstituteBrandingFormProps {
  formData: {
    name: string;
    logoUrl: string;
    primaryColor: string;
  };
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onColorPickerChange: (hex: string) => void;
}

export function InstituteBrandingForm({
  formData,
  fieldErrors,
  isSubmitting,
  onInputChange,
  onColorPickerChange,
}: InstituteBrandingFormProps) {
  const logoUrlId = useId();
  const primaryColorId = useId();
  const colorPickerId = useId();

  const logoErrorId = `${logoUrlId}-error`;
  const colorErrorId = `${primaryColorId}-error`;

  const isValidHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(formData.primaryColor.trim());
  const pickerColor = isValidHex
    ? formData.primaryColor.trim().length === 4
      ? `#${formData.primaryColor.trim()[1]}${formData.primaryColor.trim()[1]}${formData.primaryColor.trim()[2]}${formData.primaryColor.trim()[2]}${formData.primaryColor.trim()[3]}${formData.primaryColor.trim()[3]}`
      : formData.primaryColor.trim()
    : '#0F172A';

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-xl font-bold">White-Label Branding</CardTitle>
        <CardDescription>
          Customize your institute&apos;s visual logo and primary brand color theme across workspace portals.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Logo URL Input & Preview */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-1.5 min-w-0">
            <Input
              id={logoUrlId}
              name="logoUrl"
              label="Logo Asset URL"
              placeholder="https://cdn.example.com/logo.png"
              value={formData.logoUrl}
              onChange={onInputChange}
              error={fieldErrors.logoUrl}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.logoUrl)}
              aria-describedby={fieldErrors.logoUrl ? logoErrorId : undefined}
            />
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Use a secure HTTPS image URL pointing to your institute logo asset.
            </p>
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs font-semibold">Logo Preview</Label>
            <LogoPreview logoUrl={formData.logoUrl} instituteName={formData.name} />
          </div>
        </div>

        {/* Primary Color Input, Color Picker & Preview */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 min-w-0">
            <div className="flex items-end space-x-2 min-w-0">
              <div className="flex-1 min-w-0">
                <Input
                  id={primaryColorId}
                  name="primaryColor"
                  label="Primary Brand Color (HEX)"
                  placeholder="#0F172A"
                  value={formData.primaryColor}
                  onChange={onInputChange}
                  error={fieldErrors.primaryColor}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.primaryColor)}
                  aria-describedby={fieldErrors.primaryColor ? colorErrorId : undefined}
                />
              </div>
              <div className="mb-0.5 space-y-1 shrink-0">
                <Label htmlFor={colorPickerId} className="sr-only">
                  Choose Color Swatch
                </Label>
                <input
                  id={colorPickerId}
                  type="color"
                  value={pickerColor}
                  onChange={(e) => onColorPickerChange(e.target.value.toUpperCase())}
                  disabled={isSubmitting}
                  className="h-10 w-12 cursor-pointer rounded-md border border-[hsl(var(--input))] bg-transparent p-1 shadow-xs disabled:cursor-not-allowed"
                  title="Pick primary color"
                />
              </div>
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              3-digit or 6-digit HEX color code (e.g. #0F172A or #2563EB).
            </p>
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs font-semibold">Brand Color Preview</Label>
            <ColorPreview primaryColor={formData.primaryColor} instituteName={formData.name} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
