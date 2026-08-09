import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  ApplicationError,
} from './errors';

describe('Application Error Taxonomy', () => {
  it('instantiates ValidationError with status code 400 and code VALIDATION_ERROR', () => {
    const err = new ValidationError('Invalid input data');
    expect(err).toBeInstanceOf(ApplicationError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.publicMessage).toBe('Invalid input data');
  });

  it('instantiates AuthenticationError with status code 401 and code UNAUTHENTICATED', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHENTICATED');
  });

  it('instantiates AuthorizationError with status code 403 and code FORBIDDEN', () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('instantiates NotFoundError with status code 404 and code NOT_FOUND', () => {
    const err = new NotFoundError('Student not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('instantiates ConflictError with status code 409 and code CONFLICT', () => {
    const err = new ConflictError('Unique constraint failed');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('instantiates RateLimitError with status code 429 and code RATE_LIMITED', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMITED');
  });

  it('instantiates InternalError with status code 500 and code INTERNAL_ERROR', () => {
    const err = new InternalError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });
});
