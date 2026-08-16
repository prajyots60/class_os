import { generateRequestId } from '@coaching-os/observability';
import { type NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import { NotFoundError } from '@coaching-os/shared';
import { ParentAuthorizationEngine } from '@coaching-os/identity';
import {
  apiSuccess,
  withParentAuthGuard,
  methodNotAllowed,
} from '../../../../../_lib/v1-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; receiptId: string }> },
) {
  const requestId = generateRequestId();
  const { id: studentId, receiptId } = await params;

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const authzEngine = new ParentAuthorizationEngine();
    const authz = await authzEngine.authorizeStudent(parentCtx, studentId);

    if (!authz) {
      throw new NotFoundError(`Student "${studentId}" not found or unauthorized.`);
    }

    // Query receipt ensuring it belongs to authorized institute & student
    const receipt = await db.receipt.findFirst({
      where: {
        id: receiptId,
        instituteId: authz.instituteId,
      },
      include: {
        institute: true,
        payment: {
          include: {
            invoice: {
              include: {
                billingPlan: {
                  include: {
                    enrollment: {
                      include: {
                        student: true,
                        batch: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !receipt ||
      receipt.payment.invoice.billingPlan.enrollment.studentId !== authz.studentId
    ) {
      throw new NotFoundError(`Receipt "${receiptId}" not found or unauthorized.`);
    }

    const student = receipt.payment.invoice.billingPlan.enrollment.student;
    const batch = receipt.payment.invoice.billingPlan.enrollment.batch;

    const data = {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      generatedAt: receipt.generatedAt.toISOString(),
      institute: {
        id: receipt.institute.id,
        name: receipt.institute.name,
      },
      student: {
        id: student.id,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        admissionNumber: student.admissionNumber,
      },
      batchName: batch.name,
      payment: {
        id: receipt.payment.id,
        amount: Number(receipt.payment.amount),
        paymentMode: receipt.payment.paymentMode,
        receivedOn: receipt.payment.receivedOn.toISOString(),
        remarks: receipt.payment.remarks,
      },
      invoice: {
        id: receipt.payment.invoice.id,
        amount: Number(receipt.payment.invoice.amount),
        dueDate: receipt.payment.invoice.dueDate.toISOString(),
        status: receipt.payment.invoice.status,
      },
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
