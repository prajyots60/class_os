// ── Domain ───────────────────────────────────────────────────────────────────
export * from './domain/entities/billing-plan.entity';
export * from './domain/entities/invoice.entity';
export * from './domain/entities/payment.entity';
export * from './domain/enums/billing-type.enum';
export * from './domain/enums/discount-type.enum';
export * from './domain/enums/invoice-status.enum';
export * from './domain/enums/payment-mode.enum';
export * from './domain/repositories/billing-plan.repository';
export * from './domain/repositories/invoice.repository';
export * from './domain/repositories/payment.repository';
export * from './domain/services/installment-calculator';
export * from './domain/value-objects/discount.vo';

// ── Application ─────────────────────────────────────────────────────────────
export * from './application/dto/billing-plan.dto';
export * from './application/dto/invoice.dto';
export * from './application/dto/payment.dto';
export * from './application/use-cases/billing-plan.use-cases';
export * from './application/use-cases/invoice.use-cases';
export * from './application/use-cases/payment.use-cases';

// ── Infrastructure ───────────────────────────────────────────────────────────
export * from './infrastructure/repositories/prisma-billing-plan.repository';
export * from './infrastructure/repositories/prisma-invoice.repository';
export * from './infrastructure/repositories/prisma-payment.repository';

// ── Presentation ─────────────────────────────────────────────────────────────
export * from './presentation/validators/billing-plan.validator';

export const BILLING_MODULE_NAME = 'billing';
