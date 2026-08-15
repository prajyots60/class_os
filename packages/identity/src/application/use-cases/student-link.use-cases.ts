import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { StudentLinkEntity } from '../../domain/entities/student-link.entity';
import type { ChildProfileRepository } from '../../domain/repositories/child-profile.repository';
import type { StudentLinkRepository } from '../../domain/repositories/student-link.repository';
import type {
  CreateStudentLinkInput,
  StudentLinkDTO,
} from '../dto/student-link.dto';

export class CreateStudentLinkUseCase {
  constructor(
    private readonly childProfileRepo: ChildProfileRepository,
    private readonly studentLinkRepo: StudentLinkRepository,
  ) {}

  async execute(
    parentIdentityId: string,
    childProfileId: string,
    input: CreateStudentLinkInput,
  ): Promise<StudentLinkDTO> {
    // 1. Verify child profile ownership
    const profile = await this.childProfileRepo.findById(childProfileId);
    if (!profile || profile.parentIdentityId !== parentIdentityId) {
      throw new NotFoundError('Child profile not found');
    }

    // 2. Fetch target student
    const student = await db.student.findUnique({
      where: { id: input.studentId },
    });

    if (!student || student.status !== 'active') {
      throw new NotFoundError('Student not found');
    }

    // 3. Relationship Verification (check InstituteParentStudent or Phone match)
    const parentIdentity = await db.parentIdentity.findUnique({
      where: { id: parentIdentityId },
    });

    if (!parentIdentity) {
      throw new NotFoundError('Parent identity not found');
    }

    // Check (a): Tenant CRM InstituteParentStudent
    const ips = await db.instituteParentStudent.findFirst({
      where: {
        studentId: student.id,
        deletedAt: null,
        status: 'active',
        instituteParent: {
          parentIdentityId,
          status: 'active',
        },
      },
    });

    let isAuthorizedRelationship = !!ips;

    // Check (b): Phone match between ParentIdentity and Student
    if (!isAuthorizedRelationship && parentIdentity.phone && student.phone) {
      if (parentIdentity.phone === student.phone) {
        isAuthorizedRelationship = true;
      }
    }

    // Universal 404 Masking: if no relationship verification matches, return 404
    if (!isAuthorizedRelationship) {
      throw new NotFoundError('Student not found');
    }

    // 4. Check for duplicate link
    const existingLink = await this.studentLinkRepo.findByChildProfileAndStudent(
      childProfileId,
      input.studentId,
    );

    if (existingLink) {
      throw new ConflictError('Student is already linked to this child profile');
    }

    // 5. Create link
    const linkEntity = StudentLinkEntity.create({
      childProfileId,
      studentId: student.id,
      instituteId: student.instituteId,
    });

    const saved = await this.studentLinkRepo.create(linkEntity);
    return saved.toDTO();
  }
}

export class ListStudentLinksUseCase {
  constructor(
    private readonly childProfileRepo: ChildProfileRepository,
    private readonly studentLinkRepo: StudentLinkRepository,
  ) {}

  async execute(
    parentIdentityId: string,
    childProfileId: string,
  ): Promise<StudentLinkDTO[]> {
    const profile = await this.childProfileRepo.findById(childProfileId);
    if (!profile || profile.parentIdentityId !== parentIdentityId) {
      throw new NotFoundError('Child profile not found');
    }

    const links = await this.studentLinkRepo.findByChildProfileId(childProfileId);
    return links.map((l) => l.toDTO());
  }
}

export class RemoveStudentLinkUseCase {
  constructor(
    private readonly childProfileRepo: ChildProfileRepository,
    private readonly studentLinkRepo: StudentLinkRepository,
  ) {}

  async execute(
    parentIdentityId: string,
    childProfileId: string,
    studentLinkId: string,
  ): Promise<void> {
    const profile = await this.childProfileRepo.findById(childProfileId);
    if (!profile || profile.parentIdentityId !== parentIdentityId) {
      throw new NotFoundError('Child profile not found');
    }

    const link = await this.studentLinkRepo.findById(studentLinkId);
    if (!link || link.childProfileId !== childProfileId) {
      throw new NotFoundError('Student link not found');
    }

    // Perform hard delete of join row only
    await this.studentLinkRepo.delete(studentLinkId);
  }
}
