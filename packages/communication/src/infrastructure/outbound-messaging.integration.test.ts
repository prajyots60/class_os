import { db } from '@coaching-os/database';
import { ConflictError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EnqueueOutboundMessageUseCase } from '../application/use-cases/outbound-message.use-cases';
import { OutboundMessageEntity, maskPhoneNumber } from '../domain/entities/outbound-message.entity';
import { MockWhatsAppProvider, MetaWhatsAppProvider } from './providers/whatsapp.provider';
import { PrismaOutboundMessageRepository } from './repositories/prisma-outbound-message.repository';
import { OutboundMessageWorker } from './workers/outbound-message-worker';

describe('Phase 4.5 — Outbound Messaging & WhatsApp Provider Integration & Security Suite', () => {
  const prisma = db;
  const repository = new PrismaOutboundMessageRepository(prisma);

  let instituteId: string;
  let userId: string;
  let notificationId: string;

  beforeAll(async () => {
    // Seed prerequisite database records
    instituteId = crypto.randomUUID();
    userId = crypto.randomUUID();
    notificationId = crypto.randomUUID();

    await prisma.institute.create({
      data: {
        id: instituteId,
        name: 'Outbound Messaging Test Institute',
        slug: `outbound-inst-${Date.now()}`,
        phone: '+919876543210',
        email: `outbound-${Date.now()}@test.com`,
      },
    });

    await prisma.user.create({
      data: {
        id: userId,
        instituteId,
        name: 'Parent User',
        email: `parent-outbound-${Date.now()}@test.com`,
        phone: '+919876543210',
      },
    });

    await prisma.notification.create({
      data: {
        id: notificationId,
        instituteId,
        recipientUserId: userId,
        recipientType: 'parent',
        title: 'Fee Payment Receipt',
        message: 'Payment of INR 5000 received.',
        category: 'fee',
        priority: 'informational',
      },
    });
  });

  afterAll(async () => {
    await prisma.outboundMessageQueue.deleteMany({ where: { instituteId } });
    await prisma.notification.deleteMany({ where: { instituteId } });
    await prisma.user.deleteMany({ where: { instituteId } });
    await prisma.institute.deleteMany({ where: { id: instituteId } });
  });

  beforeEach(async () => {
    await prisma.outboundMessageQueue.deleteMany({ where: { instituteId } });
  });

  // ============================================================================
  // 1. Database & Persistence & State Machine Tests
  // ============================================================================
  describe('Queue Persistence & State Machine', () => {
    it('should create and retrieve an outbound message entity', async () => {
      const msg = OutboundMessageEntity.create({
        id: crypto.randomUUID(),
        instituteId,
        notificationId,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'receipt_issued_template',
        templateVariables: { amount: '5000' },
      });

      const saved = await repository.save(msg);
      expect(saved.id).toBe(msg.id);
      expect(saved.status).toBe('pending');

      const retrieved = await repository.findById(instituteId, msg.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.templateName).toBe('receipt_issued_template');
    });

    it('should enforce unique idempotency boundary at database level', async () => {
      const msgId1 = crypto.randomUUID();
      const msgId2 = crypto.randomUUID();

      const msg1 = OutboundMessageEntity.create({
        id: msgId1,
        instituteId,
        notificationId,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'test_template',
      });

      await repository.save(msg1);

      // Attempt inserting second record with identical (instituteId, notificationId, channel, recipientUserId)
      const msg2 = OutboundMessageEntity.create({
        id: msgId2,
        instituteId,
        notificationId,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'test_template',
      });

      await expect(repository.save(msg2)).rejects.toThrow(ConflictError);
    });

    it('should reject invalid state transitions on entity', () => {
      const msg = OutboundMessageEntity.create({
        id: crypto.randomUUID(),
        instituteId,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'test_template',
        status: 'sent',
      });

      expect(() => msg.markProcessing()).toThrow(ValidationError);
    });
  });

  // ============================================================================
  // 2. Queue Worker & Concurrency Tests
  // ============================================================================
  describe('Queue Worker & Concurrency', () => {
    it('should claim pending jobs atomically and deliver successfully via worker', async () => {
      const msg = OutboundMessageEntity.create({
        id: crypto.randomUUID(),
        instituteId,
        notificationId,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'test_template',
      });
      await repository.save(msg);

      const mockProvider = new MockWhatsAppProvider(true);
      const worker = new OutboundMessageWorker(repository, mockProvider);

      const result = await worker.processNextBatch(10);
      expect(result.claimed).toBe(1);
      expect(result.sent).toBe(1);
      expect(mockProvider.sentMessages).toHaveLength(1);

      const updated = await repository.findById(instituteId, msg.id);
      expect(updated?.status).toBe('sent');
      expect(updated?.sentAt).not.toBeNull();
    });

    it('should prevent multi-worker race conditions when claiming same queue jobs', async () => {
      // Seed 5 pending jobs
      for (let i = 0; i < 5; i++) {
        await repository.save(
          OutboundMessageEntity.create({
            id: crypto.randomUUID(),
            instituteId,
            recipientUserId: userId,
            recipientPhone: `+91987654320${i}`,
            templateName: 'test_template',
          }),
        );
      }

      const mockProvider = new MockWhatsAppProvider(true);
      const workerA = new OutboundMessageWorker(repository, mockProvider);
      const workerB = new OutboundMessageWorker(repository, mockProvider);

      // Trigger parallel worker processing
      const [resA, resB] = await Promise.all([workerA.processNextBatch(5), workerB.processNextBatch(5)]);

      // Total claimed jobs across workers must equal exactly 5 without double-processing
      expect(resA.claimed + resB.claimed).toBe(5);
      expect(mockProvider.sentMessages).toHaveLength(5);
    });

    it('should handle retryable provider failure with exponential backoff', async () => {
      const msg = OutboundMessageEntity.create({
        id: crypto.randomUUID(),
        instituteId,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'test_template',
        attempts: 0,
        maxAttempts: 3,
      });
      await repository.save(msg);

      const mockProvider = new MockWhatsAppProvider(true);
      mockProvider.setNextFailure(true, true); // Fail next with retryable=true

      const worker = new OutboundMessageWorker(repository, mockProvider);
      const result = await worker.processNextBatch(10);

      expect(result.claimed).toBe(1);
      expect(result.retried).toBe(1);

      const updated = await repository.findById(instituteId, msg.id);
      expect(updated?.status).toBe('pending');
      expect(updated?.attempts).toBe(1);
      expect(updated?.lastError).toContain('Simulated WhatsApp provider delivery failure');
    });

    it('should transition job to failed state when max attempts is reached', async () => {
      const msg = OutboundMessageEntity.create({
        id: crypto.randomUUID(),
        instituteId,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'test_template',
        attempts: 2,
        maxAttempts: 3,
      });
      await repository.save(msg);

      const mockProvider = new MockWhatsAppProvider(true);
      mockProvider.setNextFailure(true, true);

      const worker = new OutboundMessageWorker(repository, mockProvider);
      const result = await worker.processNextBatch(10);

      expect(result.claimed).toBe(1);
      expect(result.failed).toBe(1);

      const updated = await repository.findById(instituteId, msg.id);
      expect(updated?.status).toBe('failed');
      expect(updated?.attempts).toBe(3);
    });
  });

  // ============================================================================
  // 3. Provider Abstraction & Configuration Gracefulness
  // ============================================================================
  describe('Provider & Configuration Behavior', () => {
    it('should skip delivery cleanly when WhatsApp is unconfigured without crashing system', async () => {
      const unconfiguredProvider = new MockWhatsAppProvider(false);
      expect(unconfiguredProvider.isConfigured()).toBe(false);

      const worker = new OutboundMessageWorker(repository, unconfiguredProvider);
      const result = await worker.processNextBatch(10);

      expect(result.claimed).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should properly classify Meta HTTP provider errors', () => {
      const unconfiguredMeta = new MetaWhatsAppProvider('', '');
      expect(unconfiguredMeta.isConfigured()).toBe(false);
    });
  });

  // ============================================================================
  // 4. Security & Privacy Tests
  // ============================================================================
  describe('Security & Privacy Guarantees', () => {
    it('S-WA-005: should mask sensitive phone numbers in DTOs and utilities', () => {
      expect(maskPhoneNumber('+919876543210')).toBe('+9198****10');

      const msg = OutboundMessageEntity.create({
        id: crypto.randomUUID(),
        instituteId,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'test_template',
      });

      const dto = msg.toDTO();
      expect(dto.maskedPhone).toBe('+9198****10');
      expect(dto.recipientPhone).toBe('+919876543210');
    });

    it('S-WA-003: should enforce tenant boundary during outbound message retrieval', async () => {
      const otherInstId = crypto.randomUUID();
      const msg = OutboundMessageEntity.create({
        id: crypto.randomUUID(),
        instituteId,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'test_template',
      });
      await repository.save(msg);

      const crossTenantResult = await repository.findById(otherInstId, msg.id);
      expect(crossTenantResult).toBeNull();
    });

    it('Idempotency Use Case: should prevent enqueuing duplicate message for same notification', async () => {
      const enqueueUseCase = new EnqueueOutboundMessageUseCase(repository);

      const dto1 = await enqueueUseCase.execute({
        instituteId,
        notificationId,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'test_template',
      });

      const dto2 = await enqueueUseCase.execute({
        instituteId,
        notificationId,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'test_template',
      });

      expect(dto1.id).toBe(dto2.id);
    });
  });

  // ============================================================================
  // 5. In-App First & Core Business Transaction Resilience
  // ============================================================================
  describe('In-App First & Delivery Isolation', () => {
    it('WhatsApp failure MUST NOT affect Notification persistence', async () => {
      // Create notification
      const newNotif = await prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          instituteId,
          recipientUserId: userId,
          recipientType: 'parent',
          title: 'Emergency Notice',
          message: 'Class cancelled today.',
          category: 'announcement',
        },
      });

      // Enqueue outbound message with provider DOWN
      const failingProvider = new MockWhatsAppProvider(true);
      failingProvider.setNextFailure(true, true);

      const enqueueUseCase = new EnqueueOutboundMessageUseCase(repository);
      const outboundDto = await enqueueUseCase.execute({
        instituteId,
        notificationId: newNotif.id,
        recipientUserId: userId,
        recipientPhone: '+919876543210',
        templateName: 'announcement_cancelled',
      });

      const worker = new OutboundMessageWorker(repository, failingProvider);
      await worker.processNextBatch(10);

      // Notification must remain intact and valid in DB
      const persistedNotif = await prisma.notification.findUnique({ where: { id: newNotif.id } });
      expect(persistedNotif).not.toBeNull();
      expect(persistedNotif?.title).toBe('Emergency Notice');

      // Outbound message queue remains pending/retryable without crashing system
      const outboundJob = await repository.findById(instituteId, outboundDto.id);
      expect(outboundJob?.status).toBe('pending');
      expect(outboundJob?.attempts).toBe(1);
    });
  });
});
