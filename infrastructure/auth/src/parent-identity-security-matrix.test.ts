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
  UpdateParentIdentityProfileUseCase,
  ChangeParentIdentityStatusUseCase,
  ParentIdentityEntity,
  PhoneNumber,
} from '@coaching-os/identity';
import { AuthenticationError, ValidationError } from '@coaching-os/shared';

describe('Phase 1.6.5 — Multi-Tenant Security & Authorization Matrix Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('PARENT-SEC-01: Unauthenticated request cannot resolve ParentIdentity', async () => {
    const emptyHeaders = new Headers();
    const resolved = await resolveAuthenticatedParentIdentity(emptyHeaders);
    expect(resolved).toBeNull();

    await expect(requireParentIdentity(emptyHeaders)).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('PARENT-SEC-02 & PARENT-SEC-03 & PARENT-SEC-04 & PARENT-SEC-05: Server ignores client identity, user, institute, and role headers', async () => {
    const inst = await createTestInstitute({ name: 'Security Inst' });
    const repo = new PrismaParentIdentityRepository();
    const createUseCase = new CreateParentIdentityUseCase(repo);

    const targetParent = await createUseCase.execute({
      phone: '+919876543210',
      name: 'Legitimate Parent',
    });

    const victimParent = await createUseCase.execute({
      phone: '+919999999999',
      name: 'Victim Parent',
    });

    const email = `sec_user_${Date.now()}@example.com`;
    const password = 'Password123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'Legitimate User' },
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

    const reqHeaders = new Headers({
      cookie: signInRes.headers.get('set-cookie') || '',
      'x-parent-id': victimParent.id,
      'x-user-id': '00000000-0000-4000-a000-000000000000',
      'x-institute-id': '00000000-0000-4000-a000-000000000000',
      'x-role': 'owner',
    });

    const context = await requireParentIdentity(reqHeaders);
    expect(context.userId).toBe(signUpRes.user.id);
    expect(context.parentIdentityId).toBe(targetParent.id);
    expect(context.parentIdentity.name).toBe('Legitimate Parent');
    expect(context.parentIdentityId).not.toBe(victimParent.id);
  });

  it('PARENT-SEC-06: Cross-Tenant identity resolution returns global DTO only without tenant CRM data', async () => {
    const repo = new PrismaParentIdentityRepository();
    const createUseCase = new CreateParentIdentityUseCase(repo);

    const parent = await createUseCase.execute({
      phone: '+919876543210',
      name: 'Global Parent Privacy Test',
    });

    const email = `privacy_${Date.now()}@example.com`;
    const password = 'Password123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'Global User' },
    });

    await db.user.update({
      where: { id: signUpRes.user.id },
      data: {
        phone: '+919876543210',
        parentIdentityId: parent.id,
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
    const dto = context.parentIdentity;

    expect((dto as any).instituteId).toBeUndefined();
    expect((dto as any).memberships).toBeUndefined();
    expect((dto as any).crmNotes).toBeUndefined();
    expect((dto as any).students).toBeUndefined();
    expect(dto.phone).toBe('+919876543210');
  });

  it('PARENT-SEC-08 & PARENT-SEC-09: ParentIdentity domain & repository API operates as internal service layer', async () => {
    const repo = new PrismaParentIdentityRepository();
    const createUseCase = new CreateParentIdentityUseCase(repo);

    const parent = await createUseCase.execute({
      phone: '+919876543210',
      name: 'Internal Lookup Parent',
    });

    const found = await repo.findById(parent.id);
    expect(found).not.toBeNull();
    expect(found?.phone.value).toBe('+919876543210');
  });

  it('PARENT-SEC-11: Canonical E.164 phone normalization prevents duplicate identity creation across input variations', async () => {
    const repo = new PrismaParentIdentityRepository();
    const createUseCase = new CreateParentIdentityUseCase(repo);

    const parent1 = await createUseCase.execute({
      phone: '9876543210',
      name: 'First Variant',
    });

    // Attempt second creation with formatted input: +91 98765 43210
    const parent2 = await createUseCase.execute({
      phone: '+91 98765 43210',
      name: 'Second Variant',
    });

    // Both resolve to the exact same canonical parent ID
    expect(parent1.id).toBe(parent2.id);

    const count = await db.parentIdentity.count({
      where: { phone: '+919876543210' },
    });
    expect(count).toBe(1);
  });

  it('PARENT-SEC-12: Concurrent identity creation yields exactly 1 ParentIdentity record', async () => {
    const inst = await createTestInstitute();
    const email = `sec_concurrent_${Date.now()}@example.com`;
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

    const results = await Promise.all([
      resolveAuthenticatedParentIdentity(reqHeaders, { autoCreateIfMissing: true }),
      resolveAuthenticatedParentIdentity(reqHeaders, { autoCreateIfMissing: true }),
      resolveAuthenticatedParentIdentity(reqHeaders, { autoCreateIfMissing: true }),
      resolveAuthenticatedParentIdentity(reqHeaders, { autoCreateIfMissing: true }),
      resolveAuthenticatedParentIdentity(reqHeaders, { autoCreateIfMissing: true }),
    ]);

    const ids = results.map((r) => r?.parentIdentityId);
    expect(new Set(ids).size).toBe(1);

    const count = await db.parentIdentity.count({
      where: { phone: '+919876543210' },
    });
    expect(count).toBe(1);
  });

  it('PARENT-SEC-13: Deactivated status is terminal and rejects profile mutation & reactivation', async () => {
    const repo = new PrismaParentIdentityRepository();
    const createUseCase = new CreateParentIdentityUseCase(repo);
    const updateProfileUseCase = new UpdateParentIdentityProfileUseCase(repo);
    const changeStatusUseCase = new ChangeParentIdentityStatusUseCase(repo);

    const parent = await createUseCase.execute({
      phone: '+919876543210',
      name: 'Terminal Parent',
    });

    // Change status to deactivated
    await changeStatusUseCase.execute({ id: parent.id, status: 'deactivated' });

    // Attempt profile mutation on deactivated identity -> throws ValidationError
    await expect(
      updateProfileUseCase.execute({ id: parent.id, name: 'Hacked Name' }),
    ).rejects.toThrow(ValidationError);

    // Attempt status change back to active -> throws ValidationError
    await expect(
      changeStatusUseCase.execute({ id: parent.id, status: 'active' }),
    ).rejects.toThrow(ValidationError);
  });

  it('PARENT-SEC-15: Session revocation stops ParentIdentity resolution immediately', async () => {
    const inst = await createTestInstitute();
    const repo = new PrismaParentIdentityRepository();
    const createUseCase = new CreateParentIdentityUseCase(repo);

    const parent = await createUseCase.execute({
      phone: '+919876543210',
      name: 'Revocation Test Parent',
    });

    const email = `revocation_${Date.now()}@example.com`;
    const password = 'Password123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'Revocation User' },
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

    const cookieHeader = signInRes.headers.get('set-cookie') || '';
    const reqHeaders = new Headers({ cookie: cookieHeader });

    // Verify access works while session is active
    const activeContext = await requireParentIdentity(reqHeaders);
    expect(activeContext.parentIdentityId).toBe(parent.id);

    // Sign out to revoke session
    await auth.api.signOut({ headers: reqHeaders });

    // Session resolution fails after revocation
    await expect(requireParentIdentity(reqHeaders)).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('PARENT-SEC-16: Missing user.parentIdentityId safely falls back to phone resolution or null', async () => {
    const email = `missing_link_${Date.now()}@example.com`;
    const password = 'Password123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'No Phone User' },
    });

    const signInRes = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    const reqHeaders = new Headers({
      cookie: signInRes.headers.get('set-cookie') || '',
    });

    // Without phone or parentIdentityId, resolveAuthenticatedParentIdentity returns null safely
    const resolved = await resolveAuthenticatedParentIdentity(reqHeaders, {
      autoCreateIfMissing: false,
    });
    expect(resolved).toBeNull();
  });

  it('PARENT-SEC-18: Existing phone match automatically links without creating duplicate ParentIdentity', async () => {
    const inst = await createTestInstitute();
    const repo = new PrismaParentIdentityRepository();
    const createUseCase = new CreateParentIdentityUseCase(repo);

    // Pre-existing identity created via another path (e.g. offline onboarding)
    const existingParent = await createUseCase.execute({
      phone: '+919876543210',
      name: 'Pre-existing Parent',
    });

    const email = `auto_link_${Date.now()}@example.com`;
    const password = 'Password123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'Auto Link User' },
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

    const context = await requireParentIdentity(reqHeaders, {
      autoCreateIfMissing: true,
    });

    // Linked to pre-existing identity ID without duplicate creation
    expect(context.parentIdentityId).toBe(existingParent.id);

    const totalInDb = await db.parentIdentity.count({
      where: { phone: '+919876543210' },
    });
    expect(totalInDb).toBe(1);
  });

  it('PARENT-SEC-20: ParentIdentityDTO strips all internal database relations and authentication secrets', () => {
    const parentEntity = ParentIdentityEntity.create({
      phone: PhoneNumber.create('+919876543210'),
      name: 'DTO Test Parent',
      avatar: 'https://example.com/avatar.jpg',
    });

    const dto = parentEntity.toDTO();

    expect(Object.keys(dto).sort()).toEqual(
      ['id', 'phone', 'name', 'avatar', 'status', 'createdAt', 'updatedAt'].sort(),
    );
    expect((dto as any).password).toBeUndefined();
    expect((dto as any).instituteId).toBeUndefined();
    expect((dto as any).memberships).toBeUndefined();
  });

  it('PARENT-SEC-23: ParentIdentity entity contains zero tenant properties', () => {
    const parentEntity = ParentIdentityEntity.create({
      phone: PhoneNumber.create('+919876543210'),
      name: 'Pure Domain Parent',
    });

    expect((parentEntity as any).instituteId).toBeUndefined();
    expect((parentEntity as any).tenantId).toBeUndefined();
    expect((parentEntity as any).membershipId).toBeUndefined();
  });

  it('PARENT-SEC-25: Database schema enforces @unique constraint on phone field', async () => {
    const repo = new PrismaParentIdentityRepository();
    const parent1 = ParentIdentityEntity.create({
      phone: PhoneNumber.create('+919876543210'),
      name: 'Unique Test 1',
    });

    await repo.create(parent1);

    const parent2 = ParentIdentityEntity.create({
      phone: PhoneNumber.create('+919876543210'),
      name: 'Unique Test 2',
    });

    // Persistence layer catches P2002 duplicate key constraint and throws ConflictError
    await expect(repo.create(parent2)).rejects.toThrow();
  });
});
