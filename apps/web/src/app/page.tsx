'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  Sparkles,
  Users,
  GraduationCap,
  BookOpen,
  Bell,
  ShieldCheck,
  Palette,
  ArrowRight,
  Send,
} from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
} from '@coaching-os/ui';
import { useUIStore } from '../stores/use-ui-store';

const demoFormSchema = z.object({
  parentName: z.string().min(2, 'Parent name must be at least 2 characters'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  studentGrade: z.string().min(1, 'Please select a grade'),
});

type DemoFormData = z.infer<typeof demoFormSchema>;

export default function ShowcasePage() {
  const { currentTheme, setTheme } = useUIStore();
  const shouldReduceMotion = useReducedMotion();
  const [formSubmitted, setFormSubmitted] = React.useState<DemoFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DemoFormData>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: {
      parentName: '',
      phone: '',
      studentGrade: '11th Science',
    },
  });

  const onSubmit = (data: DemoFormData) => {
    setFormSubmitted(data);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] transition-colors duration-300">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[hsl(var(--foreground))]">
                {currentTheme.name}
              </h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{currentTheme.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
              Token-Driven Architecture
            </Badge>

            {/* Theme Selector Toggle */}
            <div className="flex items-center rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-1">
              <button
                onClick={() => setTheme('sharma_classes')}
                className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-all ${
                  currentTheme.id === 'sharma_classes'
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <Palette className="h-3.5 w-3.5" />
                Theme A (Blue/Poppins)
              </button>
              <button
                onClick={() => setTheme('apex_academy')}
                className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-all ${
                  currentTheme.id === 'apex_academy'
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <Palette className="h-3.5 w-3.5" />
                Theme B (Orange/Manrope)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Showcase Grid */}
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-12">
        {/* Banner Section */}
        <motion.section
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[var(--radius-card)] border border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--primary))]/10 via-[hsl(var(--background))] to-[hsl(var(--accent))]/10 p-8 shadow-sm"
        >
          <div className="max-w-2xl space-y-4">
            <Badge variant="success">Phase 0.3 Web Application Foundation</Badge>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              One Codebase, Many Coaching Identities
            </h2>
            <p className="text-base text-[hsl(var(--muted-foreground))]">
              This showcase demonstrates the token-driven design system baseline for CoachingOS.
              Components consume CSS variable tokens (`var(--color-primary)`, `var(--radius-card)`),
              allowing any coaching institute to present its custom brand without separate code
              paths.
            </p>
          </div>
        </motion.section>

        {/* Section 1: Typography & Badges */}
        <section className="space-y-6">
          <div className="border-b border-[hsl(var(--border))] pb-3">
            <h3 className="text-xl font-bold tracking-tight">1. Typography & Badges</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Curated fonts and badge status indicators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Heading & Body Hierarchy</CardTitle>
                <CardDescription>Active font family: {currentTheme.fontFamily}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <h1 className="text-2xl font-bold">H1 Display Heading</h1>
                <h2 className="text-xl font-semibold">H2 Section Header</h2>
                <h3 className="text-lg font-medium">H3 Subsection Title</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                  Body Text: CoachingOS simplifies daily operations for founder-led institutes while
                  providing transparent insights to parents across multiple coaching centers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status & Categorization Badges</CardTitle>
                <CardDescription>Semantic badge indicators for system states</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2.5 items-center">
                <Badge variant="default">Default Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Active / Present</Badge>
                <Badge variant="warning">Pending / Due</Badge>
                <Badge variant="destructive">Absent / Overdue</Badge>
                <Badge variant="outline">Outline Variant</Badge>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 2: Buttons & Focus States */}
        <section className="space-y-6">
          <div className="border-b border-[hsl(var(--border))] pb-3">
            <h3 className="text-xl font-bold tracking-tight">2. Interactive Buttons</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Accessible button variants with focus rings and keyboard navigation
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="default">
                  Primary Action <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="destructive">Destructive Action</Button>
                <Button variant="default" size="sm">
                  Small Button
                </Button>
                <Button variant="default" size="lg">
                  Large Action
                </Button>
                <Button variant="default" disabled>
                  Disabled
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Forms & Validation (React Hook Form + Zod) */}
        <section className="space-y-6">
          <div className="border-b border-[hsl(var(--border))] pb-3">
            <h3 className="text-xl font-bold tracking-tight">3. Form Architecture & Validation</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              React Hook Form + Zod validation with accessible error messaging
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <Card>
              <CardHeader>
                <CardTitle>Inquiry Demo Form</CardTitle>
                <CardDescription>Submit form to test client-side schema validation</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <Input
                    label="Parent Name"
                    placeholder="e.g. Rajesh Sharma"
                    error={errors.parentName?.message}
                    {...register('parentName')}
                  />
                  <Input
                    label="Mobile Number (10 digits)"
                    placeholder="e.g. 9876543210"
                    error={errors.phone?.message}
                    {...register('phone')}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider">
                      Target Grade
                    </label>
                    <select
                      {...register('studentGrade')}
                      className="flex h-10 w-full rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
                    >
                      <option value="10th Foundation">10th Foundation</option>
                      <option value="11th Science">11th Science</option>
                      <option value="12th NEET Prep">12th NEET Prep</option>
                    </select>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3 border-t border-[hsl(var(--border))] pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset();
                      setFormSubmitted(null);
                    }}
                  >
                    Reset
                  </Button>
                  <Button type="submit" variant="default">
                    <Send className="mr-2 h-4 w-4" /> Submit Inquiry
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card className="h-full flex flex-col justify-center">
              <CardHeader>
                <CardTitle>Form State & Payload Output</CardTitle>
                <CardDescription>Validated form state output</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-6">
                {formSubmitted ? (
                  <div className="space-y-3 rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 p-6 text-left w-full">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-5 w-5" /> Validation Successful!
                    </div>
                    <pre className="mt-2 rounded bg-[hsl(var(--muted))] p-3 text-xs font-mono text-[hsl(var(--foreground))]">
                      {JSON.stringify(formSubmitted, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center space-y-2 py-8 text-[hsl(var(--muted-foreground))]">
                    <ShieldCheck className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))]/40" />
                    <p className="text-sm">
                      Submit the inquiry form to preview client-side validation output.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 4: Iconography & Card Primitives */}
        <section className="space-y-6">
          <div className="border-b border-[hsl(var(--border))] pb-3">
            <h3 className="text-xl font-bold tracking-tight">
              4. Lucide Iconography & Card Layout Primitives
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Consistent Lucide React icon system across cards
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <Users className="h-6 w-6 text-[hsl(var(--primary))]" />
                <CardTitle className="text-base mt-2">Identity Context</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Multi-tenant identity boundaries & parent linking
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <GraduationCap className="h-6 w-6 text-[hsl(var(--primary))]" />
                <CardTitle className="text-base mt-2">Academics Context</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Schedules, sessions, attendance & test evaluation
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <BookOpen className="h-6 w-6 text-[hsl(var(--primary))]" />
                <CardTitle className="text-base mt-2">Billing Context</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Billing plans, invoicing, payments & printable receipts
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <Bell className="h-6 w-6 text-[hsl(var(--primary))]" />
                <CardTitle className="text-base mt-2">Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Announcements & event-driven notifications
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-6 mt-16 text-center text-xs text-[hsl(var(--muted-foreground))]">
        CoachingOS Engineering Foundation • Phase 0.3 Web Application Baseline
      </footer>
    </div>
  );
}
