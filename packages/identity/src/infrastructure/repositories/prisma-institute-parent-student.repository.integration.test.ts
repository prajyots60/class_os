import { describe, expect, it, beforeEach } from 'vitest';
import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { InstituteParentStudentEntity } from '../../domain/entities/institute-parent-student.entity';
import { PrismaInstituteParentStudentRepository } from './prisma-institute-parent-student.repository';

describe('PrismaInstituteParentStudentRepository Integration Tests', () => {
  const repository = new PrismaInstituteParentStudentRepository();

  const instAId = '10000000-0000-4000-a000-000000000001';
  const instBId = '10000000-0000-4000-a000-000000000002';

  const globalParent1Id = '20000000-0000-4000-a000-000000000001';
  const globalParent2Id = '20000000-0000-4000-a000-000000000002';

  const parentCRM_A1_Id = '30000000-0000-4000-a000-000000000001';
  const parentCRM_A2_Id = '30000000-0000-4000-a000-000000000002';
  const parentCRM_B1_Id = '30000000-0000-4000-a000-000000000003';

  const studentA1_Id = '40000000-0000-4000-a000-000000000001';
  const studentA2_Id = '40000000-0000-4000-a000-000000000002';
  const studentB1_Id = '40000000-0000-4000-a000-000000000003';

  beforeEach(async () => {
    // Clean up test records
    await db.instituteParentStudent.deleteMany();
    await db.student.deleteMany();
    await db.instituteParent.deleteMany();
    await db.parentIdentity.deleteMany();
    await db.institute.deleteMany();

    // Seed Institute A & B
    await db.institute.createMany({
      data: [
        { id: instAId, name: 'Institute Alpha', slug: 'inst-alpha', phone: '+919876543210', email: 'alpha@inst.com' },
        { id: instBId, name: 'Institute Beta', slug: 'inst-beta', phone: '+919876543211', email: 'beta@inst.com' },
      ],
    });

    // Seed Global Parent Identities
    await db.parentIdentity.createMany({
      data: [
        { id: globalParent1Id, phone: '+919999900001', name: 'Global Parent One' },
        { id: globalParent2Id, phone: '+919999900002', name: 'Global Parent Two' },
      ],
    });

    // Seed Institute Parent CRM records
    await db.instituteParent.createMany({
      data: [
        { id: parentCRM_A1_Id, instituteId: instAId, parentIdentityId: globalParent1Id },
        { id: parentCRM_A2_Id, instituteId: instAId, parentIdentityId: globalParent2Id },
        { id: parentCRM_B1_Id, instituteId: instBId, parentIdentityId: globalParent1Id },
      ],
    });

    // Seed Students
    await db.student.createMany({
      data: [
        { id: studentA1_Id, instituteId: instAId, admissionNumber: 'ADM-A1', firstName: 'Student', lastName: 'A1' },
        { id: studentA2_Id, instituteId: instAId, admissionNumber: 'ADM-A2', firstName: 'Student', lastName: 'A2' },
        { id: studentB1_Id, instituteId: instBId, admissionNumber: 'ADM-B1', firstName: 'Student', lastName: 'B1' },
      ],
    });
  });

  it('should create and retrieve a relationship entity', async () => {
    const relId = '50000000-0000-4000-a000-000000000001';
    const entity = InstituteParentStudentEntity.create({
      id: relId,
      instituteId: instAId,
      instituteParentId: parentCRM_A1_Id,
      studentId: studentA1_Id,
      relationshipType: 'father',
      isPrimary: true,
    });

    const created = await repository.create(entity);
    expect(created.id).toBe(relId);
    expect(created.relationshipType).toBe('father');
    expect(created.isPrimary).toBe(true);

    const found = await repository.findById(instAId, relId);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(relId);

    const foundByPair = await repository.findByPair(instAId, parentCRM_A1_Id, studentA1_Id);
    expect(foundByPair).not.toBeNull();
    expect(foundByPair?.id).toBe(relId);
  });

  it('should enforce strict tenant isolation for find, update, and archive operations', async () => {
    const relId = '50000000-0000-4000-a000-000000000002';
    const entity = InstituteParentStudentEntity.create({
      id: relId,
      instituteId: instAId,
      instituteParentId: parentCRM_A1_Id,
      studentId: studentA1_Id,
      relationshipType: 'mother',
    });

    await repository.create(entity);

    // Cross-tenant lookup from Institute B returns null
    const foundInstB = await repository.findById(instBId, relId);
    expect(foundInstB).toBeNull();

    // Cross-tenant update from Institute B throws NotFoundError
    const crossTenantEntity = InstituteParentStudentEntity.from({
      id: entity.id,
      instituteId: instBId,
      instituteParentId: entity.instituteParentId,
      studentId: entity.studentId,
      relationshipType: entity.relationshipType,
      isPrimary: entity.isPrimary,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });

    await expect(repository.update(crossTenantEntity)).rejects.toThrow(NotFoundError);

    // Cross-tenant archive from Institute B throws NotFoundError
    await expect(repository.archive(instBId, relId)).rejects.toThrow(NotFoundError);
  });

  it('should reject creating a link if parent or student belongs to another institute', async () => {
    // Attempt to link Inst A Parent with Inst B Student
    const crossEntity = InstituteParentStudentEntity.create({
      instituteId: instAId,
      instituteParentId: parentCRM_A1_Id,
      studentId: studentB1_Id, // Student belongs to Inst B!
      relationshipType: 'guardian',
    });

    await expect(repository.create(crossEntity)).rejects.toThrow(NotFoundError);
  });

  it('should reject duplicate creation for the same parent and student pair with ConflictError', async () => {
    const entity1 = InstituteParentStudentEntity.create({
      instituteId: instAId,
      instituteParentId: parentCRM_A1_Id,
      studentId: studentA1_Id,
      relationshipType: 'father',
    });
    await repository.create(entity1);

    const entity2 = InstituteParentStudentEntity.create({
      instituteId: instAId,
      instituteParentId: parentCRM_A1_Id,
      studentId: studentA1_Id,
      relationshipType: 'guardian',
    });

    await expect(repository.create(entity2)).rejects.toThrow(ConflictError);
  });

  it('should list relationships by student ID and parent ID within tenant', async () => {
    const rel1 = InstituteParentStudentEntity.create({
      instituteId: instAId,
      instituteParentId: parentCRM_A1_Id,
      studentId: studentA1_Id,
      relationshipType: 'father',
      isPrimary: true,
    });
    const rel2 = InstituteParentStudentEntity.create({
      instituteId: instAId,
      instituteParentId: parentCRM_A2_Id,
      studentId: studentA1_Id,
      relationshipType: 'mother',
      isPrimary: false,
    });
    await repository.create(rel1);
    await repository.create(rel2);

    const studentGuardians = await repository.listByStudentId(instAId, studentA1_Id);
    expect(studentGuardians).toHaveLength(2);
    expect(studentGuardians[0].isPrimary).toBe(true);

    const parentStudents = await repository.listByInstituteParentId(instAId, parentCRM_A1_Id);
    expect(parentStudents).toHaveLength(1);
    expect(parentStudents[0].studentId).toBe(studentA1_Id);
  });

  it('should atomically set primary guardian and clear existing primary guardian status', async () => {
    const rel1 = await repository.create(
      InstituteParentStudentEntity.create({
        instituteId: instAId,
        instituteParentId: parentCRM_A1_Id,
        studentId: studentA1_Id,
        relationshipType: 'father',
        isPrimary: true,
      }),
    );
    const rel2 = await repository.create(
      InstituteParentStudentEntity.create({
        instituteId: instAId,
        instituteParentId: parentCRM_A2_Id,
        studentId: studentA1_Id,
        relationshipType: 'mother',
        isPrimary: false,
      }),
    );

    // Promote rel2 to primary
    await repository.setPrimaryGuardian(instAId, studentA1_Id, rel2.id);

    const updatedRel1 = await repository.findById(instAId, rel1.id);
    const updatedRel2 = await repository.findById(instAId, rel2.id);

    expect(updatedRel1?.isPrimary).toBe(false);
    expect(updatedRel2?.isPrimary).toBe(true);
  });

  it('should preserve ParentIdentity, InstituteParent, and Student when archiving a relationship', async () => {
    const rel = await repository.create(
      InstituteParentStudentEntity.create({
        instituteId: instAId,
        instituteParentId: parentCRM_A1_Id,
        studentId: studentA1_Id,
        relationshipType: 'father',
      }),
    );

    await repository.archive(instAId, rel.id);

    const archivedRel = await repository.findById(instAId, rel.id);
    expect(archivedRel?.status).toBe('archived');

    // Verify parent and student DB records remain intact
    const parentDb = await db.instituteParent.findUnique({ where: { id: parentCRM_A1_Id } });
    const studentDb = await db.student.findUnique({ where: { id: studentA1_Id } });
    const globalParentDb = await db.parentIdentity.findUnique({ where: { id: globalParent1Id } });

    expect(parentDb).not.toBeNull();
    expect(studentDb).not.toBeNull();
    expect(globalParentDb).not.toBeNull();
  });
});
