import { z } from 'zod';
import type { ChildProfileDTO } from '../../domain/entities/child-profile.entity';

export type { ChildProfileDTO };

export const createChildProfileSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
    avatar: z.string().max(255, 'Avatar URL cannot exceed 255 characters').nullable().optional(),
  })
  .strict();

export type CreateChildProfileInput = z.infer<typeof createChildProfileSchema>;

export const updateChildProfileSchema = z
  .object({
    name: z.string().min(1, 'Name cannot be empty').max(100, 'Name cannot exceed 100 characters').optional(),
    avatar: z.string().max(255, 'Avatar URL cannot exceed 255 characters').nullable().optional(),
  })
  .strict();

export type UpdateChildProfileInput = z.infer<typeof updateChildProfileSchema>;
