import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@coaching-os/ui';

export interface AuthErrorProps {
  message?: React.ReactNode | null;
  title?: string;
  className?: string;
}

export function AuthError({ message, title = 'Authentication Error', className = '' }: AuthErrorProps) {
  if (!message) return null;

  return (
    <Alert variant="destructive" className={`mb-6 text-left ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-xs font-bold uppercase tracking-wider">{title}</AlertTitle>
      <AlertDescription className="mt-1 text-xs">{message}</AlertDescription>
    </Alert>
  );
}

