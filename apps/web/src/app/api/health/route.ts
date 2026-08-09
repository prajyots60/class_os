import { NextResponse } from 'next/server';
import { db } from '@coaching-os/database';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Ping PostgreSQL test query
    await db.$queryRaw`SELECT 1;`;

    return NextResponse.json(
      {
        status: 'ok',
        timestamp,
        checks: {
          database: 'ok',
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        timestamp,
        checks: {
          database: 'error',
        },
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  }
}
