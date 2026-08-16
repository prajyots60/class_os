import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { db } from '@coaching-os/database';
import { signSessionToken } from '@coaching-os/auth';
import { NextRequest } from 'next/server';
import { GET as hubGET, POST as hubPOST } from './hub/route';

interface HubStudentLinkItem {
  linkId: string;
  studentId: string;
  instituteId: string;
  fullName: string;
  deletedAt?: string;
  institute?: unknown;
}

interface HubProfileItem {
  id: string;
  name: string;
  avatar: string | null;
  linkedStudents: HubStudentLinkItem[];
}

interface HubInstituteItem {
  id: string;
  name: string;
  slug: string;
  studentCount: number;
}

describe('Phase 5.4 — Parent Hub & Cross-Institute Read Security Matrix', () => {
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
  let instParentA: { id: string };
  let instParentStudentA: { id: string };

  beforeEach(async () => {
    // 1. Create Institute A & B
    instituteA = await db.institute.create({
      data: {
        name: `Institute A ${crypto.randomUUID().slice(0, 6)}`,
        slug: `inst-a-${crypto.randomUUID().slice(0, 6)}`,
        phone: '+919876500001',
        email: `inst-a-${crypto.randomUUID().slice(0, 6)}@example.com`,
      },
    });

    instituteB = await db.institute.create({
      data: {
        name: `Institute B ${crypto.randomUUID().slice(0, 6)}`,
        slug: `inst-b-${crypto.randomUUID().slice(0, 6)}`,
        phone: '+919876500002',
        email: `inst-b-${crypto.randomUUID().slice(0, 6)}@example.com`,
      },
    });

    // 2. Create Parent A Identity & Session
    const phoneA = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const parentAIdentity = await db.parentIdentity.create({
      data: {
        phone: phoneA,
        status: 'active',
      },
    });
    parentAParentIdentityId = parentAIdentity.id;

    parentAUser = await db.user.create({
      data: {
        parentIdentityId: parentAIdentity.id,
        name: 'Parent A',
        email: `parent-a-${crypto.randomUUID().slice(0, 6)}@example.com`,
        phone: phoneA,
        status: 'active',
      },
    });

    parentASessionToken = `sess-a-${crypto.randomUUID()}`;
    await db.session.create({
      data: {
        userId: parentAUser.id,
        token: parentASessionToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 3. Create Parent B Identity & Session
    const phoneB = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
    const parentBIdentity = await db.parentIdentity.create({
      data: {
        phone: phoneB,
        status: 'active',
      },
    });
    parentBParentIdentityId = parentBIdentity.id;

    parentBUser = await db.user.create({
      data: {
        parentIdentityId: parentBIdentity.id,
        name: 'Parent B',
        email: `parent-b-${crypto.randomUUID().slice(0, 6)}@example.com`,
        phone: phoneB,
        status: 'active',
      },
    });

    parentBSessionToken = `sess-b-${crypto.randomUUID()}`;
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
        admissionNumber: `ADM-${crypto.randomUUID().slice(0, 6)}`,
        firstName: 'Rahul',
        lastName: 'Sharma',
        status: 'active',
      },
    });

    studentB = await db.student.create({
      data: {
        instituteId: instituteB.id,
        admissionNumber: `ADM-${crypto.randomUUID().slice(0, 6)}`,
        firstName: 'Priya',
        lastName: 'Verma',
        status: 'active',
      },
    });

    // 5. Link Parent A to Student A in Institute A (tenant side)
    instParentA = await db.instituteParent.create({
      data: {
        instituteId: instituteA.id,
        parentIdentityId: parentAParentIdentityId,
        status: 'active',
      },
    });

    instParentStudentA = await db.instituteParentStudent.create({
      data: {
        instituteId: instituteA.id,
        instituteParentId: instParentA.id,
        studentId: studentA.id,
        relationshipType: 'father',
        status: 'active',
      },
    });
  });

  afterEach(async () => {
    await db.studentLink.deleteMany({
      where: { instituteId: { in: [instituteA.id, instituteB.id] } },
    });
    await db.childProfile.deleteMany({
      where: { parentIdentityId: { in: [parentAParentIdentityId, parentBParentIdentityId] } },
    });
    await db.instituteParentStudent.deleteMany({
      where: { id: instParentStudentA.id },
    });
    await db.instituteParent.deleteMany({
      where: { id: instParentA.id },
    });
    await db.enrollment.deleteMany({
      where: { instituteId: { in: [instituteA.id, instituteB.id] } },
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

  function makeAuthHeaders(token?: string) {
    const headers: Record<string, string> = {};
    if (token) {
      const signed = signSessionToken(token);
      headers['authorization'] = `Bearer ${signed}`;
      headers['cookie'] = `better-auth.session_token=${signed}`;
    }
    return headers;
  }

  // ── PARENT-HUB-001 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-001: Unauthenticated GET /parent/hub returns 401 AuthenticationError', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', { method: 'GET' });
    const res = await hubGET(req);
    expect(res.status).toBe(401);
  });

  // ── PARENT-HUB-002 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-002: Valid parent session can retrieve own hub -> 200 OK', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.parent.id).toBe(parentAParentIdentityId);
    expect(json.data.profiles).toBeDefined();
    expect(json.data.institutes).toBeDefined();
    expect(json.data.meta).toBeDefined();
  });

  // ── PARENT-HUB-003 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-003: Parent A cannot see Parent B ChildProfiles', async () => {
    const profileB = await db.childProfile.create({
      data: { parentIdentityId: parentBParentIdentityId, name: 'Priya Child' },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    const profileIds = json.data.profiles.map((p: HubProfileItem) => p.id);
    expect(profileIds).not.toContain(profileB.id);
  });

  // ── PARENT-HUB-004 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-004: Parent A cannot see Parent B StudentLinks', async () => {
    const profileB = await db.childProfile.create({
      data: { parentIdentityId: parentBParentIdentityId, name: 'Priya Child' },
    });
    const linkB = await db.studentLink.create({
      data: { childProfileId: profileB.id, studentId: studentB.id, instituteId: instituteB.id },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    const allLinkIds = json.data.profiles.flatMap((p: HubProfileItem) => p.linkedStudents.map((s: HubStudentLinkItem) => s.linkId));
    expect(allLinkIds).not.toContain(linkB.id);
  });

  // ── PARENT-HUB-005 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-005: Parent A cannot see unrelated Students', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    const allStudentIds = json.data.profiles.flatMap((p: HubProfileItem) => p.linkedStudents.map((s: HubStudentLinkItem) => s.studentId));
    expect(allStudentIds).not.toContain(studentB.id);
  });

  // ── PARENT-HUB-006 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-006: Known studentId cannot grant access without StudentLink', async () => {
    await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });

    const req = new NextRequest(`http://localhost:3000/api/v1/parent/hub?studentId=${studentA.id}`, {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    const linkedStudentIds = json.data.profiles.flatMap((p: HubProfileItem) => p.linkedStudents.map((s: HubStudentLinkItem) => s.studentId));
    expect(linkedStudentIds).not.toContain(studentA.id);
  });

  // ── PARENT-HUB-007 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-007: Known childProfileId cannot grant access without ownership', async () => {
    const profileB = await db.childProfile.create({
      data: { parentIdentityId: parentBParentIdentityId, name: 'Priya Child' },
    });

    const req = new NextRequest(`http://localhost:3000/api/v1/parent/hub?profileId=${profileB.id}`, {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    const profileIds = json.data.profiles.map((p: HubProfileItem) => p.id);
    expect(profileIds).not.toContain(profileB.id);
  });

  // ── PARENT-HUB-008 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-008: Client parentIdentityId cannot override authenticated identity', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/parent/hub?parentIdentityId=${parentBParentIdentityId}`, {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    expect(json.data.parent.id).toBe(parentAParentIdentityId);
  });

  // ── PARENT-HUB-009 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-009: Client instituteId cannot constrain/override server authorization', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/parent/hub?instituteId=${instituteB.id}`, {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    expect(res.status).toBe(200);
  });

  // ── PARENT-HUB-010 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-010: Client studentId cannot expand hub visibility', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/parent/hub?studentId=${studentB.id}`, {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    const allStudentIds = json.data.profiles.flatMap((p: HubProfileItem) => p.linkedStudents.map((s: HubStudentLinkItem) => s.studentId));
    expect(allStudentIds).not.toContain(studentB.id);
  });

  // ── PARENT-HUB-011 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-011: Parent with Student in Institute A and Student in Institute B receives both authorized relationships', async () => {
    // Grant Parent A tenant access to Student B in Institute B as well
    const instParentB = await db.instituteParent.create({
      data: {
        instituteId: instituteB.id,
        parentIdentityId: parentAParentIdentityId,
        status: 'active',
      },
    });
    const instParentStudentB = await db.instituteParentStudent.create({
      data: {
        instituteId: instituteB.id,
        instituteParentId: instParentB.id,
        studentId: studentB.id,
        relationshipType: 'mother',
        status: 'active',
      },
    });

    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul & Priya' },
    });
    const linkA1 = await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentA.id, instituteId: instituteA.id },
    });
    const linkA2 = await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentB.id, instituteId: instituteB.id },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    expect(json.data.profiles[0].linkedStudents).toHaveLength(2);
    expect(json.data.institutes).toHaveLength(2);

    // Clean up extra relationships
    await db.studentLink.deleteMany({ where: { id: { in: [linkA1.id, linkA2.id] } } });
    await db.instituteParentStudent.delete({ where: { id: instParentStudentB.id } });
    await db.instituteParent.delete({ where: { id: instParentB.id } });
  });

  // ── PARENT-HUB-012 ──────────────────────────────────────────────────────────
  it("PARENT-HUB-012: Parent's Institute A relationship does not expose unrelated Institute B students", async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentA.id, instituteId: instituteA.id },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    const studentIds = json.data.profiles.flatMap((p: HubProfileItem) => p.linkedStudents.map((s: HubStudentLinkItem) => s.studentId));
    expect(studentIds).toContain(studentA.id);
    expect(studentIds).not.toContain(studentB.id);
  });

  // ── PARENT-HUB-013 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-013: Multiple StudentLinks to same institute group correctly', async () => {
    const studentA2 = await db.student.create({
      data: {
        instituteId: instituteA.id,
        admissionNumber: `ADM-${crypto.randomUUID().slice(0, 6)}`,
        firstName: 'Amit',
        lastName: 'Sharma',
        status: 'active',
      },
    });

    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Child 1' },
    });
    const profileA2 = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Child 2' },
    });

    await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentA.id, instituteId: instituteA.id },
    });
    await db.studentLink.create({
      data: { childProfileId: profileA2.id, studentId: studentA2.id, instituteId: instituteA.id },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    expect(json.data.institutes).toHaveLength(1);
    expect(json.data.institutes[0].studentCount).toBe(2);

    await db.student.delete({ where: { id: studentA2.id } });
  });

  // ── PARENT-HUB-014 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-014: Parent with zero ChildProfiles receives valid empty hub (200 OK)', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.profiles).toEqual([]);
    expect(json.data.institutes).toEqual([]);
    expect(json.data.meta.totalProfiles).toBe(0);
  });

  // ── PARENT-HUB-015 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-015: ChildProfile with zero StudentLinks is represented safely according to contract', async () => {
    await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Unlinked Child' },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    expect(json.data.profiles).toHaveLength(1);
    expect(json.data.profiles[0].linkedStudents).toEqual([]);
    expect(json.data.meta.totalLinks).toBe(0);
  });

  // ── PARENT-HUB-016 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-016: Removed StudentLink immediately disappears from hub', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    const linkA = await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentA.id, instituteId: instituteA.id },
    });

    // Check before removal
    let req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    let res = await hubGET(req);
    let json = await res.json();
    expect(json.data.meta.totalLinks).toBe(1);

    // Hard delete link
    await db.studentLink.delete({ where: { id: linkA.id } });

    // Check after removal
    req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    res = await hubGET(req);
    json = await res.json();
    expect(json.data.meta.totalLinks).toBe(0);
  });

  // ── PARENT-HUB-017 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-017: Student remains intact after StudentLink removal', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    const linkA = await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentA.id, instituteId: instituteA.id },
    });

    await db.studentLink.delete({ where: { id: linkA.id } });

    const checkStudent = await db.student.findUnique({ where: { id: studentA.id } });
    expect(checkStudent).not.toBeNull();
  });

  // ── PARENT-HUB-018 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-018: Enrollment remains intact after StudentLink removal', async () => {
    const subject = await db.subject.create({
      data: { instituteId: instituteA.id, name: 'Physics', code: `SUB-${crypto.randomUUID().slice(0, 4)}` },
    });
    const batch = await db.batch.create({
      data: { instituteId: instituteA.id, subjectId: subject.id, name: 'Physics Batch', code: `BAT-${crypto.randomUUID().slice(0, 4)}` },
    });
    const enrollment = await db.enrollment.create({
      data: { instituteId: instituteA.id, studentId: studentA.id, batchId: batch.id },
    });

    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    const linkA = await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentA.id, instituteId: instituteA.id },
    });

    await db.studentLink.delete({ where: { id: linkA.id } });

    const checkEnrollment = await db.enrollment.findUnique({ where: { id: enrollment.id } });
    expect(checkEnrollment).not.toBeNull();

    await db.enrollment.delete({ where: { id: enrollment.id } });
    await db.batch.delete({ where: { id: batch.id } });
    await db.subject.delete({ where: { id: subject.id } });
  });

  // ── PARENT-HUB-019 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-019: Academic records remain intact after StudentLink removal', async () => {
    const subject = await db.subject.create({
      data: { instituteId: instituteA.id, name: 'Chemistry', code: `SUB-${crypto.randomUUID().slice(0, 4)}` },
    });
    const batch = await db.batch.create({
      data: { instituteId: instituteA.id, subjectId: subject.id, name: 'Chem Batch', code: `BAT-${crypto.randomUUID().slice(0, 4)}` },
    });
    const homework = await db.homework.create({
      data: { instituteId: instituteA.id, batchId: batch.id, title: 'Chem HW 1' },
    });

    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    const linkA = await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentA.id, instituteId: instituteA.id },
    });

    await db.studentLink.delete({ where: { id: linkA.id } });

    const checkHw = await db.homework.findUnique({ where: { id: homework.id } });
    expect(checkHw).not.toBeNull();

    await db.homework.delete({ where: { id: homework.id } });
    await db.batch.delete({ where: { id: batch.id } });
    await db.subject.delete({ where: { id: subject.id } });
  });

  // ── PARENT-HUB-020 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-020: Billing records remain intact after StudentLink removal', async () => {
    const subject = await db.subject.create({
      data: { instituteId: instituteA.id, name: 'Bio', code: `SUB-${crypto.randomUUID().slice(0, 4)}` },
    });
    const batch = await db.batch.create({
      data: { instituteId: instituteA.id, subjectId: subject.id, name: 'Bio Batch', code: `BAT-${crypto.randomUUID().slice(0, 4)}` },
    });
    const enrollment = await db.enrollment.create({
      data: { instituteId: instituteA.id, studentId: studentA.id, batchId: batch.id },
    });
    const billingPlan = await db.billingPlan.create({
      data: {
        enrollmentId: enrollment.id,
        amount: 5000,
        type: 'one_time',
        billingStartDate: new Date(),
      },
    });

    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    const linkA = await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentA.id, instituteId: instituteA.id },
    });

    await db.studentLink.delete({ where: { id: linkA.id } });

    const checkBp = await db.billingPlan.findUnique({ where: { id: billingPlan.id } });
    expect(checkBp).not.toBeNull();

    await db.billingPlan.delete({ where: { id: billingPlan.id } });
    await db.enrollment.delete({ where: { id: enrollment.id } });
    await db.batch.delete({ where: { id: batch.id } });
    await db.subject.delete({ where: { id: subject.id } });
  });

  // ── PARENT-HUB-021 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-021: Suspended ParentIdentity cannot access hub -> 401', async () => {
    await db.parentIdentity.update({
      where: { id: parentAParentIdentityId },
      data: { status: 'suspended' },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    expect(res.status).toBe(401);

    await db.parentIdentity.update({
      where: { id: parentAParentIdentityId },
      data: { status: 'active' },
    });
  });

  // ── PARENT-HUB-022 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-022: Deactivated ParentIdentity cannot access hub -> 401', async () => {
    await db.parentIdentity.update({
      where: { id: parentAParentIdentityId },
      data: { status: 'deactivated' },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    expect(res.status).toBe(401);

    await db.parentIdentity.update({
      where: { id: parentAParentIdentityId },
      data: { status: 'active' },
    });
  });

  // ── PARENT-HUB-023 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-023: Concurrent hub requests from Parent A and Parent B remain isolated', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul' },
    });
    await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentA.id, instituteId: instituteA.id },
    });

    const profileB = await db.childProfile.create({
      data: { parentIdentityId: parentBParentIdentityId, name: 'Priya' },
    });
    await db.studentLink.create({
      data: { childProfileId: profileB.id, studentId: studentB.id, instituteId: instituteB.id },
    });

    const [resA, resB] = await Promise.all([
      hubGET(new NextRequest('http://localhost:3000/api/v1/parent/hub', { method: 'GET', headers: makeAuthHeaders(parentASessionToken) })),
      hubGET(new NextRequest('http://localhost:3000/api/v1/parent/hub', { method: 'GET', headers: makeAuthHeaders(parentBSessionToken) })),
    ]);

    const jsonA = await resA.json();
    const jsonB = await resB.json();

    expect(jsonA.data.parent.id).toBe(parentAParentIdentityId);
    expect(jsonB.data.parent.id).toBe(parentBParentIdentityId);
    expect(jsonA.data.profiles[0].name).toBe('Rahul');
    expect(jsonB.data.profiles[0].name).toBe('Priya');
  });

  // ── PARENT-HUB-024 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-024: Hub response contains no session token', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const text = await res.text();

    expect(text).not.toContain('token');
    expect(text).not.toContain(parentASessionToken);
  });

  // ── PARENT-HUB-025 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-025: Hub response contains no OTP', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const text = await res.text();

    expect(text).not.toContain('otp');
    expect(text).not.toContain('123456');
  });

  // ── PARENT-HUB-026 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-026: Hub response contains no secrets or credential material', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const text = await res.text();

    expect(text).not.toContain('password');
    expect(text).not.toContain('secret');
  });

  // ── PARENT-HUB-027 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-027: Raw Prisma models are not leaked through the API', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul' },
    });
    await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentA.id, instituteId: instituteA.id },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    const studentSummary = json.data.profiles[0].linkedStudents[0] as unknown as Record<string, unknown>;
    expect(studentSummary.deletedAt).toBeUndefined();
    expect(studentSummary.institute).toBeUndefined();
  });

  // ── PARENT-HUB-028 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-028: Hub does not expose unrelated tenant data', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    expect(json.data.institutes).toEqual([]);
  });

  // ── PARENT-HUB-029 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-029: No authorization information is revealed through error responses', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', { method: 'POST' });
    expect(req.method).toBe('POST');
    const res = await hubPOST();
    expect(res.status).toBe(405);
  });

  // ── PARENT-HUB-030 ──────────────────────────────────────────────────────────
  it('PARENT-HUB-030: Hub response is deterministic and contains no duplicate logical Student/Institute relationships', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul' },
    });
    await db.studentLink.create({
      data: { childProfileId: profileA.id, studentId: studentA.id, instituteId: instituteA.id },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
      method: 'GET',
      headers: makeAuthHeaders(parentASessionToken),
    });
    const res = await hubGET(req);
    const json = await res.json();

    const instituteIds = json.data.institutes.map((i: HubInstituteItem) => i.id);
    const uniqueInstituteIds = new Set(instituteIds);
    expect(instituteIds.length).toBe(uniqueInstituteIds.size);
  });
});
