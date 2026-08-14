import { describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { BillingPlanEntity } from '../../domain/entities/billing-plan.entity';
import type { BillingPlanRepository } from '../../domain/repositories/billing-plan.repository';
import {
  CreateBillingPlanUseCase,
  GetBillingPlanUseCase,
  UpdateBillingPlanUseCase,
} from './billing-plan.use-cases';

describe('BillingPlan Application Use Cases', () => {
  const instituteId = '00000000-0000-0000-0000-000000000001';
  const enrollmentId = '00000000-0000-0000-0000-000000000002';
  const startDate = new Date('2026-09-01');

  const mockEnrollmentRepository = {
    findById: vi.fn(),
  } as any;

  const mockBillingPlanRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByEnrollmentId: vi.fn(),
    update: vi.fn(),
  };

  describe('CreateBillingPlanUseCase', () => {
    it('creates a billing plan successfully when enrollment exists', async () => {
      mockEnrollmentRepository.findById.mockResolvedValue({ id: enrollmentId, instituteId });
      mockBillingPlanRepository.findByEnrollmentId.mockResolvedValue(null);
      mockBillingPlanRepository.create.mockImplementation(async (plan: BillingPlanEntity) => plan);

      const useCase = new CreateBillingPlanUseCase(
        mockBillingPlanRepository as unknown as BillingPlanRepository,
        mockEnrollmentRepository,
      );

      const result = await useCase.execute({
        instituteId,
        enrollmentId,
        type: 'monthly',
        amount: 5000,
        billingStartDate: startDate,
      });

      expect(result.id).toBeDefined();
      expect(result.instituteId).toBe(instituteId);
      expect(result.enrollmentId).toBe(enrollmentId);
      expect(result.amount).toBe(5000);
      expect(mockBillingPlanRepository.create).toHaveBeenCalledOnce();
    });

    it('throws NotFoundError if enrollment does not exist in institute', async () => {
      mockEnrollmentRepository.findById.mockResolvedValue(null);

      const useCase = new CreateBillingPlanUseCase(
        mockBillingPlanRepository as unknown as BillingPlanRepository,
        mockEnrollmentRepository,
      );

      await expect(
        useCase.execute({
          instituteId,
          enrollmentId,
          type: 'monthly',
          amount: 5000,
          billingStartDate: startDate,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError if a billing plan already exists for enrollment (BIL-004)', async () => {
      mockEnrollmentRepository.findById.mockResolvedValue({ id: enrollmentId, instituteId });
      const existingPlan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'monthly',
        amount: 5000,
        billingStartDate: startDate,
      });
      mockBillingPlanRepository.findByEnrollmentId.mockResolvedValue(existingPlan);

      const useCase = new CreateBillingPlanUseCase(
        mockBillingPlanRepository as unknown as BillingPlanRepository,
        mockEnrollmentRepository,
      );

      await expect(
        useCase.execute({
          instituteId,
          enrollmentId,
          type: 'monthly',
          amount: 5000,
          billingStartDate: startDate,
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('GetBillingPlanUseCase', () => {
    it('fetches a billing plan by ID', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'monthly',
        amount: 5000,
        billingStartDate: startDate,
      });
      mockBillingPlanRepository.findById.mockResolvedValue(plan);

      const useCase = new GetBillingPlanUseCase(
        mockBillingPlanRepository as unknown as BillingPlanRepository,
      );
      const result = await useCase.execute({ instituteId, id: plan.id });

      expect(result.id).toBe(plan.id);
    });

    it('throws NotFoundError if plan is not found', async () => {
      mockBillingPlanRepository.findById.mockResolvedValue(null);

      const useCase = new GetBillingPlanUseCase(
        mockBillingPlanRepository as unknown as BillingPlanRepository,
      );
      await expect(useCase.execute({ instituteId, id: 'non-existent' })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('UpdateBillingPlanUseCase', () => {
    it('updates discount and override successfully', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'monthly',
        amount: 5000,
        billingStartDate: startDate,
      });
      mockBillingPlanRepository.findById.mockResolvedValue(plan);
      mockBillingPlanRepository.update.mockImplementation(async (p: BillingPlanEntity) => p);

      const useCase = new UpdateBillingPlanUseCase(
        mockBillingPlanRepository as unknown as BillingPlanRepository,
      );
      const result = await useCase.execute({
        instituteId,
        id: plan.id,
        discountType: 'fixed',
        discountValue: 500,
        firstInvoiceAmountOverride: 2000,
      });

      expect(result.discountType).toBe('fixed');
      expect(result.discountValue).toBe(500);
      expect(result.firstInvoiceAmountOverride).toBe(2000);
      expect(mockBillingPlanRepository.update).toHaveBeenCalledOnce();
    });
  });
});
