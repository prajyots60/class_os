import { db } from '@coaching-os/database';
import type {
  AuthorizedStudentContext,
  ParentAuthorizationRepository,
  ParentChildProfile,
  ParentStudentLink,
} from '../../domain/repositories/parent-authorization.repository';

export class PrismaParentAuthorizationRepository
  implements ParentAuthorizationRepository
{
  async findChildProfile(
    childProfileId: string,
  ): Promise<ParentChildProfile | null> {
    const profile = await db.childProfile.findUnique({
      where: { id: childProfileId },
    });

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      parentIdentityId: profile.parentIdentityId,
      name: profile.name,
      avatar: profile.avatar,
    };
  }

  async findStudentLink(
    studentLinkId: string,
  ): Promise<ParentStudentLink | null> {
    const link = await db.studentLink.findUnique({
      where: { id: studentLinkId },
      include: { childProfile: true },
    });

    if (!link || !link.childProfile) {
      return null;
    }

    return {
      id: link.id,
      childProfileId: link.childProfileId,
      studentId: link.studentId,
      instituteId: link.instituteId,
      parentIdentityId: link.childProfile.parentIdentityId,
    };
  }

  async resolveParentStudentRelationship(
    parentIdentityId: string,
    studentId: string,
  ): Promise<AuthorizedStudentContext | null> {
    // 1. Evaluate platform global StudentLink via ChildProfile
    const studentLink = await db.studentLink.findFirst({
      where: {
        studentId,
        childProfile: {
          parentIdentityId,
        },
      },
    });

    if (studentLink) {
      return {
        studentId: studentLink.studentId,
        instituteId: studentLink.instituteId,
        childProfileId: studentLink.childProfileId,
        relationshipPath: 'student_link',
      };
    }

    // 2. Evaluate tenant CRM InstituteParentStudent via InstituteParent
    const ips = await db.instituteParentStudent.findFirst({
      where: {
        studentId,
        deletedAt: null,
        status: 'active',
        instituteParent: {
          parentIdentityId,
          status: 'active',
        },
      },
    });

    if (ips) {
      return {
        studentId: ips.studentId,
        instituteId: ips.instituteId,
        relationshipPath: 'institute_parent',
      };
    }

    return null;
  }
}
