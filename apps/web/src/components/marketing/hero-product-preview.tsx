import * as React from 'react';
import {
  Users,
  GraduationCap,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@coaching-os/ui';

export function HeroProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 lg:max-w-none">
      {/* Top Browser Bar */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-2.5 bg-[hsl(var(--muted))]/40 rounded-t-xl">
        <div className="flex items-center space-x-2">
          <span className="h-3 w-3 rounded-full bg-red-400/80"></span>
          <span className="h-3 w-3 rounded-full bg-amber-400/80"></span>
          <span className="h-3 w-3 rounded-full bg-emerald-400/80"></span>
          <span className="ml-2 text-xs font-mono text-[hsl(var(--muted-foreground))]">
            app.coachingos.com / dashboard
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="success" className="text-[10px] px-2 py-0.5">
            <ShieldCheck className="mr-1 h-3 w-3 inline" /> Tenant Isolated
          </Badge>
        </div>
      </div>

      {/* Workspace Preview Body */}
      <div className="p-4 space-y-4 bg-[hsl(var(--background))]">
        {/* Workspace Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[hsl(var(--border))] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                Sharma Physics Classes
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                Owner
              </Badge>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Academic Session 2026-27 • Main Branch
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Operations
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="p-3 bg-[hsl(var(--muted))]/20">
            <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))] mb-1">
              <span className="text-xs font-medium">Students</span>
              <Users className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
            </div>
            <div className="text-lg font-bold">248</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium mt-0.5">
              <TrendingUp className="h-3 w-3 inline" /> +12 this month
            </span>
          </Card>

          <Card className="p-3 bg-[hsl(var(--muted))]/20">
            <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))] mb-1">
              <span className="text-xs font-medium">Active Batches</span>
              <GraduationCap className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
            </div>
            <div className="text-lg font-bold">8</div>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 block">
              11th & 12th JEE/NEET
            </span>
          </Card>

          <Card className="p-3 bg-[hsl(var(--muted))]/20 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))] mb-1">
              <span className="text-xs font-medium">Attendance</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold">94.2%</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
              Today's Average
            </span>
          </Card>
        </div>

        {/* Schedule & Recent Activity Mock */}
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[hsl(var(--foreground))]">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Today's Sessions
            </span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">4 Batches Scheduled</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs p-2 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="font-medium">Class 12th JEE Physics — Electrostatics</span>
              </div>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                <Clock className="h-3 w-3" /> 04:00 PM - 05:30 PM
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                <span className="font-medium">Class 11th NEET Physics — Kinematics</span>
              </div>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                <Clock className="h-3 w-3" /> 05:45 PM - 07:15 PM
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
