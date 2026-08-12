/**
 * Standardized /api/v1 Response Envelope Types and Client Error Representation
 * (Aligned with ADR-0015 Specification)
 */

export interface V1MetaDTO {
  requestId: string;
  timestamp: string;
}

export interface V1PaginationDTO {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
  total: number;
}

export interface V1SuccessResponse<T> {
  success: true;
  data: T;
  meta: V1MetaDTO;
}

export interface V1CollectionResponse<T> {
  success: true;
  data: T[];
  pagination: V1PaginationDTO;
  meta: V1MetaDTO;
}

export interface V1FieldErrorDTO {
  field: string;
  issue: string;
}

export interface V1ErrorBodyDTO {
  code: string;
  message: string;
  details?: Record<string, unknown> | V1FieldErrorDTO[] | unknown;
}

export interface V1ErrorResponse {
  success: false;
  error: V1ErrorBodyDTO;
  meta: V1MetaDTO;
}

/**
 * Custom Error thrown by V1 API Client when HTTP response status is >= 400
 */
export class V1ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    code = 'UNKNOWN_ERROR',
    details?: unknown,
    requestId?: string,
  ) {
    super(message);
    this.name = 'V1ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.requestId = requestId;

    // Restore prototype chain
    Object.setPrototypeOf(this, V1ApiError.prototype);
  }
}
