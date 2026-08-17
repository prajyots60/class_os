import { AuthenticationError, AuthorizationError } from '@coaching-os/shared';
import type { GlobalSearchRepository } from '../../domain/repositories/global-search.repository';
import type { GlobalSearchDTO } from '../dto/global-search.dto';

export interface GlobalSearchInput {
  query: string;
  instituteId: string;
  authenticatedUserId: string;
}

export class GlobalSearchUseCase {
  constructor(private readonly repository: GlobalSearchRepository) {}

  public async execute(input: GlobalSearchInput): Promise<GlobalSearchDTO> {
    if (!input.authenticatedUserId) {
      throw new AuthenticationError('Authentication is required to perform global search.');
    }

    if (!input.instituteId) {
      throw new AuthorizationError('Tenant context is required to perform global search.');
    }

    const normalizedQuery = (input.query || '').trim();

    if (normalizedQuery.length < 2) {
      return {
        query: normalizedQuery,
        students: [],
        batches: [],
        invoices: [],
      };
    }

    const results = await this.repository.search(normalizedQuery, input.instituteId);

    // Enforce max 10 items per category limit at application boundary
    return {
      query: normalizedQuery,
      students: results.students.slice(0, 10),
      batches: results.batches.slice(0, 10),
      invoices: results.invoices.slice(0, 10),
    };
  }
}
