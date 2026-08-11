import { PrismaClient } from './generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { serverConfig } from '@coaching-os/config';

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const connectionString =
  isTest && (process.env.TEST_DATABASE_URL || serverConfig.TEST_DATABASE_URL)
    ? (process.env.TEST_DATABASE_URL || serverConfig.TEST_DATABASE_URL)
    : serverConfig.DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const db = new PrismaClient({ adapter });
export * from './generated/client/client';
export * from './testing';
