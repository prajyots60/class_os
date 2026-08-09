import { PrismaClient } from './generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { serverConfig } from '@coaching-os/config';

const connectionString = serverConfig.DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const db = new PrismaClient({ adapter });
export * from './generated/client/client';
export * from './testing';
