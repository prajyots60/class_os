import { db } from '../index';
import crypto from 'node:crypto';

export async function createTestInstitute(
  overrides: Partial<{
    name: string;
    slug: string;
    phone: string;
    email: string;
    timezone: string;
  }> = {},
) {
  const uniqueId = crypto.randomUUID().substring(0, 8);
  return db.institute.create({
    data: {
      name: overrides.name || `Test Institute ${uniqueId}`,
      slug: overrides.slug || `inst-${uniqueId}`,
      phone: overrides.phone || `+9198000${Math.floor(10000 + Math.random() * 90000)}`,
      email: overrides.email || `inst_${uniqueId}@coachingos.test`,
      timezone: overrides.timezone || 'Asia/Kolkata',
    },
  });
}

export async function createTestUser(
  overrides: Partial<{
    name: string;
    email: string;
    emailVerified: boolean;
    instituteId?: string;
  }> = {},
) {
  const uniqueId = crypto.randomUUID().substring(0, 8);
  const email = overrides.email
    ? overrides.email.includes('@')
      ? overrides.email.replace('@', `_${uniqueId}@`)
      : `${overrides.email}_${uniqueId}`
    : `user_${uniqueId}@example.com`;

  return db.user.create({
    data: {
      name: overrides.name || `Test User ${uniqueId}`,
      email,
      emailVerified: overrides.emailVerified ?? true,
      instituteId: overrides.instituteId,
    },
  });
}

export async function createTestInstituteParent(
  instituteId: string,
  overrides: Partial<{ name: string; primaryPhone: string }> = {},
) {
  const uniqueId = crypto.randomUUID().substring(0, 8);
  return db.instituteParent.create({
    data: {
      instituteId,
      name: overrides.name || `Parent ${uniqueId}`,
      primaryPhone:
        overrides.primaryPhone || `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    },
  });
}

export async function createTestParentIdentity(overrides: Partial<{ phone: string }> = {}) {
  return db.parentIdentity.create({
    data: {
      phone: overrides.phone || `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    },
  });
}

export async function createTestChildProfile(
  parentIdentityId: string,
  overrides: Partial<{ name: string; fullName?: string }> = {},
) {
  const uniqueId = crypto.randomUUID().substring(0, 8);
  return db.childProfile.create({
    data: {
      parentIdentityId,
      name: overrides.name || overrides.fullName || `Test Child ${uniqueId}`,
    },
  });
}

export async function createTestStudent(
  instituteId: string,
  overrides: Partial<{
    firstName: string;
    lastName: string;
    fullName?: string;
    admissionNumber?: string;
  }> = {},
) {
  const uniqueId = crypto.randomUUID().substring(0, 8);
  const firstName =
    overrides.firstName || (overrides.fullName ? overrides.fullName.split(' ')[0] : `Student`);
  const lastName =
    overrides.lastName ||
    (overrides.fullName ? overrides.fullName.split(' ')[1] || 'Test' : uniqueId);

  return db.student.create({
    data: {
      instituteId,
      firstName,
      lastName,
      admissionNumber: overrides.admissionNumber || `ADM-${uniqueId.toUpperCase()}`,
      status: 'active',
    },
  });
}

export async function createTestSubject(
  instituteId: string,
  overrides: Partial<{ name: string }> = {},
) {
  const uniqueId = crypto.randomUUID().substring(0, 8);
  return db.subject.create({
    data: {
      instituteId,
      name: overrides.name || `Subject ${uniqueId}`,
    },
  });
}

export async function createTestBatch(
  instituteId: string,
  subjectId?: string,
  overrides: Partial<{ name: string }> = {},
) {
  const uniqueId = crypto.randomUUID().substring(0, 8);
  let resolvedSubjectId = subjectId;

  if (!resolvedSubjectId) {
    const subject = await createTestSubject(instituteId);
    resolvedSubjectId = subject.id;
  }

  return db.batch.create({
    data: {
      instituteId,
      subjectId: resolvedSubjectId,
      name: overrides.name || `Batch ${uniqueId}`,
      status: 'open',
    },
  });
}

export async function createTestEnrollment(
  studentId: string,
  batchId: string,
  overrides: Partial<{
    instituteId?: string;
    status?: 'pending' | 'active' | 'completed' | 'cancelled';
  }> = {},
) {
  let instId = overrides.instituteId;
  if (!instId) {
    const student = await db.student.findUnique({ where: { id: studentId } });
    instId = student!.instituteId;
  }

  return db.enrollment.create({
    data: {
      instituteId: instId,
      studentId,
      batchId,
      joinedOn: new Date(),
      status: overrides.status || 'active',
    },
  });
}
