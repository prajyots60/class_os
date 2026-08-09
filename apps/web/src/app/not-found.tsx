import Link from 'next/link';
import { Button } from '@coaching-os/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-6">
      <div className="max-w-md space-y-4 rounded-[var(--radius-card)] border border-[hsl(var(--border))] p-8 text-center shadow-lg">
        <h2 className="text-4xl font-extrabold text-[hsl(var(--primary))]">404</h2>
        <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">Page Not Found</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          The requested page or route does not exist in CoachingOS.
        </p>
        <Link href="/" passHref>
          <Button variant="default" className="w-full">
            Return to Showcase
          </Button>
        </Link>
      </div>
    </div>
  );
}
