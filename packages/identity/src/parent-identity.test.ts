import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  db,
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  createTestInstitute,
  createTestStudent,
  createTestParentIdentity,
  createTestChildProfile,
  createTestInstituteParent,
} from '@coaching-os/database';

describe('ParentIdentity Two-Layer Architecture & RBAC Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('supports single ParentIdentity with multiple ChildProfiles and multi-institute StudentLinks', async () => {
    const instA = await createTestInstitute({ name: 'Mathematics Academy' });
    const instB = await createTestInstitute({ name: 'Science Forum' });

    const studentA = await createTestStudent(instA.id, { firstName: 'Aarav', lastName: 'Gupta' });
    const studentB = await createTestStudent(instB.id, { firstName: 'Ananya', lastName: 'Gupta' });

    const instParentA = await createTestInstituteParent(instA.id, { name: 'Rajesh Gupta' });
    const instParentB = await createTestInstituteParent(instB.id, { name: 'Rajesh Gupta' });

    // 1. Create global ParentIdentity (Phone Anchor)
    const parentIdentity = await createTestParentIdentity({
      phone: '+919876543210',
    });

    expect(parentIdentity.id).toBeDefined();

    // 2. Create ChildProfiles under global ParentIdentity
    const childProfileA = await createTestChildProfile(parentIdentity.id, { name: 'Aarav Gupta' });
    const childProfileB = await createTestChildProfile(parentIdentity.id, { name: 'Ananya Gupta' });

    // 3. Create tenant-scoped StudentLinks
    await db.studentLink.create({
      data: {
        childProfileId: childProfileA.id,
        studentId: studentA.id,
        instituteId: instA.id,
      },
    });

    await db.studentLink.create({
      data: {
        childProfileId: childProfileB.id,
        studentId: studentB.id,
        instituteId: instB.id,
      },
    });

    // 4. Create multi-tenant parent institute memberships
    await db.instituteMembership.create({
      data: {
        instituteId: instA.id,
        parentIdentityId: parentIdentity.id,
        instituteParentId: instParentA.id,
      },
    });

    await db.instituteMembership.create({
      data: {
        instituteId: instB.id,
        parentIdentityId: parentIdentity.id,
        instituteParentId: instParentB.id,
      },
    });

    // Verify parent has access to child records in Institute A
    const instAMembership = await db.instituteMembership.findFirst({
      where: { instituteId: instA.id, parentIdentityId: parentIdentity.id },
      include: {
        parentIdentity: {
          include: {
            childProfiles: {
              include: {
                studentLinks: {
                  include: { student: true },
                },
              },
            },
          },
        },
      },
    });

    expect(instAMembership).not.toBeNull();
    expect(instAMembership?.parentIdentity.childProfiles).toHaveLength(2);

    const linkedStudentA = instAMembership?.parentIdentity.childProfiles
      .flatMap((c) => c.studentLinks)
      .find((link) => link.student.instituteId === instA.id);

    expect(linkedStudentA?.student.firstName).toBe('Aarav');

    // Verify tenant boundary: Institute A cannot view Student B
    const instAStudentCheck = await db.student.findFirst({
      where: { id: studentB.id, instituteId: instA.id },
    });
    expect(instAStudentCheck).toBeNull();
  });
});
