/**
 * Sign-In UX state machine type definitions.
 * Models all possible states the sign-in form can be in,
 * preventing implicit boolean flag management.
 */

export type SignInPhase = 'idle' | 'submitting' | 'success' | 'error';

export interface SignInState {
  phase: SignInPhase;
  /** Safe public-facing error message shown to the user. Never contains internal details. */
  errorMessage: string | null;
}

/**
 * Safe payload sent to the Better Auth sign-in client.
 * SECURITY: Contains ONLY email and password.
 * Never includes userId, instituteId, membershipId, role, status, or tenantId.
 */
export interface SignInPayload {
  email: string;
  password: string;
}
