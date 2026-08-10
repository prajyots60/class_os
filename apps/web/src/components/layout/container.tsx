import * as React from 'react';
import { cn } from '@coaching-os/ui';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const containerSizes = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  full: 'max-w-full',
};

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ size = 'lg', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', containerSizes[size], className)}
      {...props}
    />
  ),
);
Container.displayName = 'Container';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const sectionPadding = {
  none: 'py-0',
  sm: 'py-6 sm:py-8',
  md: 'py-12 sm:py-16',
  lg: 'py-16 sm:py-24',
};

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ padding = 'md', className, ...props }, ref) => (
    <section ref={ref} className={cn(sectionPadding[padding], className)} {...props} />
  ),
);
Section.displayName = 'Section';
