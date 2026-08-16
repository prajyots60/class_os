import { db } from '@coaching-os/database';
import { NotFoundError } from '@coaching-os/shared';
import type { ParentHubRepository } from '../../domain/repositories/parent-hub.repository';
import type {
  ParentHubDTO,
  ParentHubProfileSummaryDTO,
  ParentHubStudentSummaryDTO,
  ParentHubInstituteSummaryDTO,
} from '../../application/dto/parent-hub.dto';

export class PrismaParentHubRepository implements ParentHubRepository {
  async getHubByParentIdentityId(parentIdentityId: string): Promise<ParentHubDTO> {
    const parent = await db.parentIdentity.findUnique({
      where: { id: parentIdentityId },
    });

    if (!parent) {
      throw new NotFoundError('ParentIdentity not found');
    }

    const profilesRecords = await db.childProfile.findMany({
      where: { parentIdentityId },
      include: {
        studentLinks: {
          include: {
            student: {
              include: {
                institute: true,
                enrollments: {
                  where: { status: 'active' },
                  include: {
                    batch: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalLinks = 0;
    const institutesMap = new Map<string, { id: string; name: string; slug: string; studentIds: Set<string> }>();

    const profiles: ParentHubProfileSummaryDTO[] = profilesRecords.map((p) => {
      const linkedStudents: ParentHubStudentSummaryDTO[] = p.studentLinks.map((link) => {
        totalLinks += 1;
        const student = link.student;
        const institute = student.institute;

        if (!institutesMap.has(institute.id)) {
          institutesMap.set(institute.id, {
            id: institute.id,
            name: institute.name,
            slug: institute.slug,
            studentIds: new Set<string>(),
          });
        }
        institutesMap.get(institute.id)!.studentIds.add(student.id);

        const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');

        return {
          linkId: link.id,
          studentId: student.id,
          instituteId: institute.id,
          instituteName: institute.name,
          admissionNumber: student.admissionNumber,
          firstName: student.firstName,
          middleName: student.middleName,
          lastName: student.lastName,
          fullName,
          status: student.status,
          enrollments: student.enrollments.map((e) => ({
            id: e.id,
            batchId: e.batchId,
            batchName: e.batch.name,
            status: e.status,
          })),
        };
      });

      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        linkedStudents,
      };
    });

    const institutes: ParentHubInstituteSummaryDTO[] = Array.from(institutesMap.values()).map((inst) => ({
      id: inst.id,
      name: inst.name,
      slug: inst.slug,
      studentCount: inst.studentIds.size,
    }));

    return {
      parent: {
        id: parent.id,
        phone: parent.phone,
        name: parent.name,
        avatar: parent.avatar,
        status: parent.status,
      },
      profiles,
      institutes,
      meta: {
        totalProfiles: profiles.length,
        totalLinks,
        totalInstitutes: institutes.length,
      },
    };
  }
}
