/**
 * global-search.dto.ts
 *
 * Strongly typed DTO contracts for Phase 6.5 Global Search.
 *
 * INVARIANTS:
 * - Exposed DTOs contain ONLY serializable primitives (strings, numbers, plain objects).
 * - Zero Prisma model objects or domain entity instances exposed.
 * - Max 10 results per category.
 */

export interface StudentSearchResultDTO {
  id: string;
  displayName: string;
  admissionNumber: string;
  status: string;
  targetPath: string;
}

export interface BatchSearchResultDTO {
  id: string;
  displayName: string;
  code: string;
  subjectName?: string;
  status: string;
  targetPath: string;
}

export interface InvoiceSearchResultDTO {
  id: string;
  invoiceNumber: string;
  studentName?: string;
  amount: number;
  status: string;
  targetPath: string;
}

export interface GlobalSearchDTO {
  query: string;
  students: StudentSearchResultDTO[];
  batches: BatchSearchResultDTO[];
  invoices: InvoiceSearchResultDTO[];
}
