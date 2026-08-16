import { generateRequestId } from '@coaching-os/observability';
import { type NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import { NotFoundError } from '@coaching-os/shared';
import { ParentAuthorizationEngine } from '@coaching-os/identity';
import {
  apiSuccess,
  withParentAuthGuard,
  methodNotAllowed,
} from '../../../../_lib/v1-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();
  const { id: studentId } = await params;

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const authzEngine = new ParentAuthorizationEngine();
    const authz = await authzEngine.authorizeStudent(parentCtx, studentId);

    if (!authz) {
      throw new NotFoundError(`Student "${studentId}" not found or unauthorized.`);
    }

    // Fetch student & institute details
    const student = await db.student.findFirst({
      where: { id: authz.studentId, instituteId: authz.instituteId },
      include: { institute: true },
    });

    if (!student) {
      throw new NotFoundError(`Student "${studentId}" details not found.`);
    }

    // Fetch student's enrollments with billing plans, invoices, payments, receipts
    const enrollments = await db.enrollment.findMany({
      where: { studentId: authz.studentId, instituteId: authz.instituteId },
      include: {
        batch: { select: { id: true, name: true } },
        billingPlans: {
          include: {
            invoices: {
              include: {
                payments: {
                  include: { receipt: true },
                  orderBy: { receivedOn: 'desc' },
                },
              },
              orderBy: { dueDate: 'desc' },
            },
          },
        },
      },
    });

    const invoiceItems: Array<{
      id: string;
      enrollmentId: string;
      batchName: string;
      amount: number;
      paidAmount: number;
      outstandingAmount: number;
      dueDate: string;
      status: string;
      createdAt: string;
    }> = [];

    const paymentItems: Array<{
      id: string;
      invoiceId: string;
      batchName: string;
      amount: number;
      paymentMode: string;
      receivedOn: string;
      remarks: string | null;
      receiptId: string | null;
      receiptNumber: string | null;
    }> = [];

    const receiptItems: Array<{
      id: string;
      receiptNumber: string;
      paymentId: string;
      amount: number;
      paymentMode: string;
      generatedAt: string;
      batchName: string;
    }> = [];

    for (const enrollment of enrollments) {
      const batchName = enrollment.batch.name;
      for (const plan of enrollment.billingPlans) {
        for (const inv of plan.invoices) {
          const invAmount = Number(inv.amount);
          const paidAmount = inv.payments.reduce(
            (sum, p) => sum + Number(p.amount),
            0,
          );
          const outstandingAmount = Math.max(0, invAmount - paidAmount);

          invoiceItems.push({
            id: inv.id,
            enrollmentId: enrollment.id,
            batchName,
            amount: invAmount,
            paidAmount,
            outstandingAmount,
            dueDate: inv.dueDate.toISOString(),
            status: inv.status,
            createdAt: inv.createdAt.toISOString(),
          });

          for (const p of inv.payments) {
            const pAmount = Number(p.amount);
            const receiptId = p.receipt ? p.receipt.id : null;
            const receiptNumber = p.receipt ? p.receipt.receiptNumber : null;

            paymentItems.push({
              id: p.id,
              invoiceId: inv.id,
              batchName,
              amount: pAmount,
              paymentMode: p.paymentMode,
              receivedOn: p.receivedOn.toISOString(),
              remarks: p.remarks,
              receiptId,
              receiptNumber,
            });

            if (p.receipt) {
              receiptItems.push({
                id: p.receipt.id,
                receiptNumber: p.receipt.receiptNumber,
                paymentId: p.id,
                amount: pAmount,
                paymentMode: p.paymentMode,
                generatedAt: p.receipt.generatedAt.toISOString(),
                batchName,
              });
            }
          }
        }
      }
    }

    // Sort items chronologically
    invoiceItems.sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
    );
    paymentItems.sort(
      (a, b) =>
        new Date(b.receivedOn).getTime() - new Date(a.receivedOn).getTime(),
    );
    receiptItems.sort(
      (a, b) =>
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
    );

    const totalOutstandingAmount = invoiceItems.reduce(
      (sum, inv) => sum + inv.outstandingAmount,
      0,
    );
    const pendingInvoiceCount = invoiceItems.filter(
      (inv) => inv.status === 'pending' || inv.status === 'partial',
    ).length;
    const paidInvoiceCount = invoiceItems.filter(
      (inv) => inv.status === 'paid',
    ).length;

    const lastPayment = paymentItems.length > 0 ? paymentItems[0] : null;

    const data = {
      student: {
        id: student.id,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        admissionNumber: student.admissionNumber,
        instituteId: student.instituteId,
        instituteName: student.institute.name,
      },
      summary: {
        totalOutstandingAmount,
        pendingInvoiceCount,
        paidInvoiceCount,
        lastPayment: lastPayment
          ? {
              amount: lastPayment.amount,
              paymentMode: lastPayment.paymentMode,
              receivedOn: lastPayment.receivedOn,
              receiptNumber: lastPayment.receiptNumber,
            }
          : null,
      },
      invoices: invoiceItems,
      payments: paymentItems,
      receipts: receiptItems,
    };

    return apiSuccess(data, requestId);
  });
}

export async function POST() {
  return methodNotAllowed(['GET']);
}

export async function PATCH() {
  return methodNotAllowed(['GET']);
}

export async function DELETE() {
  return methodNotAllowed(['GET']);
}
