// ── Domain ───────────────────────────────────────────────────────────────────
export * from './domain/entities/billing-plan.entity';
export * from './domain/enums/billing-type.enum';
export * from './domain/enums/discount-type.enum';
export * from './domain/repositories/billing-plan.repository';
export * from './domain/value-objects/discount.vo';

// ── Application ─────────────────────────────────────────────────────────────
export * from './application/dto/billing-plan.dto';
export * from './application/use-cases/billing-plan.use-cases';

// ── Infrastructure ───────────────────────────────────────────────────────────
export * from './infrastructure/repositories/prisma-billing-plan.repository';

// ── Presentation ─────────────────────────────────────────────────────────────
export * from './presentation/validators/billing-plan.validator';

export const BILLING_MODULE_NAME = 'billing';
