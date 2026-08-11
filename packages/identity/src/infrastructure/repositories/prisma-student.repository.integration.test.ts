import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { StudentEntity } from '../../domain/entities/student.entity';
import { PrismaStudentRepository } from './prisma-student.repository';

describe('PrismaStudentRepository Integration Suite', () => {
  let repository: PrismaStudentRepository;

  // Test Fixtures
  let instituteA_Id: string;
  let instituteB_Id: string;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaStudentRepository();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

    // Create 2 Test Institutes
    const instA = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Apex Academy Institute A',
        slug: `apex-inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543210',
        email: `inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}@apex.com`,
      },
    });
    instituteA_Id = instA.id;

    const instB = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Zenith Classes Institute B',
        slug: `zenith-inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543211',
        email: `inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}@zenith.com`,
      },
    });
    instituteB_Id = instB.id;
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('1. creates and persists a Student record in PostgreSQL', async () => {
    const student = StudentEntity.create({
      instituteId: instituteA_Id,
      admissionNumber: 'STU-2026-0001',
      firstName: 'Aarav',
      middleName: 'Kumar',
      lastName: 'Sharma',
      dateOfBirth: '2010-05-15',
      gender: 'male',
      phone: '+919876543210',
      email: 'aarav@example.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      admissionStatus: 'admitted',
    });

    const saved = await repository.create(student);

    expect(saved.id).toBe(student.id);
    expect(saved.instituteId).toBe(instituteA_Id);
    expect(saved.admissionNumber).toBe('STU-2026-0001');
    expect(saved.firstName).toBe('Aarav');
    expect(saved.middleName).toBe('Kumar');
    expect(saved.lastName).toBe('Sharma');
    expect(saved.displayName).toBe('Aarav Kumar Sharma');
    expect(saved.dateOfBirth?.value).toBe('2010-05-15');
    expect(saved.gender).toBe('male');
    expect(saved.phone?.value).toBe('+919876543210');
    expect(saved.email).toBe('aarav@example.com');
    expect(saved.city).toBe('Mumbai');
    expect(saved.admissionStatus).toBe('admitted');
    expect(saved.status).toBe('active');

    // Verify raw PostgreSQL table record
    const dbRecord = await db.student.findUnique({
      where: { id: student.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.instituteId).toBe(instituteA_Id);
    expect(dbRecord?.admissionNumber).toBe('STU-2026-0001');
    expect(dbRecord?.firstName).toBe('Aarav');
    expect(dbRecord?.lastName).toBe('Sharma');
  });

  it('2. ENFORCES UNIQUE(institute_id, admission_number): blocks duplicate admission number in same institute with ConflictError', async () => {
    const student1 = StudentEntity.create({
      instituteId: instituteA_Id,
      admissionNumber: 'ADM-101',
      firstName: 'Rohan',
      lastName: 'Verma',
    });
    await repository.create(student1);

    const student2 = StudentEntity.create({
      instituteId: instituteA_Id, // SAME institute
      admissionNumber: 'ADM-101', // SAME admission number
      firstName: 'Priya',
      lastName: 'Singh',
    });

    await expect(repository.create(student2)).rejects.toThrow(ConflictError);
  });

  it('3. ALLOWS SAME admissionNumber in MULTIPLE institutes (Multi-Tenant Scoped Uniqueness)', async () => {
    const studentA = StudentEntity.create({
      instituteId: instituteA_Id,
      admissionNumber: 'ADM-101',
      firstName: 'Rohan',
      lastName: 'Verma',
    });
    const savedA = await repository.create(studentA);

    const studentB = StudentEntity.create({
      instituteId: instituteB_Id, // DIFFERENT institute
      admissionNumber: 'ADM-101', // SAME admission number
      firstName: 'Neha',
      lastName: 'Gupta',
    });
    const savedB = await repository.create(studentB);

    expect(savedA.id).not.toBe(savedB.id);
    expect(savedA.instituteId).toBe(instituteA_Id);
    expect(savedB.instituteId).toBe(instituteB_Id);
    expect(savedA.admissionNumber).toBe('ADM-101');
    expect(savedB.admissionNumber).toBe('ADM-101');
  });

  it('4. ENFORCES TENANT ISOLATION: Institute B cannot look up Institute A student by ID', async () => {
    const studentA = StudentEntity.create({
      instituteId: instituteA_Id,
      admissionNumber: 'ADM-201',
      firstName: 'Aditya',
      lastName: 'Joshi',
    });
    await repository.create(studentA);

    // Institute A lookup -> SUCCESS
    const foundA = await repository.findById(instituteA_Id, studentA.id);
    expect(foundA).not.toBeNull();
    expect(foundA?.firstName).toBe('Aditya');

    // Institute B lookup for same student ID -> RETURNS NULL (Strict Isolation)
    const foundB = await repository.findById(instituteB_Id, studentA.id);
    expect(foundB).toBeNull();
  });

  it('5. ENFORCES TENANT ISOLATION: Institute B cannot look up Institute A student by admission number', async () => {
    const studentA = StudentEntity.create({
      instituteId: instituteA_Id,
      admissionNumber: 'ADM-301',
      firstName: 'Kavya',
      lastName: 'Iyer',
    });
    await repository.create(studentA);

    // Institute A lookup -> SUCCESS
    const foundA = await repository.findByAdmissionNumber(instituteA_Id, 'ADM-301');
    expect(foundA).not.toBeNull();
    expect(foundA?.id).toBe(studentA.id);

    // Institute B lookup -> RETURNS NULL
    const foundB = await repository.findByAdmissionNumber(instituteB_Id, 'ADM-301');
    expect(foundB).toBeNull();
  });

  it('6. lists students strictly scoped to institute with status/search filters and pagination', async () => {
    const s1 = StudentEntity.create({
      instituteId: instituteA_Id,
      admissionNumber: 'STU-001',
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'aarav@test.com',
      admissionStatus: 'admitted',
    });
    const s2 = StudentEntity.create({
      instituteId: instituteA_Id,
      admissionNumber: 'STU-002',
      firstName: 'Ananya',
      lastName: 'Roy',
      status: 'inactive',
    });
    const sB = StudentEntity.create({
      instituteId: instituteB_Id,
      admissionNumber: 'STU-001',
      firstName: 'Bhavya',
      lastName: 'Patel',
    });

    await repository.create(s1);
    await repository.create(s2);
    await repository.create(sB);

    // List Inst A
    const listA = await repository.listByInstitute(instituteA_Id);
    expect(listA).toHaveLength(2);

    // Filter Inst A by active status
    const activeA = await repository.listByInstitute(instituteA_Id, { status: 'active' });
    expect(activeA).toHaveLength(1);
    expect(activeA[0].id).toBe(s1.id);

    // Search Inst A by term "Roy"
    const searchResult = await repository.listByInstitute(instituteA_Id, { search: 'Roy' });
    expect(searchResult).toHaveLength(1);
    expect(searchResult[0].id).toBe(s2.id);

    // List Inst B
    const listB = await repository.listByInstitute(instituteB_Id);
    expect(listB).toHaveLength(1);
    expect(listB[0].id).toBe(sB.id);
  });

  it('7. updates profile and contact within tenant context and rejects cross-tenant update', async () => {
    const student = StudentEntity.create({
      instituteId: instituteA_Id,
      admissionNumber: 'STU-401',
      firstName: 'Dev',
      lastName: 'Mehta',
    });
    await repository.create(student);

    student.updateProfile({ firstName: 'Devendra' });
    student.updateContactAndAddress({ city: 'Pune' });

    const updated = await repository.update(student);
    expect(updated.firstName).toBe('Devendra');
    expect(updated.city).toBe('Pune');

    // Attempt to update record under Institute B context
    const maliciousAttempt = StudentEntity.from({
      id: student.id,
      instituteId: instituteB_Id, // WRONG TENANT
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      phone: student.phone,
      email: student.email,
      admissionStatus: student.admissionStatus,
      status: student.status,
      createdAt: student.createdAt,
      updatedAt: new Date(),
    });

    await expect(repository.update(maliciousAttempt)).rejects.toThrow(NotFoundError);
  });

  it('8. checks existence of student by (instituteId, admissionNumber)', async () => {
    const student = StudentEntity.create({
      instituteId: instituteA_Id,
      admissionNumber: 'STU-501',
      firstName: 'Isha',
      lastName: 'Malhotra',
    });
    await repository.create(student);

    expect(await repository.existsByAdmissionNumber(instituteA_Id, 'STU-501')).toBe(true);
    expect(await repository.existsByAdmissionNumber(instituteB_Id, 'STU-501')).toBe(false);
    expect(await repository.existsByAdmissionNumber(instituteA_Id, 'STU-999')).toBe(false);
  });

  it('9. soft archives student record setting status to archived and deletedAt timestamp', async () => {
    const student = StudentEntity.create({
      instituteId: instituteA_Id,
      admissionNumber: 'STU-601',
      firstName: 'Kabir',
      lastName: 'Kapoor',
    });
    await repository.create(student);

    student.archive();
    const updated = await repository.update(student);

    expect(updated.status).toBe('archived');
    expect(updated.deletedAt).toBeInstanceOf(Date);

    // Verify row still exists in DB
    const dbRecord = await db.student.findUnique({ where: { id: student.id } });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.status).toBe('archived');
    expect(dbRecord?.deletedAt).not.toBeNull();
  });

  it('10. throws ValidationError when creating student with non-existent institute ID', async () => {
    const fakeInstId = crypto.randomUUID();
    const student = StudentEntity.create({
      instituteId: fakeInstId,
      admissionNumber: 'STU-701',
      firstName: 'Tara',
      lastName: 'Sutaria',
    });

    await expect(repository.create(student)).rejects.toThrow(ValidationError);
  });
});
