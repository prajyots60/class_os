import { createAuthClient } from 'better-auth/react';
import { clientConfig } from '@coaching-os/config/client';

export const authClient = createAuthClient({
  baseURL: clientConfig.NEXT_PUBLIC_APP_URL,
});

export const { useSession, signIn, signOut, signUp } = authClient;
