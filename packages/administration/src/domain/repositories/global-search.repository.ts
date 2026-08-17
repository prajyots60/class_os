import type { GlobalSearchDTO } from '../../application/dto/global-search.dto';

export interface GlobalSearchRepository {
  search(query: string, instituteId: string): Promise<GlobalSearchDTO>;
}
