/**
 * Phase 1.12.6 Integration Test — Staff Consumption of Protected Identity APIs
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  db,
} from '@coaching-os/database';
import { auth } from '@coaching-os/auth';
import { V1IdentityApiClient } from '@coaching-os/identity/client';

// Handlers
import { GET as studentsListGET } from '../app/api/v1/students/route';
import { PATCH as studentByIdPATCH } from '../app/api/v1/students/[id]/route';
import { GET as staffListGET } from '../app/api/v1/staff/route';
import { POST as onboardPOST } from '../app/api/onboarding/institute/route';

describe('Phase 1.12.6 — Protected Identity API Staff Consumption Integration', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  let ipCounter = 200;
  function getIp(): string {
    ipCounter += 1;
    return `10.200.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
  }

  async function setupStaffSession() {
    const email = `staff_cons_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'SecurePassword123!';
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name: 'Staff Consumer' },
      asResponse: true,
    });
    const cookieHeader = signUpResponse.headers.get('set-cookie')!;

    // Onboard institute
    const onboardReq = new NextRequest('http://localhost:3000/api/onboarding/institute', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        cookie: cookieHeader,
        'x-forwarded-for': getIp(),
      }),
      body: JSON.stringify({
        name: 'Consumption Test Institute',
        phone: '+919876543210',
        email: `inst_cons_${Date.now()}@test.com`,
        slug: `inst-cons-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      }),
    });
    const onboardRes = await onboardPOST(onboardReq);
    const onboardBody = await onboardRes.json();
    const institute = onboardBody.data.institute;

    return { cookieHeader, institute };
  }

  it('1. client SDK fetches students collection via mock dispatch adapter', async () => {
    const { cookieHeader, institute } = await setupStaffSession();

    // Create 2 test students in DB
    await db.student.createMany({
      data: [
        {
          instituteId: institute.id,
          admissionNumber: `ADM-101-${Date.now()}`,
          firstName: 'Aarav',
          lastName: 'Patel',
          status: 'active',
          admissionStatus: 'admitted',
        },
        {
          instituteId: institute.id,
          admissionNumber: `ADM-102-${Date.now()}`,
          firstName: 'Bhavya',
          lastName: 'Singh',
          status: 'active',
          admissionStatus: 'admitted',
        },
      ],
    });

    // Custom fetchFn delegating to Next.js route handler
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      const reqHeaders = new Headers(init?.headers);
      reqHeaders.set('cookie', cookieHeader);
      reqHeaders.set('x-forwarded-for', getIp());

      const nextReq = new NextRequest(urlStr, {
        method: init?.method || 'GET',
        headers: reqHeaders,
        body: (init?.body as BodyInit) || null,
      });

      return studentsListGET(nextReq);
    };

    const v1Client = new V1IdentityApiClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const students = await v1Client.students.list({ limit: 10 });
    expect(students.data).toHaveLength(2);
    expect(students.pagination.pageSize).toBe(10);
    expect(students.data.some((s) => s.firstName === 'Aarav')).toBe(true);
    expect(students.data.some((s) => s.firstName === 'Bhavya')).toBe(true);
  });

  it('2. client SDK updates student profile via PATCH adapter', async () => {
    const { cookieHeader, institute } = await setupStaffSession();

    const student = await db.student.create({
      data: {
        instituteId: institute.id,
        admissionNumber: `ADM-201-${Date.now()}`,
        firstName: 'OriginalFirst',
        lastName: 'OriginalLast',
        status: 'active',
        admissionStatus: 'admitted',
      },
    });

    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      const reqHeaders = new Headers(init?.headers);
      reqHeaders.set('cookie', cookieHeader);
      reqHeaders.set('x-forwarded-for', getIp());

      const nextReq = new NextRequest(urlStr, {
        method: init?.method || 'GET',
        headers: reqHeaders,
        body: (init?.body as BodyInit) || null,
      });

      return studentByIdPATCH(nextReq, { params: Promise.resolve({ id: student.id }) });
    };

    const v1Client = new V1IdentityApiClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const updated = await v1Client.students.update(student.id, {
      firstName: 'UpdatedFirst',
    });

    expect(updated.firstName).toBe('UpdatedFirst');

    const dbStudent = await db.student.findUnique({ where: { id: student.id } });
    expect(dbStudent?.firstName).toBe('UpdatedFirst');
  });

  it('3. client SDK fetches staff memberships safely', async () => {
    const { cookieHeader } = await setupStaffSession();

    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      const reqHeaders = new Headers(init?.headers);
      reqHeaders.set('cookie', cookieHeader);
      reqHeaders.set('x-forwarded-for', getIp());

      const nextReq = new NextRequest(urlStr, {
        method: init?.method || 'GET',
        headers: reqHeaders,
      });

      return staffListGET(nextReq);
    };

    const v1Client = new V1IdentityApiClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const staffList = await v1Client.staff.list();
    expect(staffList.data.length).toBeGreaterThanOrEqual(1);
    expect(staffList.data[0].role).toBe('owner');
  });
});
