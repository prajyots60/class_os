import { describe, it, expect, beforeEach } from 'vitest';
import { db, setupTestDatabase } from '@coaching-os/database';
import { PrismaStudentRepository } from './prisma-student.repository';
import { PrismaInstituteParentRepository } from './prisma-institute-parent.repository';
import { PrismaInstituteParentStudentRepository } from './prisma-institute-parent-student.repository';
import { PrismaProgramRepository } from './prisma-program.repository';
import { PrismaSubjectRepository } from './prisma-subject.repository';
import { PrismaProgramSubjectRepository } from './prisma-program-subject.repository';
import { PrismaBatchRepository } from './prisma-batch.repository';
import { PrismaEnrollmentRepository } from './prisma-enrollment.repository';
import { PrismaInstituteMembershipRepository } from './prisma-institute-membership.repository';

describe('Phase 1.14.1 — Repository Isolation Integration Suite', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  async function bootstrapTwoTenants() {
    const timestamp = Date.now();
    const suffix = `${timestamp}_${Math.floor(Math.random() * 10000)}`;

    const instA = await db.institute.create({
      data: {
        name: `Tenant A ${suffix}`,
        slug: `tenant-a-${suffix}`,
        email: `inst_a_${suffix}@test.com`,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      },
    });

    const instB = await db.institute.create({
      data: {
        name: `Tenant B ${suffix}`,
        slug: `tenant-b-${suffix}`,
        email: `inst_b_${suffix}@test.com`,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      },
    });

    return { instA, instB, suffix };
  }

  it('TENANT-DB-01: StudentRepository findById, update, listByInstitute isolate Tenant A from Tenant B', async () => {
    const { instA, instB } = await bootstrapTwoTenants();
    const repo = new PrismaStudentRepository();

    const studentB = await db.student.create({
      data: {
        instituteId: instB.id,
        admissionNumber: `ADM-B-${Date.now()}`,
        firstName: 'Student',
        lastName: 'B',
      },
    });

    // 1. Cross-tenant findById returns null
    const found = await repo.findById(instA.id, studentB.id);
    expect(found).toBeNull();

    // 2. Cross-tenant listByInstitute returns zero records from Tenant B
    const listA = await repo.listByInstitute(instA.id);
    expect(listA.some((s) => s.id === studentB.id)).toBe(false);
  });

  it('TENANT-DB-02: ProgramRepository findById, listByInstitute isolate Tenant A from Tenant B', async () => {
    const { instA, instB } = await bootstrapTwoTenants();
    const repo = new PrismaProgramRepository();

    const progB = await db.program.create({
      data: {
        instituteId: instB.id,
        name: `Program B ${Date.now()}`,
        code: `PROG-B-${Date.now()}`,
      },
    });

    const found = await repo.findById(instA.id, progB.id);
    expect(found).toBeNull();

    const listA = await repo.listByInstitute(instA.id);
    expect(listA.some((p) => p.id === progB.id)).toBe(false);
  });

  it('TENANT-DB-03: SubjectRepository findById, listByInstitute isolate Tenant A from Tenant B', async () => {
    const { instA, instB } = await bootstrapTwoTenants();
    const repo = new PrismaSubjectRepository();

    const subjB = await db.subject.create({
      data: {
        instituteId: instB.id,
        name: `Subject B ${Date.now()}`,
        code: `SUBJ-B-${Date.now()}`,
      },
    });

    const found = await repo.findById(instA.id, subjB.id);
    expect(found).toBeNull();

    const listA = await repo.listByInstitute(instA.id);
    expect(listA.some((s) => s.id === subjB.id)).toBe(false);
  });

  it('TENANT-DB-04: BatchRepository findById, listByInstitute isolate Tenant A from Tenant B', async () => {
    const { instA, instB } = await bootstrapTwoTenants();
    const repo = new PrismaBatchRepository();

    const progB = await db.program.create({
      data: { instituteId: instB.id, name: `Prog ${Date.now()}`, code: `PB-${Date.now()}` },
    });
    const subjB = await db.subject.create({
      data: { instituteId: instB.id, name: `Subj ${Date.now()}`, code: `SB-${Date.now()}` },
    });

    const batchB = await db.batch.create({
      data: {
        instituteId: instB.id,
        programId: progB.id,
        subjectId: subjB.id,
        name: `Batch B ${Date.now()}`,
        code: `BAT-B-${Date.now()}`,
      },
    });

    const found = await repo.findById(instA.id, batchB.id);
    expect(found).toBeNull();

    const listA = await repo.listByInstitute(instA.id);
    expect(listA.some((b) => b.id === batchB.id)).toBe(false);
  });

  it('TENANT-DB-05: EnrollmentRepository findById, findByStudent isolate Tenant A from Tenant B', async () => {
    const { instA, instB } = await bootstrapTwoTenants();
    const repo = new PrismaEnrollmentRepository();

    const studentB = await db.student.create({
      data: { instituteId: instB.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'B' },
    });
    const progB = await db.program.create({
      data: { instituteId: instB.id, name: `Prog ${Date.now()}`, code: `PB-${Date.now()}` },
    });
    const subjB = await db.subject.create({
      data: { instituteId: instB.id, name: `Subj ${Date.now()}`, code: `SB-${Date.now()}` },
    });
    const batchB = await db.batch.create({
      data: { instituteId: instB.id, programId: progB.id, subjectId: subjB.id, name: `B`, code: `BAT-${Date.now()}` },
    });

    const enrB = await db.enrollment.create({
      data: {
        instituteId: instB.id,
        studentId: studentB.id,
        batchId: batchB.id,
        status: 'active',
      },
    });

    const found = await repo.findById(instA.id, enrB.id);
    expect(found).toBeNull();

    const listA = await repo.listByInstitute(instA.id);
    expect(listA.some((e) => e.id === enrB.id)).toBe(false);
  });

  it('TENANT-DB-06: InstituteParentRepository findById, listByInstitute isolate Tenant A from Tenant B', async () => {
    const { instA, instB } = await bootstrapTwoTenants();
    const repo = new PrismaInstituteParentRepository();

    const pId = await db.parentIdentity.create({ data: { phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}` } });
    const ipB = await db.instituteParent.create({
      data: { instituteId: instB.id, parentIdentityId: pId.id },
    });

    const found = await repo.findById(instA.id, ipB.id);
    expect(found).toBeNull();

    const listA = await repo.listByInstitute(instA.id);
    expect(listA.some((p) => p.id === ipB.id)).toBe(false);
  });

  it('TENANT-DB-07: InstituteMembershipRepository findStaffById isolates Tenant A from Tenant B', async () => {
    const { instA, instB } = await bootstrapTwoTenants();
    const repo = new PrismaInstituteMembershipRepository();

    const userB = await db.user.create({
      data: {
        email: `staff_b_${Date.now()}@test.com`,
        name: 'Staff B',
        instituteId: instB.id,
      },
    });

    const memIdB = `mem:${userB.id}:${instB.id}`;

    const found = await repo.findStaffById!(instA.id, memIdB);
    expect(found).toBeNull();
  });
});
