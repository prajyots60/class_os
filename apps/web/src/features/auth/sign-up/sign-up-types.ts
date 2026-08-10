/**
 * Sign-Up UX state machine type definitions.
 * Models all possible states the sign-up form can be in,
 * preventing implicit boolean flag management.
 */

export type SignUpPhase = 'idle' | 'submitting' | 'success' | 'error';

export interface SignUpState {
  phase: SignUpPhase;
  /** Safe public-facing error message shown to the user. Never contains internal details. */
  errorMessage: string | null;
}

/**
 * Safe payload sent to the Better Auth client.
 * SECURITY: Never includes userId, instituteId, membershipId, role, status, or tenantId.
 */
export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
}
