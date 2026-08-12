/**
 * Web Application Singleton Client for Protected Identity APIs (/api/v1)
 *
 * Configured with same-origin credentials to automatically forward Better Auth session cookies.
 */

import { V1IdentityApiClient } from '@coaching-os/identity/client';

export const v1ApiClient = new V1IdentityApiClient({
  baseUrl: '',
  credentials: 'same-origin',
  headers: {
    'Accept': 'application/json',
  },
});

export { V1ApiError } from '@coaching-os/identity/client';
