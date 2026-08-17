import type { GlobalSearchDTO } from '@coaching-os/administration';

export class SearchApiClient {
  public static async globalSearch(query: string): Promise<GlobalSearchDTO> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return {
        query: trimmed,
        students: [],
        batches: [],
        invoices: [],
      };
    }

    const res = await fetch(`/api/v1/search?q=${encodeURIComponent(trimmed)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      let errorMessage = 'Failed to perform global search.';
      const statusCode = res.status;
      try {
        const errorJson = await res.json();
        if (errorJson?.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Fallback to default message
      }
      const err = new Error(errorMessage) as Error & { statusCode?: number };
      err.statusCode = statusCode;
      throw err;
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json?.error?.message || 'Invalid search response format.');
    }

    return json.data as GlobalSearchDTO;
  }
}
