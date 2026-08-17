'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@coaching-os/ui';

export interface AcademicDefaultsSectionProps {
  timezone?: string;
}

export function AcademicDefaultsSection({ timezone = 'Asia/Kolkata' }: AcademicDefaultsSectionProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Academic System Defaults</CardTitle>
        <CardDescription>
          Configured system-wide operational policies, scheduling boundaries, attendance rules, and evaluation standards.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Defaults Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* 1. Timezone & Boundary */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Default Timezone
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                Active
              </span>
            </div>
            <p className="text-base font-bold text-[hsl(var(--foreground))]">{timezone}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Determines server-authoritative date query boundaries (<code className="text-[11px]">startOfDay</code> / <code className="text-[11px]">endOfDay</code>) for attendance and fee collection reports.
            </p>
          </div>

          {/* 2. Attendance Policy */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Attendance Policy
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Standard
              </span>
            </div>
            <p className="text-base font-bold text-[hsl(var(--foreground))]">Session-Level Tracking</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Batch sessions record binary or multi-status attendance (<code className="text-[11px]">present</code> / <code className="text-[11px]">absent</code> / <code className="text-[11px]">late</code>) per enrolled student.
            </p>
          </div>

          {/* 3. Evaluation Boundary */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Evaluation Matrix
              </span>
              <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                Marks & Percentage
              </span>
            </div>
            <p className="text-base font-bold text-[hsl(var(--foreground))]">Standard Grading Scale</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Test score calculations compile absolute raw marks, total weightage, and calculated percentage per student test submission.
            </p>
          </div>

          {/* 4. Multi-Tenant Scoping */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Tenant Scoping
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                Strict Isolation
              </span>
            </div>
            <p className="text-base font-bold text-[hsl(var(--foreground))]">Row-Level Security</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              All academic programs, subjects, batches, and student records are strictly scoped by server-authenticated <code className="text-[11px]">institute_id</code>.
            </p>
          </div>
        </div>

        {/* Notice Box */}
        <div className="rounded-md border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200 space-y-1">
          <p className="font-semibold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
            <svg className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            Academic Defaults Boundary Note
          </p>
          <p className="leading-relaxed">
            Batch-specific schedule overrides, faculty assignments, program curriculums, and student capacity limits are managed directly within the Academic Workspace. No custom database overrides are required for default settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
