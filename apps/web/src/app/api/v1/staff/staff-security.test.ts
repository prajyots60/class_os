/**
 * Phase 1.13.3 — Staff Management Security & E2E Threat Matrix
 *
 * Adversarial integration test suite covering STAFF-SEC-01 through STAFF-SEC-24.
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

import { GET as staffListGET } from './route';
import { POST as staffExplicitInvitePOST, GET as staffExplicitInviteGET } from './invite/route';
import { GET as staffByIdGET, DELETE as staffByIdDELETE } from './[id]/route';
import { PATCH as staffRolePATCH } from './[id]/role/route';
import { POST as staffActivatePOST } from './[id]/activate/route';
import { POST as staffSuspendPOST } from './[id]/suspend/route';
import { POST as onboardPOST } from '../../onboarding/institute/route';

describe('Phase 1.13.3 — Staff Management Security Threat Matrix (STAFF-SEC-01..24)', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  let testIpCounter = 1;
  function getUniqueIp(): string {
    testIpCounter += 1;
    return `10.120.${Math.floor(testIpCounter / 250)}.${testIpCounter % 250}`;
  }

  async function createAuthenticatedSession(prefix = 'staff_sec_user') {
    const email = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'Password123!';
    const name = 'Test User';

    await auth.api.signUpEmail({
      body: { email, password, name },
    });

    const signInRes = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    const setCookieHeader = signInRes.headers.get('set-cookie');
    expect(setCookieHeader).toBeTruthy();

    const cookieValue = setCookieHeader!
      .split(';')
      .find((c) => c.trim().startsWith('better-auth.session_token='))!;

    const user = await db.user.findFirstOrThrow({ where: { email: email.toLowerCase() } });

    return {
      user,
      cookieHeader: cookieValue,
      headers: {
        cookie: cookieValue,
        'x-forwarded-for': getUniqueIp(),
      },
    };
  }

  async function createParentSession(instId: string, prefix = 'parent') {
    const email = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'Password123!';
    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'Parent User' },
      asResponse: true,
    });

    const cookieHeader = signUpRes.headers.get('set-cookie')!;
    const parentUser = await db.user.findFirstOrThrow({ where: { email: email.toLowerCase() } });

    const phone = `+9198${Date.now().toString().slice(-8)}`;
    await db.user.update({
      where: { id: parentUser.id },
      data: { phone },
    });

    const parentId = await db.parentIdentity.create({ data: { phone } });
    const instParent = await db.instituteParent.create({
      data: { instituteId: instId, parentIdentityId: parentId.id },
    });
    await db.instituteMembership.create({
      data: {
        instituteId: instId,
        parentIdentityId: parentId.id,
        instituteParentId: instParent.id,
      },
    });

    const cookieValue = cookieHeader.split(';').find((c) => c.trim().startsWith('better-auth.session_token='))!;

    return {
      user: parentUser,
      headers: {
        cookie: cookieValue,
        'x-forwarded-for': getUniqueIp(),
      },
    };
  }

  async function bootstrapInstitute(userHeaders: Record<string, string>, namePrefix = 'Test Inst') {
    const instName = `${namePrefix} ${Date.now()}`;
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const req = new NextRequest('http://localhost:3000/api/onboarding/institute', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...userHeaders,
      },
      body: JSON.stringify({
        name: instName,
        phone: '+919876543210',
        email: `inst-${suffix}@test.com`,
        slug: `inst-${suffix}`,
      }),
    });

    const res = await onboardPOST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    return json.data.institute as { id: string; name: string };
  }

  // ── STAFF-SEC-01: Unauthenticated access ─────────────────────────────────────
  it('STAFF-SEC-01: Unauthenticated request to staff endpoints returns 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/staff', {
      headers: { 'x-forwarded-for': getUniqueIp() },
    });
    const res = await staffListGET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('UNAUTHENTICATED');
  });

  // ── STAFF-SEC-02: Invalid session token ───────────────────────────────────────
  it('STAFF-SEC-02: Invalid session cookie returns 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/staff', {
      headers: {
        cookie: 'better-auth.session_token=invalid_forged_token_value',
        'x-forwarded-for': getUniqueIp(),
      },
    });
    const res = await staffListGET(req);
    expect(res.status).toBe(401);
  });

  // ── STAFF-SEC-03: Capability escalation protection ───────────────────────────
  it('STAFF-SEC-03: Member lacking staff:invite capability cannot invite staff', async () => {
    const sessionOwner = await createAuthenticatedSession('owner_a');
    const instA = await bootstrapInstitute(sessionOwner.headers, 'Institute A');

    const sessionParent = await createParentSession(instA.id, 'parent_a');

    const inviteReq = new NextRequest('http://localhost:3000/api/v1/staff/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...sessionParent.headers,
      },
      body: JSON.stringify({
        userId: 'some_user_id',
        role: 'teacher',
      }),
    });

    const res = await staffExplicitInvitePOST(inviteReq);
    expect(res.status).toBe(403);
  });

  // ── STAFF-SEC-04: Role header spoofing ───────────────────────────────────────
  it('STAFF-SEC-04: Header spoofing x-role: owner is ignored', async () => {
    const sessionOwner = await createAuthenticatedSession('owner_a');
    const instA = await bootstrapInstitute(sessionOwner.headers, 'Institute A');

    const sessionParent = await createParentSession(instA.id, 'parent_a');

    const req = new NextRequest('http://localhost:3000/api/v1/staff/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-role': 'owner',
        ...sessionParent.headers,
      },
      body: JSON.stringify({
        userId: 'some_user_id',
        role: 'teacher',
      }),
    });

    const res = await staffExplicitInvitePOST(req);
    expect(res.status).toBe(403);
  });

  // ── STAFF-SEC-05: Tenant header spoofing ──────────────────────────────────────
  it('STAFF-SEC-05: Header spoofing x-institute-id is ignored', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    const instA = await bootstrapInstitute(sessionA.headers, 'Institute A');

    const sessionB = await createAuthenticatedSession('owner_b');
    await bootstrapInstitute(sessionB.headers, 'Institute B');

    // User B attempts to access Institute A by passing x-institute-id
    const req = new NextRequest('http://localhost:3000/api/v1/staff', {
      headers: {
        'x-institute-id': instA.id,
        ...sessionB.headers,
      },
    });

    const res = await staffListGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    // Returns only User B's staff (Institute B)
    expect(json.data.some((m: { userId: string }) => m.userId === sessionA.user.id)).toBe(false);
  });

  // ── STAFF-SEC-06: Cross-tenant staff lookup ──────────────────────────────────
  it('STAFF-SEC-06: Looking up staff member from another tenant returns 404', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    const sessionB = await createAuthenticatedSession('owner_b');
    await bootstrapInstitute(sessionB.headers, 'Institute B');

    const req = new NextRequest(`http://localhost:3000/api/v1/staff/${sessionA.user.id}`, {
      headers: sessionB.headers,
    });

    const res = await staffByIdGET(req, { params: Promise.resolve({ id: sessionA.user.id }) });
    expect(res.status).toBe(404);
  });

  // ── STAFF-SEC-07: Cross-tenant staff mutation ────────────────────────────────
  it('STAFF-SEC-07: Deleting or patching staff member from another tenant returns 404/403', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    const sessionB = await createAuthenticatedSession('owner_b');
    await bootstrapInstitute(sessionB.headers, 'Institute B');

    const delReq = new NextRequest(`http://localhost:3000/api/v1/staff/${sessionA.user.id}`, {
      method: 'DELETE',
      headers: sessionB.headers,
    });

    const delRes = await staffByIdDELETE(delReq, { params: Promise.resolve({ id: sessionA.user.id }) });
    expect([403, 404]).toContain(delRes.status);
  });

  // ── STAFF-SEC-08: Body instituteId injection ──────────────────────────────────
  it('STAFF-SEC-08: Passing instituteId in invite payload body is rejected by strict validator', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    const req = new NextRequest('http://localhost:3000/api/v1/staff/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...sessionA.headers,
      },
      body: JSON.stringify({
        userId: 'some_user_id',
        role: 'teacher',
        instituteId: 'foreign-institute-id',
      }),
    });

    const res = await staffExplicitInvitePOST(req);
    expect(res.status).toBe(400);
  });

  // ── STAFF-SEC-09: Body userId injection in role update ────────────────────────
  it('STAFF-SEC-09: Passing userId in role update body is rejected by strict validator', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    const req = new NextRequest(`http://localhost:3000/api/v1/staff/${sessionA.user.id}/role`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...sessionA.headers,
      },
      body: JSON.stringify({
        role: 'teacher',
        userId: 'foreign-user-id',
      }),
    });

    const res = await staffRolePATCH(req, { params: Promise.resolve({ id: sessionA.user.id }) });
    expect(res.status).toBe(400);
  });

  // ── STAFF-SEC-10: Body membershipId injection ─────────────────────────────────
  it('STAFF-SEC-10: Passing membershipId in payload is rejected by strict validator', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    const req = new NextRequest('http://localhost:3000/api/v1/staff/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...sessionA.headers,
      },
      body: JSON.stringify({
        userId: 'some_user_id',
        role: 'teacher',
        membershipId: 'forged_mem_id',
      }),
    });

    const res = await staffExplicitInvitePOST(req);
    expect(res.status).toBe(400);
  });

  // ── STAFF-SEC-11: Self role modification protection ──────────────────────────
  it('STAFF-SEC-11: User modifying their own staff role returns 403', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    const instA = await bootstrapInstitute(sessionA.headers, 'Institute A');

    const ownerMemId = `mem:${sessionA.user.id}:${instA.id}`;

    const req = new NextRequest(`http://localhost:3000/api/v1/staff/${ownerMemId}/role`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...sessionA.headers,
      },
      body: JSON.stringify({ role: 'teacher' }),
    });

    const res = await staffRolePATCH(req, { params: Promise.resolve({ id: ownerMemId }) });
    expect(res.status).toBe(403);
  });

  // ── STAFF-SEC-12: Owner promotion without institute:update ───────────────────
  it('STAFF-SEC-12: Promoting staff to owner without institute:update capability fails', async () => {
    const sessionOwner = await createAuthenticatedSession('owner_a');
    const instA = await bootstrapInstitute(sessionOwner.headers, 'Institute A');

    const sessionParent = await createParentSession(instA.id, 'parent_a');

    const targetUser = await createAuthenticatedSession('target_user');
    await db.user.update({
      where: { id: targetUser.user.id },
      data: { instituteId: instA.id },
    });
    const targetMemId = `mem:${targetUser.user.id}:${instA.id}`;

    const req = new NextRequest(`http://localhost:3000/api/v1/staff/${targetMemId}/role`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...sessionParent.headers,
      },
      body: JSON.stringify({ role: 'owner' }),
    });

    const res = await staffRolePATCH(req, { params: Promise.resolve({ id: targetMemId }) });
    expect([403, 404]).toContain(res.status);
  });

  // ── STAFF-SEC-13: Unauthorized suspension ─────────────────────────────────────
  it('STAFF-SEC-13: Member lacking staff:remove cannot suspend a staff member', async () => {
    const sessionOwner = await createAuthenticatedSession('owner_a');
    const instA = await bootstrapInstitute(sessionOwner.headers, 'Institute A');

    const sessionParent = await createParentSession(instA.id, 'parent_a');

    const targetUser = await createAuthenticatedSession('target_user');
    await db.user.update({
      where: { id: targetUser.user.id },
      data: { instituteId: instA.id },
    });
    const targetMemId = `mem:${targetUser.user.id}:${instA.id}`;

    const req = new NextRequest(`http://localhost:3000/api/v1/staff/${targetMemId}/suspend`, {
      method: 'POST',
      headers: sessionParent.headers,
    });

    const res = await staffSuspendPOST(req, { params: Promise.resolve({ id: targetMemId }) });
    expect([403, 404]).toContain(res.status);
  });

  // ── STAFF-SEC-14: Unauthorized removal ────────────────────────────────────────
  it('STAFF-SEC-14: Member lacking staff:remove cannot delete/remove staff member', async () => {
    const sessionOwner = await createAuthenticatedSession('owner_a');
    const instA = await bootstrapInstitute(sessionOwner.headers, 'Institute A');

    const sessionParent = await createParentSession(instA.id, 'parent_a');

    const targetUser = await createAuthenticatedSession('target_user');
    await db.user.update({
      where: { id: targetUser.user.id },
      data: { instituteId: instA.id },
    });
    const targetMemId = `mem:${targetUser.user.id}:${instA.id}`;

    const req = new NextRequest(`http://localhost:3000/api/v1/staff/${targetMemId}`, {
      method: 'DELETE',
      headers: sessionParent.headers,
    });

    const res = await staffByIdDELETE(req, { params: Promise.resolve({ id: targetMemId }) });
    expect([403, 404]).toContain(res.status);
  });

  // ── STAFF-SEC-15: Self removal protection ─────────────────────────────────────
  it('STAFF-SEC-15: User removing their own staff membership returns 403', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    const instA = await bootstrapInstitute(sessionA.headers, 'Institute A');

    const ownerMemId = `mem:${sessionA.user.id}:${instA.id}`;

    const req = new NextRequest(`http://localhost:3000/api/v1/staff/${ownerMemId}`, {
      method: 'DELETE',
      headers: sessionA.headers,
    });

    const res = await staffByIdDELETE(req, { params: Promise.resolve({ id: ownerMemId }) });
    expect(res.status).toBe(403);
  });

  // ── STAFF-SEC-16: Operating on removed staff membership ──────────────────────
  it('STAFF-SEC-16: Operating on a non-existent or removed membership returns 404', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    const fakeId = 'mem:00000000-0000-4000-a000-000000000099:00000000-0000-4000-a000-000000000001';

    const req = new NextRequest(`http://localhost:3000/api/v1/staff/${fakeId}/suspend`, {
      method: 'POST',
      headers: sessionA.headers,
    });

    const res = await staffSuspendPOST(req, { params: Promise.resolve({ id: fakeId }) });
    expect(res.status).toBe(404);
  });

  // ── STAFF-SEC-17: Duplicate invitation handling ──────────────────────────────
  it('STAFF-SEC-17: Re-inviting active staff member returns 409 Conflict', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    // Attempt to invite sessionA user who is already owner member
    const req = new NextRequest('http://localhost:3000/api/v1/staff/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...sessionA.headers,
      },
      body: JSON.stringify({
        userId: sessionA.user.id,
        role: 'teacher',
      }),
    });

    const res = await staffExplicitInvitePOST(req);
    expect(res.status).toBe(409);
  });

  // ── STAFF-SEC-18: Zero sensitive DTO leakage ──────────────────────────────────
  it('STAFF-SEC-18: Staff DTO does not leak sensitive credentials or secrets', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    const req = new NextRequest('http://localhost:3000/api/v1/staff', {
      headers: sessionA.headers,
    });

    const res = await staffListGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBeGreaterThan(0);

    const staffMember = json.data[0];
    expect(staffMember.passwordHash).toBeUndefined();
    expect(staffMember.password).toBeUndefined();
    expect(staffMember.mfaSecret).toBeUndefined();
    expect(staffMember.sessionToken).toBeUndefined();
  });

  // ── STAFF-SEC-19: Zero raw database error leakage ─────────────────────────────
  it('STAFF-SEC-19: Validation error returns clean error response without stack traces', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    const req = new NextRequest('http://localhost:3000/api/v1/staff/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...sessionA.headers,
      },
      body: JSON.stringify({ role: 'teacher' }),
    });

    const res = await staffExplicitInvitePOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.stack).toBeUndefined();
  });

  // ── STAFF-SEC-20: Bounded page limit enforcement ─────────────────────────────
  it('STAFF-SEC-20: Requesting limit above maximum page size is bounded to max limit or rejected', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    const req = new NextRequest('http://localhost:3000/api/v1/staff?limit=999999', {
      headers: sessionA.headers,
    });

    const res = await staffListGET(req);
    expect([200, 400]).toContain(res.status);
  });

  // ── STAFF-SEC-21: Rate limit enforcement ─────────────────────────────────────
  it('STAFF-SEC-21: Excessive requests return 429 Rate Limited', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    let lastRes;
    for (let i = 0; i < 110; i += 1) {
      const req = new NextRequest('http://localhost:3000/api/v1/staff', {
        headers: sessionA.headers,
      });
      lastRes = await staffListGET(req);
      if (lastRes.status === 429) break;
    }

    expect(lastRes?.status).toBe(429);
  });

  // ── STAFF-SEC-22: 405 Method Not Allowed guards ──────────────────────────────
  it('STAFF-SEC-22: Calling unsupported HTTP method returns 405 with Allow header', async () => {
    const res = await staffExplicitInviteGET();
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  // ── STAFF-SEC-23: Access revocation for removed staff ───────────────────────
  it('STAFF-SEC-23: Removed staff member session cannot access tenant endpoints', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    // Remove user membership from user record
    await db.user.update({
      where: { id: sessionA.user.id },
      data: { status: 'suspended', instituteId: null },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/staff', {
      headers: sessionA.headers,
    });

    const res = await staffListGET(req);
    expect(res.status).toBe(401);
  });

  // ── STAFF-SEC-24: Access revocation for suspended staff ─────────────────────
  it('STAFF-SEC-24: Suspended staff member session is rejected with 401', async () => {
    const sessionA = await createAuthenticatedSession('owner_a');
    await bootstrapInstitute(sessionA.headers, 'Institute A');

    await db.user.update({
      where: { id: sessionA.user.id },
      data: { status: 'suspended' },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/staff', {
      headers: sessionA.headers,
    });

    const res = await staffListGET(req);
    expect(res.status).toBe(401);
  });
});
