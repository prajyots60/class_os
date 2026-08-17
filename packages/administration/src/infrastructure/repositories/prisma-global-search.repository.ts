import { db } from '@coaching-os/database';
import type { GlobalSearchRepository } from '../../domain/repositories/global-search.repository';
import type { GlobalSearchDTO } from '../../application/dto/global-search.dto';

export class PrismaGlobalSearchRepository implements GlobalSearchRepository {
  public async search(query: string, instituteId: string): Promise<GlobalSearchDTO> {
    const searchTerm = query.trim();
    if (!searchTerm || searchTerm.length < 2) {
      return {
        query: searchTerm,
        students: [],
        batches: [],
        invoices: [],
      };
    }

    const invoiceWhere: any = {
      billingPlan: {
        enrollment: {
          instituteId,
        },
      },
      OR: [
        {
          billingPlan: {
            enrollment: {
              student: {
                OR: [
                  { firstName: { contains: searchTerm, mode: 'insensitive' } },
                  { lastName: { contains: searchTerm, mode: 'insensitive' } },
                  { admissionNumber: { contains: searchTerm, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ],
    };

    if (searchTerm.length === 36 && /^[0-9a-fA-F-]{36}$/.test(searchTerm)) {
      invoiceWhere.OR.push({ id: searchTerm });
    }

    const [students, batches, invoices] = await Promise.all([
      db.student.findMany({
        where: {
          instituteId,
          deletedAt: null,
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { admissionNumber: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          status: true,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),

      db.batch.findMany({
        where: {
          instituteId,
          deletedAt: null,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { code: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          subject: { select: { name: true } },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),

      db.invoice.findMany({
        where: invoiceWhere,
        include: {
          billingPlan: {
            include: {
              enrollment: {
                include: {
                  student: true,
                },
              },
            },
          },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      query: searchTerm,
      students: students.map((s) => {
        const displayName = `${s.firstName} ${s.lastName}`.trim();
        return {
          id: s.id,
          displayName,
          admissionNumber: s.admissionNumber,
          status: s.status,
          targetPath: `/students?search=${encodeURIComponent(displayName)}`,
        };
      }),
      batches: batches.map((b) => ({
        id: b.id,
        displayName: b.name,
        code: b.code,
        subjectName: b.subject?.name,
        status: b.status,
        targetPath: `/academics?batchId=${b.id}`,
      })),
      invoices: invoices.map((inv: any) => {
        const student = inv.billingPlan?.enrollment?.student;
        const studentName = student ? `${student.firstName} ${student.lastName}`.trim() : undefined;
        const shortId = inv.id.slice(0, 8).toUpperCase();
        return {
          id: inv.id,
          invoiceNumber: `INV-${shortId}`,
          studentName,
          amount: typeof inv.amount === 'number' ? inv.amount : inv.amount?.toNumber?.() ?? Number(inv.amount),
          status: inv.status,
          targetPath: `/billing?invoiceId=${inv.id}`,
        };
      }),
    };
  }
}
