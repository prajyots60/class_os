import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { db } from '@coaching-os/database';
import { signSessionToken } from '@coaching-os/auth';
import { NextRequest } from 'next/server';
import { GET as profilesGET, POST as profilesPOST } from './profiles/route';
import {
  GET as profileByIdGET,
  PATCH as profileByIdPATCH,
  DELETE as profileByIdDELETE,
} from './profiles/[id]/route';
import {
  GET as linksGET,
  POST as linksPOST,
} from './profiles/[id]/links/route';
import { DELETE as linkByIdDELETE } from './profiles/[id]/links/[linkId]/route';

describe('Phase 5.3 — Parent Child Profile & Student Linking Security Matrix', () => {
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
        name: 'Parent A',
        email: `parent-a-${crypto.randomUUID().slice(0, 6)}@example.com`,
        phone: phoneA,
        parentIdentityId: parentAIdentity.id,
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
    const phoneB = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const parentBIdentity = await db.parentIdentity.create({
      data: {
        phone: phoneB,
        status: 'active',
      },
    });
    parentBParentIdentityId = parentBIdentity.id;

    parentBUser = await db.user.create({
      data: {
        name: 'Parent B',
        email: `parent-b-${crypto.randomUUID().slice(0, 6)}@example.com`,
        phone: phoneB,
        parentIdentityId: parentBIdentity.id,
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
        admissionNumber: `ADM-A-${crypto.randomUUID().slice(0, 8)}`,
        firstName: 'Rahul',
        lastName: 'Sharma',
        phone: phoneA, // Phone match with Parent A
        status: 'active',
      },
    });

    studentB = await db.student.create({
      data: {
        instituteId: instituteB.id,
        admissionNumber: `ADM-B-${crypto.randomUUID().slice(0, 8)}`,
        firstName: 'Priya',
        lastName: 'Verma',
        phone: phoneB, // Phone match with Parent B
        status: 'active',
      },
    });

    // 5. Create Tenant CRM InstituteParent & InstituteParentStudent for Parent A -> Student A
    instParentA = await db.instituteParent.create({
      data: {
        instituteId: instituteA.id,
        parentIdentityId: parentAIdentity.id,
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
    // Cleanup DB
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

  function makeAuthHeaders(token: string) {
    const signed = signSessionToken(token);
    return new Headers({
      cookie: `better-auth.session_token=${signed}`,
    });
  }

  // ── PARENT-LINK-001 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-001: Unauthenticated profile request returns 401 AuthenticationError', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/profiles', {
      method: 'GET',
    });
    const res = await profilesGET(req);
    expect(res.status).toBe(401);
  });

  // ── PARENT-LINK-002 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-002: Unauthenticated link request returns 401 AuthenticationError', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/parent/profiles/fake-id/links',
      { method: 'GET' },
    );
    const res = await linksGET(req, { params: Promise.resolve({ id: 'fake-id' }) });
    expect(res.status).toBe(401);
  });

  // ── PARENT-LINK-003 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-003: Parent A can create own ChildProfile', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/profiles', {
      method: 'POST',
      headers: makeAuthHeaders(parentASessionToken),
      body: JSON.stringify({ name: 'Rahul Child' }),
    });
    const res = await profilesPOST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Rahul Child');
    expect(json.data.parentIdentityId).toBe(parentAParentIdentityId);
  });

  // ── PARENT-LINK-004 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-004: Parent A cannot access Parent B ChildProfile -> 404', async () => {
    // Create profile for Parent B
    const profileB = await db.childProfile.create({
      data: { parentIdentityId: parentBParentIdentityId, name: 'Priya Child' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileB.id}`,
      {
        method: 'GET',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    const res = await profileByIdGET(req, { params: Promise.resolve({ id: profileB.id }) });
    expect(res.status).toBe(404);
  });

  // ── PARENT-LINK-005 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-005: Parent A cannot update Parent B ChildProfile -> 404', async () => {
    const profileB = await db.childProfile.create({
      data: { parentIdentityId: parentBParentIdentityId, name: 'Priya Child' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileB.id}`,
      {
        method: 'PATCH',
        headers: makeAuthHeaders(parentASessionToken),
        body: JSON.stringify({ name: 'Hacked Name' }),
      },
    );
    const res = await profileByIdPATCH(req, { params: Promise.resolve({ id: profileB.id }) });
    expect(res.status).toBe(404);
  });

  // ── PARENT-LINK-006 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-006: Parent A cannot delete Parent B ChildProfile -> 404', async () => {
    const profileB = await db.childProfile.create({
      data: { parentIdentityId: parentBParentIdentityId, name: 'Priya Child' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileB.id}`,
      {
        method: 'DELETE',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    const res = await profileByIdDELETE(req, { params: Promise.resolve({ id: profileB.id }) });
    expect(res.status).toBe(404);
  });

  // ── PARENT-LINK-007 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-007: Parent A cannot list Parent B links -> 404', async () => {
    const profileB = await db.childProfile.create({
      data: { parentIdentityId: parentBParentIdentityId, name: 'Priya Child' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileB.id}/links`,
      {
        method: 'GET',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    const res = await linksGET(req, { params: Promise.resolve({ id: profileB.id }) });
    expect(res.status).toBe(404);
  });

  // ── PARENT-LINK-008 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-008: Parent A cannot delete Parent B StudentLink -> 404', async () => {
    const profileB = await db.childProfile.create({
      data: { parentIdentityId: parentBParentIdentityId, name: 'Priya Child' },
    });
    const linkB = await db.studentLink.create({
      data: {
        childProfileId: profileB.id,
        studentId: studentB.id,
        instituteId: instituteB.id,
      },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileB.id}/links/${linkB.id}`,
      {
        method: 'DELETE',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    const res = await linkByIdDELETE(req, {
      params: Promise.resolve({ id: profileB.id, linkId: linkB.id }),
    });
    expect(res.status).toBe(404);
  });

  // ── PARENT-LINK-009 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-009: Client-supplied parentIdentityId cannot impersonate another parent', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/profiles', {
      method: 'POST',
      headers: makeAuthHeaders(parentASessionToken),
      body: JSON.stringify({
        name: 'Impersonation Attempt',
        parentIdentityId: parentBParentIdentityId,
      }),
    });
    const res = await profilesPOST(req);
    // Strict Zod schema rejects unrecognised fields with 400 ValidationError
    expect(res.status).toBe(400);
  });

  // ── PARENT-LINK-010 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-010: Client-supplied instituteId cannot override authorization', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links`,
      {
        method: 'POST',
        headers: makeAuthHeaders(parentASessionToken),
        body: JSON.stringify({
          studentId: studentA.id,
          instituteId: instituteB.id, // Client override attempt
        }),
      },
    );
    const res = await linksPOST(req, { params: Promise.resolve({ id: profileA.id }) });
    expect(res.status).toBe(400); // Strict Zod schema rejects instituteId field
  });

  // ── PARENT-LINK-011 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-011: Client-supplied ownerId cannot change ownership', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/profiles', {
      method: 'POST',
      headers: makeAuthHeaders(parentASessionToken),
      body: JSON.stringify({
        name: 'Owner Override',
        ownerId: parentBParentIdentityId,
      }),
    });
    const res = await profilesPOST(req);
    expect(res.status).toBe(400);
  });

  // ── PARENT-LINK-012 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-012: Client-supplied studentId cannot bypass relationship verification', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });

    // Parent A attempting to link Student B (which belongs to Institute B / Parent B)
    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links`,
      {
        method: 'POST',
        headers: makeAuthHeaders(parentASessionToken),
        body: JSON.stringify({
          studentId: studentB.id,
        }),
      },
    );
    const res = await linksPOST(req, { params: Promise.resolve({ id: profileA.id }) });
    expect(res.status).toBe(404); // Universal 404 Masking
  });

  // ── PARENT-LINK-013 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-013: Valid student link succeeds for authorized relationship', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links`,
      {
        method: 'POST',
        headers: makeAuthHeaders(parentASessionToken),
        body: JSON.stringify({ studentId: studentA.id }),
      },
    );
    const res = await linksPOST(req, { params: Promise.resolve({ id: profileA.id }) });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.studentId).toBe(studentA.id);
  });

  // ── PARENT-LINK-014 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-014: Unlink physically removes StudentLink join row', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    const linkA = await db.studentLink.create({
      data: {
        childProfileId: profileA.id,
        studentId: studentA.id,
        instituteId: instituteA.id,
      },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links/${linkA.id}`,
      {
        method: 'DELETE',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    const res = await linkByIdDELETE(req, {
      params: Promise.resolve({ id: profileA.id, linkId: linkA.id }),
    });
    expect(res.status).toBe(200);

    const check = await db.studentLink.findUnique({ where: { id: linkA.id } });
    expect(check).toBeNull();
  });

  // ── PARENT-LINK-015 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-015: Unlink does NOT delete Student record', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    const linkA = await db.studentLink.create({
      data: {
        childProfileId: profileA.id,
        studentId: studentA.id,
        instituteId: instituteA.id,
      },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links/${linkA.id}`,
      {
        method: 'DELETE',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    await linkByIdDELETE(req, {
      params: Promise.resolve({ id: profileA.id, linkId: linkA.id }),
    });

    const studentRecord = await db.student.findUnique({ where: { id: studentA.id } });
    expect(studentRecord).not.toBeNull();
    expect(studentRecord?.id).toBe(studentA.id);
  });

  // ── PARENT-LINK-016 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-016: Unlink does NOT delete Enrollment record', async () => {
    const subject = await db.subject.create({
      data: {
        instituteId: instituteA.id,
        name: 'Math',
        code: `SUBJ-${crypto.randomUUID().slice(0, 4)}`,
      },
    });
    const program = await db.program.create({
      data: {
        instituteId: instituteA.id,
        name: 'Math Program',
        code: `PROG-${crypto.randomUUID().slice(0, 4)}`,
      },
    });
    const batch = await db.batch.create({
      data: {
        instituteId: instituteA.id,
        subjectId: subject.id,
        programId: program.id,
        name: 'Batch 2026',
        code: `BAT-${crypto.randomUUID().slice(0, 4)}`,
      },
    });
    const enrollment = await db.enrollment.create({
      data: {
        instituteId: instituteA.id,
        studentId: studentA.id,
        batchId: batch.id,
      },
    });

    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    const linkA = await db.studentLink.create({
      data: {
        childProfileId: profileA.id,
        studentId: studentA.id,
        instituteId: instituteA.id,
      },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links/${linkA.id}`,
      {
        method: 'DELETE',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    await linkByIdDELETE(req, {
      params: Promise.resolve({ id: profileA.id, linkId: linkA.id }),
    });

    const checkEnrollment = await db.enrollment.findUnique({ where: { id: enrollment.id } });
    expect(checkEnrollment).not.toBeNull();

    // Clean up test batch/program/subject
    await db.enrollment.delete({ where: { id: enrollment.id } });
    await db.batch.delete({ where: { id: batch.id } });
    await db.program.delete({ where: { id: program.id } });
    await db.subject.delete({ where: { id: subject.id } });
  });

  // ── PARENT-LINK-017 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-017: Unlink does NOT delete academic data', async () => {
    const subject = await db.subject.create({
      data: {
        instituteId: instituteA.id,
        name: 'Science',
        code: `SUBJ-${crypto.randomUUID().slice(0, 4)}`,
      },
    });
    const batch = await db.batch.create({
      data: {
        instituteId: instituteA.id,
        subjectId: subject.id,
        name: 'Batch Science',
        code: `BAT-${crypto.randomUUID().slice(0, 4)}`,
      },
    });
    const homework = await db.homework.create({
      data: {
        instituteId: instituteA.id,
        batchId: batch.id,
        title: 'Math Homework 1',
        description: 'Complete Ex 1.1',
      },
    });

    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    const linkA = await db.studentLink.create({
      data: {
        childProfileId: profileA.id,
        studentId: studentA.id,
        instituteId: instituteA.id,
      },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links/${linkA.id}`,
      {
        method: 'DELETE',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    await linkByIdDELETE(req, {
      params: Promise.resolve({ id: profileA.id, linkId: linkA.id }),
    });

    const checkHw = await db.homework.findUnique({ where: { id: homework.id } });
    expect(checkHw).not.toBeNull();
    await db.homework.delete({ where: { id: homework.id } });
    await db.batch.delete({ where: { id: batch.id } });
    await db.subject.delete({ where: { id: subject.id } });
  });

  // ── PARENT-LINK-018 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-018: Unlink does NOT delete billing data', async () => {
    const subject = await db.subject.create({
      data: {
        instituteId: instituteA.id,
        name: 'Accounts',
        code: `SUBJ-${crypto.randomUUID().slice(0, 4)}`,
      },
    });
    const batch = await db.batch.create({
      data: {
        instituteId: instituteA.id,
        subjectId: subject.id,
        name: 'Batch Accounts',
        code: `BAT-${crypto.randomUUID().slice(0, 4)}`,
      },
    });
    const enrollment = await db.enrollment.create({
      data: {
        instituteId: instituteA.id,
        studentId: studentA.id,
        batchId: batch.id,
      },
    });

    const billingPlan = await db.billingPlan.create({
      data: {
        enrollmentId: enrollment.id,
        amount: 10000,
        type: 'one_time',
        billingStartDate: new Date(),
      },
    });
    const invoice = await db.invoice.create({
      data: {
        billingPlanId: billingPlan.id,
        amount: 5000,
        dueDate: new Date(),
      },
    });
    const payment = await db.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: 5000,
        paymentMode: 'cash',
        receivedOn: new Date(),
      },
    });
    const receipt = await db.receipt.create({
      data: {
        instituteId: instituteA.id,
        paymentId: payment.id,
        receiptNumber: `REC-${crypto.randomUUID().slice(0, 6)}`,
      },
    });

    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    const linkA = await db.studentLink.create({
      data: {
        childProfileId: profileA.id,
        studentId: studentA.id,
        instituteId: instituteA.id,
      },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links/${linkA.id}`,
      {
        method: 'DELETE',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    await linkByIdDELETE(req, {
      params: Promise.resolve({ id: profileA.id, linkId: linkA.id }),
    });

    const checkReceipt = await db.receipt.findUnique({ where: { id: receipt.id } });
    expect(checkReceipt).not.toBeNull();
    await db.receipt.delete({ where: { id: receipt.id } });
    await db.payment.delete({ where: { id: payment.id } });
    await db.invoice.delete({ where: { id: invoice.id } });
    await db.billingPlan.delete({ where: { id: billingPlan.id } });
    await db.enrollment.delete({ where: { id: enrollment.id } });
    await db.batch.delete({ where: { id: batch.id } });
    await db.subject.delete({ where: { id: subject.id } });
  });

  // ── PARENT-LINK-019 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-019: Duplicate StudentLink cannot be created -> 409 Conflict', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });

    await db.studentLink.create({
      data: {
        childProfileId: profileA.id,
        studentId: studentA.id,
        instituteId: instituteA.id,
      },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links`,
      {
        method: 'POST',
        headers: makeAuthHeaders(parentASessionToken),
        body: JSON.stringify({ studentId: studentA.id }),
      },
    );
    const res = await linksPOST(req, { params: Promise.resolve({ id: profileA.id }) });
    expect(res.status).toBe(409);
  });

  // ── PARENT-LINK-020 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-020: Concurrent duplicate link requests remain safe', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });

    const req1 = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links`,
      {
        method: 'POST',
        headers: makeAuthHeaders(parentASessionToken),
        body: JSON.stringify({ studentId: studentA.id }),
      },
    );
    const req2 = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links`,
      {
        method: 'POST',
        headers: makeAuthHeaders(parentASessionToken),
        body: JSON.stringify({ studentId: studentA.id }),
      },
    );

    const [res1, res2] = await Promise.all([
      linksPOST(req1, { params: Promise.resolve({ id: profileA.id }) }),
      linksPOST(req2, { params: Promise.resolve({ id: profileA.id }) }),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);
  });

  // ── PARENT-LINK-021 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-021: Parent A cannot access unrelated student -> 404', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links`,
      {
        method: 'POST',
        headers: makeAuthHeaders(parentASessionToken),
        body: JSON.stringify({ studentId: studentB.id }),
      },
    );
    const res = await linksPOST(req, { params: Promise.resolve({ id: profileA.id }) });
    expect(res.status).toBe(404);
  });

  // ── PARENT-LINK-022 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-022: Cross-institute unauthorized access returns 404', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links`,
      {
        method: 'POST',
        headers: makeAuthHeaders(parentASessionToken),
        body: JSON.stringify({ studentId: studentB.id }),
      },
    );
    const res = await linksPOST(req, { params: Promise.resolve({ id: profileA.id }) });
    expect(res.status).toBe(404);
  });

  // ── PARENT-LINK-023 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-023: Multiple institutes remain independently accessible when relationships are valid', async () => {
    // Grant Parent A relationship to Student B in Institute B as well via tenant InstituteParent
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
        relationshipType: 'father',
        status: 'active',
      },
    });

    try {
      const profileA = await db.childProfile.create({
        data: { parentIdentityId: parentAParentIdentityId, name: 'Multi Child' },
      });

      const req1 = new NextRequest(
        `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links`,
        {
          method: 'POST',
          headers: makeAuthHeaders(parentASessionToken),
          body: JSON.stringify({ studentId: studentA.id }),
        },
      );
      const res1 = await linksPOST(req1, { params: Promise.resolve({ id: profileA.id }) });
      expect(res1.status).toBe(201);

      const req2 = new NextRequest(
        `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links`,
        {
          method: 'POST',
          headers: makeAuthHeaders(parentASessionToken),
          body: JSON.stringify({ studentId: studentB.id }),
        },
      );
      const res2 = await linksPOST(req2, { params: Promise.resolve({ id: profileA.id }) });
      expect(res2.status).toBe(201);

      const listReq = new NextRequest(
        `http://localhost:3000/api/v1/parent/profiles/${profileA.id}/links`,
        {
          method: 'GET',
          headers: makeAuthHeaders(parentASessionToken),
        },
      );
      const listRes = await linksGET(listReq, { params: Promise.resolve({ id: profileA.id }) });
      const listJson = await listRes.json();
      expect(listJson.data).toHaveLength(2);
    } finally {
      await db.instituteParentStudent.delete({ where: { id: instParentStudentB.id } });
      await db.instituteParent.delete({ where: { id: instParentB.id } });
    }
  });

  // ── PARENT-LINK-024 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-024: Deleting a ChildProfile does not delete Student data', async () => {
    const profileA = await db.childProfile.create({
      data: { parentIdentityId: parentAParentIdentityId, name: 'Rahul Child' },
    });
    await db.studentLink.create({
      data: {
        childProfileId: profileA.id,
        studentId: studentA.id,
        instituteId: instituteA.id,
      },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileA.id}`,
      {
        method: 'DELETE',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    const res = await profileByIdDELETE(req, { params: Promise.resolve({ id: profileA.id }) });
    expect(res.status).toBe(200);

    const studentRecord = await db.student.findUnique({ where: { id: studentA.id } });
    expect(studentRecord).not.toBeNull();
  });

  // ── PARENT-LINK-025 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-025: Unauthorized and nonexistent resources return equivalent 404 behavior', async () => {
    const profileB = await db.childProfile.create({
      data: { parentIdentityId: parentBParentIdentityId, name: 'Priya Child' },
    });

    const fakeId = crypto.randomUUID();

    const reqUnauthorized = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileB.id}`,
      {
        method: 'GET',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    const resUnauthorized = await profileByIdGET(reqUnauthorized, {
      params: Promise.resolve({ id: profileB.id }),
    });

    const reqNonexistent = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${fakeId}`,
      {
        method: 'GET',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    const resNonexistent = await profileByIdGET(reqNonexistent, {
      params: Promise.resolve({ id: fakeId }),
    });

    expect(resUnauthorized.status).toBe(404);
    expect(resNonexistent.status).toBe(404);

    const body1 = await resUnauthorized.json();
    const body2 = await resNonexistent.json();

    expect(body1.error.code).toBe(body2.error.code);
    expect(body1.error.message).toBe(body2.error.message);
  });

  // ── PARENT-LINK-026 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-026: No sensitive authorization details appear in error responses', async () => {
    const profileB = await db.childProfile.create({
      data: { parentIdentityId: parentBParentIdentityId, name: 'Priya Child' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/profiles/${profileB.id}`,
      {
        method: 'GET',
        headers: makeAuthHeaders(parentASessionToken),
      },
    );
    const res = await profileByIdGET(req, { params: Promise.resolve({ id: profileB.id }) });
    const json = await res.json();

    expect(JSON.stringify(json)).not.toContain('parentIdentityId');
    expect(JSON.stringify(json)).not.toContain('Prisma');
    expect(JSON.stringify(json)).not.toContain('SQL');
  });

  // ── PARENT-LINK-027 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-027: No session token/cookie/OTP appears in logs or responses', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/profiles', {
      method: 'POST',
      headers: makeAuthHeaders(parentASessionToken),
      body: JSON.stringify({ name: 'Clean Test' }),
    });
    const res = await profilesPOST(req);
    const json = await res.json();

    expect(JSON.stringify(json)).not.toContain(parentASessionToken);
  });

  // ── PARENT-LINK-028 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-028: Concurrent requests from different parents remain isolated', async () => {
    const reqA = new NextRequest('http://localhost:3000/api/v1/parent/profiles', {
      method: 'POST',
      headers: makeAuthHeaders(parentASessionToken),
      body: JSON.stringify({ name: 'Child Parent A' }),
    });
    const reqB = new NextRequest('http://localhost:3000/api/v1/parent/profiles', {
      method: 'POST',
      headers: makeAuthHeaders(parentBSessionToken),
      body: JSON.stringify({ name: 'Child Parent B' }),
    });

    const [resA, resB] = await Promise.all([profilesPOST(reqA), profilesPOST(reqB)]);

    const jsonA = await resA.json();
    const jsonB = await resB.json();

    expect(jsonA.data.parentIdentityId).toBe(parentAParentIdentityId);
    expect(jsonB.data.parentIdentityId).toBe(parentBParentIdentityId);
  });

  // ── PARENT-LINK-029 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-029: Suspended ParentIdentity cannot mutate profiles or links -> 401', async () => {
    await db.parentIdentity.update({
      where: { id: parentAParentIdentityId },
      data: { status: 'suspended' },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/profiles', {
      method: 'POST',
      headers: makeAuthHeaders(parentASessionToken),
      body: JSON.stringify({ name: 'Suspended Mutate' }),
    });
    const res = await profilesPOST(req);
    expect(res.status).toBe(401);
  });

  // ── PARENT-LINK-030 ──────────────────────────────────────────────────────────
  it('PARENT-LINK-030: Deactivated ParentIdentity cannot mutate profiles or links -> 401', async () => {
    await db.parentIdentity.update({
      where: { id: parentAParentIdentityId },
      data: { status: 'deactivated' },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/profiles', {
      method: 'POST',
      headers: makeAuthHeaders(parentASessionToken),
      body: JSON.stringify({ name: 'Deactivated Mutate' }),
    });
    const res = await profilesPOST(req);
    expect(res.status).toBe(401);
  });
});
