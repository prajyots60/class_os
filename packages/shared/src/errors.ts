export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

export class ApplicationError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly publicMessage: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    statusCode: number,
    publicMessage: string,
    details?: Record<string, unknown>,
  ) {
    super(publicMessage);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends ApplicationError {
  constructor(
    message = 'The request parameters or body are invalid.',
    details?: Record<string, unknown>,
  ) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication is required to access this resource.') {
    super('UNAUTHENTICATED', 401, message);
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message = 'You do not have permission to perform this action.') {
    super('FORBIDDEN', 403, message);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = 'The requested resource was not found.') {
    super('NOT_FOUND', 404, message);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message = 'The operation conflicted with existing resource state.') {
    super('CONFLICT', 409, message);
  }
}

export class RateLimitError extends ApplicationError {
  constructor(message = 'Too many requests. Please slow down and try again later.') {
    super('RATE_LIMITED', 429, message);
  }
}

export class InternalError extends ApplicationError {
  constructor(message = 'An unexpected internal server error occurred.') {
    super('INTERNAL_ERROR', 500, message);
  }
}
