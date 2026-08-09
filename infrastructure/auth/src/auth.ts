import { betterAuth } from 'better-auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { db } from '@coaching-os/database';
import { serverConfig } from '@coaching-os/config';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  secret: serverConfig.BETTER_AUTH_SECRET,
  baseURL: serverConfig.BETTER_AUTH_URL,
  trustedOrigins: [serverConfig.BETTER_AUTH_URL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  rateLimit: {
    enabled: true,
    window: 60, // 60 seconds
    max: 100, // 100 requests per minute
  },
  advanced: {
    useSecureCookies: serverConfig.NODE_ENV === 'production',
  },
});

export const { GET, POST } = toNextJsHandler(auth);

export type Session = typeof auth.$Infer.Session;
