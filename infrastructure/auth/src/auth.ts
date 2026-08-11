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
    enabled: process.env.NODE_ENV !== 'test' && process.env.DISABLE_AUTH_RATE_LIMIT !== 'true',
    window: 60, // 60s global window
    max: 100, // 100 requests per minute global baseline
    customRules: {
      '/sign-in/email': {
        window: 10,
        max: 3, // Stricter rate limit: 3 login attempts per 10s
      },
      '/sign-up/email': {
        window: 60,
        max: 5, // Stricter rate limit: 5 sign-up attempts per 60s
      },
      '/forget-password': {
        window: 60,
        max: 3, // Stricter rate limit: 3 recovery requests per 60s
      },
      '/reset-password': {
        window: 60,
        max: 3, // Stricter rate limit: 3 password resets per 60s
      },
    },
  },
  advanced: {
    useSecureCookies: serverConfig.NODE_ENV === 'production',
    database: {
      generateId: 'uuid',
    },
  },
});

export const { GET, POST } = toNextJsHandler(auth);

export type Session = typeof auth.$Infer.Session;
