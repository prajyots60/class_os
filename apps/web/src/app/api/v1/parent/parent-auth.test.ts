import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  db,
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
} from '@coaching-os/database';
import {
  PrismaParentIdentityRepository,
  PrismaOTPVerificationRepository,
  CreateParentIdentityUseCase,
  ChangeParentIdentityStatusUseCase,
  RequestParentOTPUseCase,
  VerifyParentOTPUseCase,
  MockOTPProvider,
  ProductionOTPProvider,
} from '@coaching-os/identity';
import { requireParentIdentity } from '@coaching-os/auth';
import { AuthenticationError, InternalError } from '@coaching-os/shared';
import { POST as requestPOST } from './otp/request/route';
import { POST as verifyPOST } from './otp/verify/route';

describe('Phase 5.1 — Parent Authentication & OTP Security Matrix Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
    MockOTPProvider.clearSentMessages();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  // ── PARENT-AUTH-001 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-001: Unauthenticated request to protected parent resource remains rejected', async () => {
    const emptyHeaders = new Headers();
    await expect(requireParentIdentity(emptyHeaders)).rejects.toThrow(AuthenticationError);
  });

  // ── PARENT-AUTH-002 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-002: Valid OTP authenticates the correct ParentIdentity and issues session cookie', async () => {
    const phone = '+919876543210';
    const reqReq = new NextRequest('http://localhost/api/v1/parent/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });

    const reqRes = await requestPOST(reqReq);
    expect(reqRes.status).toBe(200);

    const verifyReq = new NextRequest('http://localhost/api/v1/parent/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp: '123456' }),
    });

    const verifyRes = await verifyPOST(verifyReq);
    expect(verifyRes.status).toBe(200);

    const verifyBody = await verifyRes.json();
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.data.parentIdentity.phone).toBe(phone);
    expect(verifyBody.data.parentIdentity.status).toBe('active');
    expect(verifyBody.data.session.token).toBeTruthy();

    const setCookie = verifyRes.headers.get('set-cookie');
    expect(setCookie).toContain('better-auth.session_token=');

    // Verify session resolution
    const sessionToken = setCookie?.match(/better-auth\.session_token=([^;]+)/)?.[1];
    expect(sessionToken).toBeTruthy();

    const authHeaders = new Headers({
      cookie: `better-auth.session_token=${sessionToken}`,
    });

    const parentCtx = await requireParentIdentity(authHeaders);
    expect(parentCtx.parentIdentity.phone).toBe(phone);
    expect(parentCtx.parentIdentityId).toBe(verifyBody.data.parentIdentity.id);
  });

  // ── PARENT-AUTH-003 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-003: Invalid OTP is rejected', async () => {
    const phone = '+919876543210';
    const otpRepo = new PrismaOTPVerificationRepository();
    const requestUseCase = new RequestParentOTPUseCase(otpRepo);
    await requestUseCase.execute({ phone });

    const verifyReq = new NextRequest('http://localhost/api/v1/parent/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp: '999999' }),
    });

    const verifyRes = await verifyPOST(verifyReq);
    expect(verifyRes.status).toBe(401);

    const body = await verifyRes.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  // ── PARENT-AUTH-004 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-004: Expired OTP is rejected', async () => {
    const phone = '+919876543210';
    const otpRepo = new PrismaOTPVerificationRepository();

    // Save an expired OTP record
    await otpRepo.saveOTP(phone, 'hash_mock', new Date(Date.now() - 60_000));

    const verifyReq = new NextRequest('http://localhost/api/v1/parent/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp: '123456' }),
    });

    const verifyRes = await verifyPOST(verifyReq);
    expect(verifyRes.status).toBe(401);

    const body = await verifyRes.json();
    expect(body.error.message).toContain('expired');
  });

  // ── PARENT-AUTH-005 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-005: OTP cannot be reused after successful verification', async () => {
    const phone = '+919876543210';
    const reqReq = new NextRequest('http://localhost/api/v1/parent/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    await requestPOST(reqReq);

    const verifyReq1 = new NextRequest('http://localhost/api/v1/parent/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp: '123456' }),
    });
    const res1 = await verifyPOST(verifyReq1);
    expect(res1.status).toBe(200);

    // Second attempt with same OTP -> fails
    const verifyReq2 = new NextRequest('http://localhost/api/v1/parent/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp: '123456' }),
    });
    const res2 = await verifyPOST(verifyReq2);
    expect(res2.status).toBe(401);
  });

  // ── PARENT-AUTH-006 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-006: Fourth failed verification attempt within 15-minute window is rate-limited (429)', async () => {
    const phone = '+919876543210';
    const otpRepo = new PrismaOTPVerificationRepository();
    const parentRepo = new PrismaParentIdentityRepository();
    const requestUseCase = new RequestParentOTPUseCase(otpRepo);
    await requestUseCase.execute({ phone });

    const verifyUseCase = new VerifyParentOTPUseCase(parentRepo, otpRepo);

    // 3 failed verification attempts
    for (let i = 0; i < 3; i++) {
      await expect(
        verifyUseCase.execute({ phone, otp: '000000' }),
      ).rejects.toThrow();
    }

    // 4th attempt -> rate limited (429)
    await expect(
      verifyUseCase.execute({ phone, otp: '123456' }),
    ).rejects.toThrow(/Rate limit exceeded/);
  });

  // ── PARENT-AUTH-007 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-007: Different phone cannot use another phone\'s OTP', async () => {
    const phoneA = '+919876543210';
    const phoneB = '+919999999999';

    const reqReq = new NextRequest('http://localhost/api/v1/parent/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone: phoneA }),
    });
    await requestPOST(reqReq);

    const verifyReq = new NextRequest('http://localhost/api/v1/parent/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone: phoneB, otp: '123456' }),
    });

    const res = await verifyPOST(verifyReq);
    expect(res.status).toBe(401);
  });

  // ── PARENT-AUTH-008 & PARENT-AUTH-009 ─────────────────────────────────────
  it('PARENT-AUTH-008 & PARENT-AUTH-009: Route handlers reject client-supplied parentId and instituteId parameters', async () => {
    const reqReq = new NextRequest('http://localhost/api/v1/parent/otp/request', {
      method: 'POST',
      body: JSON.stringify({
        phone: '+919876543210',
        parentId: '00000000-0000-4000-a000-000000000000',
        instituteId: '00000000-0000-4000-a000-000000000000',
      }),
    });

    const resReq = await requestPOST(reqReq);
    expect(resReq.status).toBe(400);

    const verifyReq = new NextRequest('http://localhost/api/v1/parent/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        phone: '+919876543210',
        otp: '123456',
        parentId: '00000000-0000-4000-a000-000000000000',
        instituteId: '00000000-0000-4000-a000-000000000000',
      }),
    });

    const resVerify = await verifyPOST(verifyReq);
    expect(resVerify.status).toBe(400);
  });

  // ── PARENT-AUTH-010 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-010: Suspended ParentIdentity cannot authenticate', async () => {
    const phone = '+919876543210';
    const parentRepo = new PrismaParentIdentityRepository();
    const otpRepo = new PrismaOTPVerificationRepository();

    const createUseCase = new CreateParentIdentityUseCase(parentRepo);
    const parent = await createUseCase.execute({ phone });

    const statusUseCase = new ChangeParentIdentityStatusUseCase(parentRepo);
    await statusUseCase.execute({ id: parent.id, status: 'suspended' });

    const requestUseCase = new RequestParentOTPUseCase(otpRepo);
    await requestUseCase.execute({ phone });

    const verifyUseCase = new VerifyParentOTPUseCase(parentRepo, otpRepo);
    await expect(verifyUseCase.execute({ phone, otp: '123456' })).rejects.toThrow(
      /ACCOUNT_SUSPENDED/,
    );
  });

  // ── PARENT-AUTH-011 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-011: Deactivated ParentIdentity cannot authenticate', async () => {
    const phone = '+919876543210';
    const parentRepo = new PrismaParentIdentityRepository();
    const otpRepo = new PrismaOTPVerificationRepository();

    const createUseCase = new CreateParentIdentityUseCase(parentRepo);
    const parent = await createUseCase.execute({ phone });

    const statusUseCase = new ChangeParentIdentityStatusUseCase(parentRepo);
    await statusUseCase.execute({ id: parent.id, status: 'deactivated' });

    const requestUseCase = new RequestParentOTPUseCase(otpRepo);
    await requestUseCase.execute({ phone });

    const verifyUseCase = new VerifyParentOTPUseCase(parentRepo, otpRepo);
    await expect(verifyUseCase.execute({ phone, otp: '123456' })).rejects.toThrow(
      /ACCOUNT_DEACTIVATED/,
    );
  });

  // ── PARENT-AUTH-012 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-012: Equivalent normalized phone representations resolve consistently', async () => {
    const rawPhones = ['9876543210', '+91 9876543210', '09876543210', '+91 98765-43210'];

    const reqReq = new NextRequest('http://localhost/api/v1/parent/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone: rawPhones[0] }),
    });
    await requestPOST(reqReq);

    const verifyReq = new NextRequest('http://localhost/api/v1/parent/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone: rawPhones[1], otp: '123456' }),
    });
    const verifyRes = await verifyPOST(verifyReq);
    expect(verifyRes.status).toBe(200);

    const body = await verifyRes.json();
    expect(body.data.parentIdentity.phone).toBe('+919876543210');
  });

  // ── PARENT-AUTH-013 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-013: OTP is never returned in response payloads', async () => {
    const reqReq = new NextRequest('http://localhost/api/v1/parent/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone: '+919876543210' }),
    });
    const reqRes = await requestPOST(reqReq);
    const reqBody = await reqRes.json();
    expect(JSON.stringify(reqBody)).not.toContain('123456');

    const verifyReq = new NextRequest('http://localhost/api/v1/parent/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone: '+919876543210', otp: '123456' }),
    });
    const verifyRes = await verifyPOST(verifyReq);
    const verifyBody = await verifyRes.json();
    expect(JSON.stringify(verifyBody)).not.toContain('123456');
  });

  // ── PARENT-AUTH-014 & PARENT-AUTH-015 ─────────────────────────────────────
  it('PARENT-AUTH-014 & PARENT-AUTH-015: Production OTP provider fails safely if SMS_PROVIDER_API_KEY is missing', async () => {
    const prodProvider = new ProductionOTPProvider();
    delete process.env.SMS_PROVIDER_API_KEY;

    await expect(
      prodProvider.sendOTP({ phone: '+919876543210', otp: '654321' }),
    ).rejects.toThrow(InternalError);
  });

  // ── PARENT-AUTH-016 & PARENT-AUTH-017 ─────────────────────────────────────
  it('PARENT-AUTH-016 & PARENT-AUTH-017: Production environment generates random OTP and rejects mock 123456', async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.SMS_PROVIDER_API_KEY = 'mock_api_key';

    try {
      const parentRepo = new PrismaParentIdentityRepository();
      const otpRepo = new PrismaOTPVerificationRepository();
      const requestUseCase = new RequestParentOTPUseCase(otpRepo, new MockOTPProvider());

      await requestUseCase.execute({ phone: '+919876543210' });

      const verifyUseCase = new VerifyParentOTPUseCase(parentRepo, otpRepo);
      // Fixed 123456 must fail in production when not the generated OTP
      await expect(
        verifyUseCase.execute({ phone: '+919876543210', otp: '123456' }),
      ).rejects.toThrow(AuthenticationError);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = originalEnv;
    }
  });

  // ── PARENT-AUTH-018 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-018: Concurrent verification of the same OTP results in at most one successful authentication', async () => {
    const phone = '+919876543210';
    const parentRepo = new PrismaParentIdentityRepository();
    const otpRepo = new PrismaOTPVerificationRepository();

    const requestUseCase = new RequestParentOTPUseCase(otpRepo);
    await requestUseCase.execute({ phone });

    const verifyUseCase = new VerifyParentOTPUseCase(parentRepo, otpRepo);

    // Two concurrent verification requests
    const results = await Promise.allSettled([
      verifyUseCase.execute({ phone, otp: '123456' }),
      verifyUseCase.execute({ phone, otp: '123456' }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });

  // ── PARENT-AUTH-019 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-019: Concurrent OTP requests for same phone maintain clean state', async () => {
    const phone = '+919876543210';
    const otpRepo = new PrismaOTPVerificationRepository();
    const requestUseCase = new RequestParentOTPUseCase(otpRepo);

    await Promise.all([
      requestUseCase.execute({ phone }),
      requestUseCase.execute({ phone }),
      requestUseCase.execute({ phone }),
    ]);

    const record = await otpRepo.getOTP(phone);
    expect(record).not.toBeNull();
    expect(record?.attempts).toBe(0);
  });

  // ── PARENT-AUTH-020 ────────────────────────────────────────────────────────
  it('PARENT-AUTH-020: Session created after verification belongs to the verified ParentIdentity only', async () => {
    const phone = '+919876543210';
    const reqReq = new NextRequest('http://localhost/api/v1/parent/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    await requestPOST(reqReq);

    const verifyReq = new NextRequest('http://localhost/api/v1/parent/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp: '123456' }),
    });
    const verifyRes = await verifyPOST(verifyReq);
    const setCookie = verifyRes.headers.get('set-cookie');
    const sessionToken = setCookie?.match(/better-auth\.session_token=([^;]+)/)?.[1];

    const authHeaders = new Headers({
      cookie: `better-auth.session_token=${sessionToken}`,
    });

    const parentCtx = await requireParentIdentity(authHeaders);
    expect(parentCtx.parentIdentity.phone).toBe(phone);

    // Ensure session does not map to any other phone
    const dbUser = await db.user.findUnique({
      where: { id: parentCtx.userId },
      include: { parentIdentity: true },
    });
    expect(dbUser?.parentIdentity?.phone).toBe(phone);
  });
});
