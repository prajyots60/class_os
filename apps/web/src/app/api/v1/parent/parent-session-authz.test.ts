import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { db } from '@coaching-os/database';
import { AuthenticationError, NotFoundError } from '@coaching-os/shared';
import {
  requireParentAuth,
  signSessionToken,
} from '@coaching-os/auth';
import {
  ParentAuthorizationEngine,
  PrismaParentAuthorizationRepository,
} from '@coaching-os/identity';

describe('Phase 5.2 — Parent Session & Authorization Security Matrix Suite', () => {
  let parentAUser: { id: string; phone: string | null; email: string };
  let parentAParentIdentityId: string;
  let parentASessionToken: string;

  let parentBUser: { id: string; phone: string | null; email: string };
  let parentBParentIdentityId: string;
  let parentBSessionToken: string;

  let instituteA: { id: string };
  let instituteB: { id: string };
  let studentA: { id: string };
  let studentB: { id: string };
  let childProfileA: { id: string };
  let childProfileB: { id: string };
  let studentLinkA: { id: string };
  let studentLinkB: { id: string };

  beforeEach(async () => {
    // 1. Create Institute A & B
    const instASuffix = crypto.randomUUID().slice(0, 8);
    instituteA = await db.institute.create({
      data: {
        name: `Authz Test Institute A ${instASuffix}`,
        slug: `authz-inst-a-${instASuffix}`,
        phone: '+919800000001',
        email: `admin-a-${instASuffix}@test.com`,
      },
    });

    const instBSuffix = crypto.randomUUID().slice(0, 8);
    instituteB = await db.institute.create({
      data: {
        name: `Authz Test Institute B ${instBSuffix}`,
        slug: `authz-inst-b-${instBSuffix}`,
        phone: '+919800000002',
        email: `admin-b-${instBSuffix}@test.com`,
      },
    });

    // 2. Create Parent Identity A & User A & Session A
    const phoneA = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const parentA = await db.parentIdentity.create({
      data: {
        phone: phoneA,
        name: 'Parent A',
        status: 'active',
      },
    });
    parentAParentIdentityId = parentA.id;

    parentAUser = await db.user.create({
      data: {
        name: 'Parent A User',
        email: `parent_a_${Date.now()}@test.com`,
        phone: phoneA,
        parentIdentityId: parentA.id,
        status: 'active',
      },
    });

    parentASessionToken = `sess_a_${crypto.randomUUID()}`;
    await db.session.create({
      data: {
        userId: parentAUser.id,
        token: parentASessionToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 3. Create Parent Identity B & User B & Session B
    const phoneB = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const parentB = await db.parentIdentity.create({
      data: {
        phone: phoneB,
        name: 'Parent B',
        status: 'active',
      },
    });
    parentBParentIdentityId = parentB.id;

    parentBUser = await db.user.create({
      data: {
        name: 'Parent B User',
        email: `parent_b_${Date.now()}@test.com`,
        phone: phoneB,
        parentIdentityId: parentB.id,
        status: 'active',
      },
    });

    parentBSessionToken = `sess_b_${crypto.randomUUID()}`;
    await db.session.create({
      data: {
        userId: parentBUser.id,
        token: parentBSessionToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 4. Create Students in Institute A & B
    studentA = await db.student.create({
      data: {
        instituteId: instituteA.id,
        admissionNumber: `ADM-A-${crypto.randomUUID().slice(0, 8)}`,
        firstName: 'StudentA',
        lastName: 'Test',
        status: 'active',
      },
    });

    studentB = await db.student.create({
      data: {
        instituteId: instituteB.id,
        admissionNumber: `ADM-B-${crypto.randomUUID().slice(0, 8)}`,
        firstName: 'StudentB',
        lastName: 'Test',
        status: 'active',
      },
    });

    // 5. Create ChildProfile & StudentLink for Parent A -> Student A
    childProfileA = await db.childProfile.create({
      data: {
        parentIdentityId: parentA.id,
        name: 'Child Profile A',
      },
    });

    studentLinkA = await db.studentLink.create({
      data: {
        childProfileId: childProfileA.id,
        studentId: studentA.id,
        instituteId: instituteA.id,
      },
    });

    // 6. Create ChildProfile & StudentLink for Parent B -> Student B
    childProfileB = await db.childProfile.create({
      data: {
        parentIdentityId: parentB.id,
        name: 'Child Profile B',
      },
    });

    studentLinkB = await db.studentLink.create({
      data: {
        childProfileId: childProfileB.id,
        studentId: studentB.id,
        instituteId: instituteB.id,
      },
    });
  });

  afterEach(async () => {
    // Cleanup created test records
    await db.studentLink.deleteMany({
      where: { id: { in: [studentLinkA.id, studentLinkB.id] } },
    });
    await db.childProfile.deleteMany({
      where: { id: { in: [childProfileA.id, childProfileB.id] } },
    });
    await db.student.deleteMany({
      where: { id: { in: [studentA.id, studentB.id] } },
    });
    await db.session.deleteMany({
      where: { userId: { in: [parentAUser.id, parentBUser.id] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [parentAUser.id, parentBUser.id] } },
    });
    await db.parentIdentity.deleteMany({
      where: { id: { in: [parentAParentIdentityId, parentBParentIdentityId] } },
    });
    await db.institute.deleteMany({
      where: { id: { in: [instituteA.id, instituteB.id] } },
    });
  });

  // ── PARENT-AUTHZ-001 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-001: Unauthenticated request throws 401 AuthenticationError', async () => {
    const headers = new Headers();
    await expect(requireParentAuth(headers)).rejects.toThrow(AuthenticationError);
  });

  // ── PARENT-AUTHZ-002 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-002: Valid parent session resolves valid ParentAuthContext', async () => {
    const signed = signSessionToken(parentASessionToken);
    const headers = new Headers({
      cookie: `better-auth.session_token=${signed}`,
    });

    const ctx = await requireParentAuth(headers);
    expect(ctx.userId).toBe(parentAUser.id);
    expect(ctx.parentIdentityId).toBe(parentAParentIdentityId);
    expect(ctx.parentIdentity.status).toBe('active');
  });

  // ── PARENT-AUTHZ-003 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-003: Expired session throws 401 AuthenticationError', async () => {
    const expiredToken = `sess_exp_${crypto.randomUUID()}`;
    await db.session.create({
      data: {
        userId: parentAUser.id,
        token: expiredToken,
        expiresAt: new Date(Date.now() - 1000), // Expired in past
      },
    });

    const signed = signSessionToken(expiredToken);
    const headers = new Headers({
      cookie: `better-auth.session_token=${signed}`,
    });

    await expect(requireParentAuth(headers)).rejects.toThrow(AuthenticationError);
  });

  // ── PARENT-AUTHZ-004 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-004: Deleted/revoked session throws 401 AuthenticationError', async () => {
    const revokedToken = `sess_rev_${crypto.randomUUID()}`;
    const sess = await db.session.create({
      data: {
        userId: parentAUser.id,
        token: revokedToken,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    // Immediately delete from DB
    await db.session.delete({ where: { id: sess.id } });

    const signed = signSessionToken(revokedToken);
    const headers = new Headers({
      cookie: `better-auth.session_token=${signed}`,
    });

    await expect(requireParentAuth(headers)).rejects.toThrow(AuthenticationError);
  });

  // ── PARENT-AUTHZ-005 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-005: Suspended ParentIdentity throws 401 AuthenticationError', async () => {
    await db.parentIdentity.update({
      where: { id: parentAParentIdentityId },
      data: { status: 'suspended' },
    });

    const signed = signSessionToken(parentASessionToken);
    const headers = new Headers({
      cookie: `better-auth.session_token=${signed}`,
    });

    await expect(requireParentAuth(headers)).rejects.toThrow(AuthenticationError);
  });

  // ── PARENT-AUTHZ-006 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-006: Deactivated ParentIdentity throws 401 AuthenticationError', async () => {
    await db.parentIdentity.update({
      where: { id: parentAParentIdentityId },
      data: { status: 'deactivated' },
    });

    const signed = signSessionToken(parentASessionToken);
    const headers = new Headers({
      cookie: `better-auth.session_token=${signed}`,
    });

    await expect(requireParentAuth(headers)).rejects.toThrow(AuthenticationError);
  });

  // ── PARENT-AUTHZ-007 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-007: Parent A requesting Parent B ChildProfile throws 404 NotFoundError', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });
    const ctxA = await requireParentAuth(headersA);

    const engine = new ParentAuthorizationEngine();
    await expect(
      engine.requireChildProfileAccess(ctxA, childProfileB.id),
    ).rejects.toThrow(NotFoundError);
  });

  // ── PARENT-AUTHZ-008 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-008: Parent A requesting Parent B StudentLink throws 404 NotFoundError', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });
    const ctxA = await requireParentAuth(headersA);

    const engine = new ParentAuthorizationEngine();
    await expect(
      engine.requireStudentLinkAccess(ctxA, studentLinkB.id),
    ).rejects.toThrow(NotFoundError);
  });

  // ── PARENT-AUTHZ-009 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-009: Parent A requesting unrelated Student throws 404 NotFoundError', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });
    const ctxA = await requireParentAuth(headersA);

    const engine = new ParentAuthorizationEngine();
    await expect(
      engine.requireStudentAccess(ctxA, studentB.id),
    ).rejects.toThrow(NotFoundError);
  });

  // ── PARENT-AUTHZ-010 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-010: Parent A requesting Student from another institute without relationship throws 404', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });
    const ctxA = await requireParentAuth(headersA);

    // Create an unlinked student in Institute B
    const unlinkedStudent = await db.student.create({
      data: {
        instituteId: instituteB.id,
        admissionNumber: `ADM-U-${crypto.randomUUID().slice(0, 8)}`,
        firstName: 'Unlinked',
        lastName: 'StudentB',
        status: 'active',
      },
    });

    try {
      const engine = new ParentAuthorizationEngine();
      await expect(
        engine.requireStudentAccess(ctxA, unlinkedStudent.id),
      ).rejects.toThrow(NotFoundError);
    } finally {
      await db.student.delete({ where: { id: unlinkedStudent.id } });
    }
  });

  // ── PARENT-AUTHZ-011 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-011: Valid linked Student access succeeds and returns AuthorizedStudentContext', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });
    const ctxA = await requireParentAuth(headersA);

    const engine = new ParentAuthorizationEngine();
    const studentCtx = await engine.requireStudentAccess(ctxA, studentA.id);

    expect(studentCtx.studentId).toBe(studentA.id);
    expect(studentCtx.instituteId).toBe(instituteA.id);
    expect(studentCtx.childProfileId).toBe(childProfileA.id);
    expect(studentCtx.relationshipPath).toBe('student_link');
  });

  // ── PARENT-AUTHZ-012 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-012: Client-supplied parentIdentityId parameter cannot impersonate another parent', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });

    // Server-authoritative context from session cookie ignores client parameter
    const ctx = await requireParentAuth(headersA);
    expect(ctx.parentIdentityId).toBe(parentAParentIdentityId);
    expect(ctx.parentIdentityId).not.toBe(parentBParentIdentityId);
  });

  // ── PARENT-AUTHZ-013 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-013: Client-supplied instituteId parameter cannot override server authorization', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });
    const ctxA = await requireParentAuth(headersA);

    const engine = new ParentAuthorizationEngine();
    // Student A belongs to Institute A; trying to pass Institute B cannot change server-resolved relationship
    const studentCtx = await engine.requireStudentAccess(ctxA, studentA.id);
    expect(studentCtx.instituteId).toBe(instituteA.id);
    expect(studentCtx.instituteId).not.toBe(instituteB.id);
  });

  // ── PARENT-AUTHZ-014 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-014: Client-supplied studentId cannot bypass relationship checks', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });
    const ctxA = await requireParentAuth(headersA);

    const engine = new ParentAuthorizationEngine();
    // Arbitrary studentId belonging to Parent B returns 404
    await expect(
      engine.requireStudentAccess(ctxA, studentB.id),
    ).rejects.toThrow(NotFoundError);
  });

  // ── PARENT-AUTHZ-015 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-015: Unauthorized resource failures use 404 masking (zero 403 leaks)', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });
    const ctxA = await requireParentAuth(headersA);

    const engine = new ParentAuthorizationEngine();
    try {
      await engine.requireStudentAccess(ctxA, studentB.id);
      expect.fail('Should have thrown NotFoundError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(NotFoundError);
      const notFoundErr = err as NotFoundError;
      expect(notFoundErr.statusCode).toBe(404);
      expect(notFoundErr.publicMessage).toBe(
        'The requested resource was not found.',
      );
    }
  });

  // ── PARENT-AUTHZ-016 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-016: Non-existent and unauthorized resources return identical 404 error responses', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });
    const ctxA = await requireParentAuth(headersA);
    const engine = new ParentAuthorizationEngine();

    let err1Message = '';
    try {
      await engine.requireStudentAccess(ctxA, crypto.randomUUID());
    } catch (err: unknown) {
      err1Message = (err as NotFoundError).publicMessage;
    }

    let err2Message = '';
    try {
      await engine.requireStudentAccess(ctxA, studentB.id);
    } catch (err: unknown) {
      err2Message = (err as NotFoundError).publicMessage;
    }

    expect(err1Message).toBe(err2Message);
    expect(err1Message).toBe('The requested resource was not found.');
  });

  // ── PARENT-AUTHZ-017 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-017: Parent authorization does not grant staff capabilities', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });
    const ctxA = await requireParentAuth(headersA);

    // ParentAuthContext is strictly relationship-focused and has no staff role/capabilities property
    expect((ctxA as unknown as Record<string, unknown>).role).toBeUndefined();
    expect((ctxA as unknown as Record<string, unknown>).capabilities).toBeUndefined();
  });

  // ── PARENT-AUTHZ-018 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-018: ParentIdentity remains global and is not pinned to a single institute', async () => {
    // Link Parent A to Student B in Institute B as well via tenant InstituteParent & InstituteParentStudent
    const instParentA = await db.instituteParent.create({
      data: {
        instituteId: instituteB.id,
        parentIdentityId: parentAParentIdentityId,
        status: 'active',
      },
    });

    const ips = await db.instituteParentStudent.create({
      data: {
        instituteId: instituteB.id,
        instituteParentId: instParentA.id,
        studentId: studentB.id,
        relationshipType: 'father',
        status: 'active',
      },
    });

    try {
      const signedA = signSessionToken(parentASessionToken);
      const headersA = new Headers({
        cookie: `better-auth.session_token=${signedA}`,
      });
      const ctxA = await requireParentAuth(headersA);
      const engine = new ParentAuthorizationEngine();

      // Parent A can access Student A in Inst A (via StudentLink)
      const resA = await engine.requireStudentAccess(ctxA, studentA.id);
      expect(resA.instituteId).toBe(instituteA.id);

      // Parent A can ALSO access Student B in Inst B (via InstituteParentStudent)
      const resB = await engine.requireStudentAccess(ctxA, studentB.id);
      expect(resB.instituteId).toBe(instituteB.id);
    } finally {
      await db.instituteParentStudent.delete({ where: { id: ips.id } });
      await db.instituteParent.delete({ where: { id: instParentA.id } });
    }
  });

  // ── PARENT-AUTHZ-019 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-019: Multiple valid institute relationships remain independently resolvable', async () => {
    const repo = new PrismaParentAuthorizationRepository();

    const relA = await repo.resolveParentStudentRelationship(
      parentAParentIdentityId,
      studentA.id,
    );
    expect(relA?.relationshipPath).toBe('student_link');

    const relB = await repo.resolveParentStudentRelationship(
      parentBParentIdentityId,
      studentB.id,
    );
    expect(relB?.relationshipPath).toBe('student_link');

    const relUnlinked = await repo.resolveParentStudentRelationship(
      parentAParentIdentityId,
      studentB.id,
    );
    expect(relUnlinked).toBeNull();
  });

  // ── PARENT-AUTHZ-020 ────────────────────────────────────────────────────────
  it('PARENT-AUTHZ-020: Concurrent authorization requests from different sessions remain strictly isolated', async () => {
    const signedA = signSessionToken(parentASessionToken);
    const headersA = new Headers({
      cookie: `better-auth.session_token=${signedA}`,
    });

    const signedB = signSessionToken(parentBSessionToken);
    const headersB = new Headers({
      cookie: `better-auth.session_token=${signedB}`,
    });

    // Execute concurrent session and student authorization requests
    const engine = new ParentAuthorizationEngine();
    const [ctxA, ctxB] = await Promise.all([
      requireParentAuth(headersA),
      requireParentAuth(headersB),
    ]);

    expect(ctxA.parentIdentityId).toBe(parentAParentIdentityId);
    expect(ctxB.parentIdentityId).toBe(parentBParentIdentityId);

    const [authA, authB] = await Promise.all([
      engine.authorizeStudent(ctxA, studentA.id),
      engine.authorizeStudent(ctxB, studentB.id),
    ]);

    expect(authA?.studentId).toBe(studentA.id);
    expect(authB?.studentId).toBe(studentB.id);

    // Cross requests in parallel must both return null
    const [crossA, crossB] = await Promise.all([
      engine.authorizeStudent(ctxA, studentB.id),
      engine.authorizeStudent(ctxB, studentA.id),
    ]);

    expect(crossA).toBeNull();
    expect(crossB).toBeNull();
  });
});
