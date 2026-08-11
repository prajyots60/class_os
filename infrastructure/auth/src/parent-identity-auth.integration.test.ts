import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { auth } from './auth';
import {
  resolveAuthenticatedParentIdentity,
  requireParentIdentity,
} from './session';
import {
  db,
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  createTestInstitute,
} from '@coaching-os/database';
import {
  PrismaParentIdentityRepository,
  CreateParentIdentityUseCase,
  ChangeParentIdentityStatusUseCase,
} from '@coaching-os/identity';
import { AuthenticationError, AuthorizationError } from '@coaching-os/shared';

describe('Phase 1.6.4 — Better Auth ↔ ParentIdentity Integration Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('AUTH-PARENT-01: Unauthenticated request cannot resolve ParentIdentity', async () => {
    const emptyHeaders = new Headers();
    const resolved = await resolveAuthenticatedParentIdentity(emptyHeaders);
    expect(resolved).toBeNull();

    await expect(requireParentIdentity(emptyHeaders)).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('AUTH-PARENT-02: Authenticated user with linked ParentIdentity resolves correct identity', async () => {
    const inst = await createTestInstitute({ name: 'Integration Inst' });
    const repo = new PrismaParentIdentityRepository();
    const createUseCase = new CreateParentIdentityUseCase(repo);

    const parent = await createUseCase.execute({
      phone: '+919876543210',
      name: 'Linked Parent',
    });

    const email = `parent_${Date.now()}@example.com`;
    const password = 'Password123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'Linked Parent' },
    });

    // Link user to parentIdentityId
    await db.user.update({
      where: { id: signUpRes.user.id },
      data: {
        phone: '+919876543210',
        parentIdentityId: parent.id,
        instituteId: inst.id,
      },
    });

    const signInRes = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    const cookieHeader = signInRes.headers.get('set-cookie') || '';
    const reqHeaders = new Headers({ cookie: cookieHeader });

    const context = await requireParentIdentity(reqHeaders);
    expect(context.userId).toBe(signUpRes.user.id);
    expect(context.parentIdentityId).toBe(parent.id);
    expect(context.parentIdentity.phone).toBe('+919876543210');
  });

  it('AUTH-PARENT-03: Authenticated user without ParentIdentity follows defined creation/resolution path', async () => {
    const inst = await createTestInstitute();
    const email = `newparent_${Date.now()}@example.com`;
    const password = 'Password123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'New Parent User' },
    });

    await db.user.update({
      where: { id: signUpRes.user.id },
      data: { phone: '9876543210', instituteId: inst.id },
    });

    const signInRes = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    const reqHeaders = new Headers({
      cookie: signInRes.headers.get('set-cookie') || '',
    });

    // Without autoCreateIfMissing, returns null
    const noAuto = await resolveAuthenticatedParentIdentity(reqHeaders, {
      autoCreateIfMissing: false,
    });
    expect(noAuto).toBeNull();

    // With autoCreateIfMissing, resolves & creates
    const autoContext = await requireParentIdentity(reqHeaders, {
      autoCreateIfMissing: true,
    });
    expect(autoContext.parentIdentityId).toBeDefined();
    expect(autoContext.parentIdentity.phone).toBe('+919876543210');
  });

  it('AUTH-PARENT-04 & AUTH-PARENT-05 & AUTH-PARENT-06: Client-supplied parentId, userId, or instituteId cannot override server identity resolution', async () => {
    const inst = await createTestInstitute();
    const repo = new PrismaParentIdentityRepository();
    const createUseCase = new CreateParentIdentityUseCase(repo);

    const targetParent = await createUseCase.execute({
      phone: '+919876543210',
      name: 'Real Parent',
    });

    const spoofedParent = await createUseCase.execute({
      phone: '+919999999999',
      name: 'Spoofed Parent',
    });

    const email = `security_user_${Date.now()}@example.com`;
    const password = 'Password123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'Real Parent User' },
    });

    await db.user.update({
      where: { id: signUpRes.user.id },
      data: {
        phone: '+919876543210',
        parentIdentityId: targetParent.id,
        instituteId: inst.id,
      },
    });

    const signInRes = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    // Pass spoofed headers in client request
    const reqHeaders = new Headers({
      cookie: signInRes.headers.get('set-cookie') || '',
      'x-parent-id': spoofedParent.id,
      'x-user-id': '00000000-0000-4000-a000-000000000000',
      'x-institute-id': '00000000-0000-4000-a000-000000000000',
    });

    const context = await requireParentIdentity(reqHeaders);
    // Verified: Server strictly resolves session user ID and linked targetParent
    expect(context.userId).toBe(signUpRes.user.id);
    expect(context.parentIdentityId).toBe(targetParent.id);
    expect(context.parentIdentityId).not.toBe(spoofedParent.id);
  });

  it('AUTH-PARENT-08: Concurrent resolution does not create duplicate ParentIdentity records', async () => {
    const inst = await createTestInstitute();
    const email = `concurrent_${Date.now()}@example.com`;
    const password = 'Password123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'Concurrent User' },
    });

    await db.user.update({
      where: { id: signUpRes.user.id },
      data: { phone: '+919876543210', instituteId: inst.id },
    });

    const signInRes = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    const reqHeaders = new Headers({
      cookie: signInRes.headers.get('set-cookie') || '',
    });

    // Simulate 5 parallel requests attempting auto-creation
    const results = await Promise.all([
      resolveAuthenticatedParentIdentity(reqHeaders, { autoCreateIfMissing: true }),
      resolveAuthenticatedParentIdentity(reqHeaders, { autoCreateIfMissing: true }),
      resolveAuthenticatedParentIdentity(reqHeaders, { autoCreateIfMissing: true }),
      resolveAuthenticatedParentIdentity(reqHeaders, { autoCreateIfMissing: true }),
      resolveAuthenticatedParentIdentity(reqHeaders, { autoCreateIfMissing: true }),
    ]);

    const ids = results.map((r) => r?.parentIdentityId);
    // All 5 requests resolve to the EXACT SAME parent identity ID
    expect(new Set(ids).size).toBe(1);

    const dbCount = await db.parentIdentity.count({
      where: { phone: '+919876543210' },
    });
    expect(dbCount).toBe(1);
  });

  it('AUTH-PARENT-09: Deactivated ParentIdentity returns AuthenticationError and rejects access', async () => {
    const inst = await createTestInstitute();
    const repo = new PrismaParentIdentityRepository();
    const createUseCase = new CreateParentIdentityUseCase(repo);
    const statusUseCase = new ChangeParentIdentityStatusUseCase(repo);

    const parent = await createUseCase.execute({
      phone: '+919876543210',
      name: 'Deactivated Parent',
    });

    await statusUseCase.execute({ id: parent.id, status: 'deactivated' });

    const email = `deactivated_${Date.now()}@example.com`;
    const password = 'Password123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'Deactivated User' },
    });

    await db.user.update({
      where: { id: signUpRes.user.id },
      data: {
        phone: '+919876543210',
        parentIdentityId: parent.id,
        instituteId: inst.id,
      },
    });

    const signInRes = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    const reqHeaders = new Headers({
      cookie: signInRes.headers.get('set-cookie') || '',
    });

    await expect(requireParentIdentity(reqHeaders)).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('AUTH-PARENT-10: Global ParentIdentity resolution does not expose tenant membership or CRM fields', async () => {
    const inst = await createTestInstitute();
    const repo = new PrismaParentIdentityRepository();
    const createUseCase = new CreateParentIdentityUseCase(repo);

    const parent = await createUseCase.execute({
      phone: '+919876543210',
      name: 'Global Parent',
    });

    const email = `global_${Date.now()}@example.com`;
    const password = 'Password123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'Global User' },
    });

    await db.user.update({
      where: { id: signUpRes.user.id },
      data: {
        phone: '+919876543210',
        parentIdentityId: parent.id,
        instituteId: inst.id,
      },
    });

    const signInRes = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    const reqHeaders = new Headers({
      cookie: signInRes.headers.get('set-cookie') || '',
    });

    const context = await requireParentIdentity(reqHeaders);
    // DTO boundary check: parentIdentity object contains NO tenant fields (no instituteId, no memberships, no CRM fields)
    expect((context.parentIdentity as any).instituteId).toBeUndefined();
    expect((context.parentIdentity as any).memberships).toBeUndefined();
    expect(context.parentIdentity.phone).toBe('+919876543210');
  });
});
