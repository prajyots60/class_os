import { z } from 'zod';

export const createBillingPlanSchema = z
  .object({
    enrollmentId: z.string().uuid({ message: 'Enrollment ID must be a valid UUID' }),
    type: z.enum(['monthly', 'one_time', 'installment'], {
      errorMap: () => ({ message: 'Type must be monthly, one_time, or installment' }),
    }),
    amount: z.number().nonnegative({ message: 'Base billing amount cannot be negative' }),
    discountType: z.enum(['none', 'percentage', 'fixed']).optional().nullable(),
    discountValue: z.number().nonnegative({ message: 'Discount value cannot be negative' }).optional().nullable(),
    billingStartDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Billing start date must be a valid ISO date string',
    }),
    firstInvoiceAmountOverride: z
      .number()
      .nonnegative({ message: 'First invoice amount override cannot be negative' })
      .optional()
      .nullable(),
  })
  .strict();

export const updateBillingPlanSchema = z
  .object({
    discountType: z.enum(['none', 'percentage', 'fixed']).optional(),
    discountValue: z.number().nonnegative({ message: 'Discount value cannot be negative' }).optional().nullable(),
    firstInvoiceAmountOverride: z
      .number()
      .nonnegative({ message: 'First invoice amount override cannot be negative' })
      .optional()
      .nullable(),
  })
  .strict();

export type CreateBillingPlanSchemaInput = z.infer<typeof createBillingPlanSchema>;
export type UpdateBillingPlanSchemaInput = z.infer<typeof updateBillingPlanSchema>;
