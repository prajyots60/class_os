import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, CheckCircle2 } from 'lucide-react';
import { Button, Badge } from '@coaching-os/ui';
import { Container, Section } from '../layout/container';
import { HeroProductPreview } from './hero-product-preview';

export function HeroSection() {
  return (
    <Section padding="lg" id="hero" className="overflow-hidden pt-8 sm:pt-16 lg:pt-20">
      <Container size="lg">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-8">
          {/* Left Column: Copy & CTAs */}
          <div className="flex flex-col items-center text-center lg:col-span-6 lg:items-start lg:text-left">
            {/* Eyebrow Badge */}
            <Badge
              variant="secondary"
              className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            >
              <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
              Built for Coaching Institutes
            </Badge>

            {/* Main Headline H1 */}
            <h1 className="text-4xl font-extrabold tracking-tight text-[hsl(var(--foreground))] sm:text-5xl lg:text-6xl leading-[1.1]">
              Run your coaching institute from{' '}
              <span className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent">
                one place.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="mt-6 text-lg leading-relaxed text-[hsl(var(--muted-foreground))] max-w-2xl lg:max-w-none">
              Manage students, academics, attendance, tests, fees, staff, and day-to-day institute operations through one connected platform.
            </p>

            {/* Action CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link href="/sign-up" className="w-full sm:w-auto">
                <Button variant="default" size="lg" className="w-full sm:w-auto gap-2 text-base font-semibold shadow-md">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base font-medium">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Trust Micro-copy */}
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                Multi-tenant Isolation
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Role-based Security
              </span>
              <span className="hidden sm:inline">•</span>
              <span>Zero credit card required</span>
            </div>
          </div>

          {/* Right Column: Visual Product Preview */}
          <div className="lg:col-span-6 w-full">
            <HeroProductPreview />
          </div>
        </div>
      </Container>
    </Section>
  );
}
