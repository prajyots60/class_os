import type { OwnerDashboardDTO } from '@coaching-os/administration';

export class DashboardApiClient {
  public static async getOwnerDashboard(): Promise<OwnerDashboardDTO> {
    const res = await fetch('/api/v1/dashboard/owner', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      let errorMessage = 'Failed to load Owner Dashboard data.';
      const statusCode = res.status;
      try {
        const errorJson = await res.json();
        if (errorJson?.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Fallback to default error message
      }
      const err = new Error(errorMessage) as Error & { statusCode?: number };
      err.statusCode = statusCode;
      throw err;
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json?.error?.message || 'Invalid dashboard response format.');
    }

    return json.data as OwnerDashboardDTO;
  }
}
