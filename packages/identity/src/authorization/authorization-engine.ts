import { AuthorizationError } from '@coaching-os/shared';
import { logger } from '@coaching-os/observability';
import { type Capability } from './capabilities';
import { getCapabilitiesForRole, roleHasCapability } from './role-capabilities';
import type { MembershipRole } from '../domain/entities/institute-membership.entity';
import type { TenantContext } from '../application/use-cases/membership.use-cases';

/**
 * Defensive check ensuring a TenantContext is well-formed, active, and strictly tenant-scoped.
 */
function isValidTenantContext(context: unknown): context is TenantContext {
  if (!context || typeof context !== 'object') {
    return false;
  }

  const ctx = context as Partial<TenantContext>;

  if (
    typeof ctx.userId !== 'string' ||
    ctx.userId.trim() === '' ||
    typeof ctx.instituteId !== 'string' ||
    ctx.instituteId.trim() === '' ||
    typeof ctx.membershipId !== 'string' ||
    ctx.membershipId.trim() === '' ||
    typeof ctx.role !== 'string' ||
    ctx.role.trim() === '' ||
    ctx.status !== 'active'
  ) {
    return false;
  }

  return true;
}

/**
 * Centralized Capability-Based Authorization Engine for CoachingOS
 *
 * Implements tenant-scoped, deny-by-default policy evaluations against trusted TenantContext.
 * Invariant: Authorization is ALWAYS evaluated per TenantContext (userId + instituteId + role + membershipId).
 * Zero database queries are performed by this engine.
 */
export class AuthorizationEngine {
  /**
   * Resolves capability set for a given MembershipRole.
   */
  public static getCapabilitiesForRole(role: MembershipRole): ReadonlySet<Capability> {
    return getCapabilitiesForRole(role);
  }

  /**
   * Evaluates if a given TenantContext possesses a single capability.
   */
  public static hasCapability(context: TenantContext, capability: Capability): boolean {
    if (!isValidTenantContext(context)) {
      return false;
    }

    return roleHasCapability(context.role, capability);
  }

  /**
   * Evaluates if a given TenantContext possesses ALL specified capabilities.
   * An empty capabilities array returns true.
   */
  public static hasAllCapabilities(
    context: TenantContext,
    capabilities: Capability[],
  ): boolean {
    if (!Array.isArray(capabilities)) {
      return false;
    }

    if (capabilities.length === 0) {
      return true;
    }

    if (!isValidTenantContext(context)) {
      return false;
    }

    for (const capability of capabilities) {
      if (!roleHasCapability(context.role, capability)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluates if a given TenantContext possesses AT LEAST ONE specified capability.
   * An empty capabilities array returns false.
   */
  public static hasAnyCapability(
    context: TenantContext,
    capabilities: Capability[],
  ): boolean {
    if (!Array.isArray(capabilities) || capabilities.length === 0) {
      return false;
    }

    if (!isValidTenantContext(context)) {
      return false;
    }

    for (const capability of capabilities) {
      if (roleHasCapability(context.role, capability)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Asserts that a TenantContext possesses a required capability.
   * Throws AuthorizationError if denied.
   */
  public static requireCapability(context: TenantContext, capability: Capability): void {
    if (!this.hasCapability(context, capability)) {
      logger.warn(
        {
          userId: context?.userId,
          instituteId: context?.instituteId,
          membershipId: context?.membershipId,
          role: context?.role,
          capability,
          event: 'security.authorization.denied',
        },
        `Security Alert: Authorization denied for capability '${capability}'`,
      );

      throw new AuthorizationError(`Permission denied: Missing required capability '${capability}'`);
    }
  }

  /**
   * Asserts that a TenantContext possesses ALL required capabilities.
   * Throws AuthorizationError if denied.
   */
  public static requireAllCapabilities(
    context: TenantContext,
    capabilities: Capability[],
  ): void {
    if (!this.hasAllCapabilities(context, capabilities)) {
      const missing = capabilities.filter((cap) => !this.hasCapability(context, cap));
      const firstMissing = missing[0] || 'unknown';

      logger.warn(
        {
          userId: context?.userId,
          instituteId: context?.instituteId,
          membershipId: context?.membershipId,
          role: context?.role,
          missingCapabilities: missing,
          event: 'security.authorization.denied',
        },
        `Security Alert: Authorization denied for capabilities: ${missing.join(', ')}`,
      );

      throw new AuthorizationError(
        `Permission denied: Missing required capability '${firstMissing}'`,
      );
    }
  }

  /**
   * Asserts that a TenantContext possesses AT LEAST ONE of the required capabilities.
   * Throws AuthorizationError if denied.
   */
  public static requireAnyCapability(
    context: TenantContext,
    capabilities: Capability[],
  ): void {
    if (!this.hasAnyCapability(context, capabilities)) {
      logger.warn(
        {
          userId: context?.userId,
          instituteId: context?.instituteId,
          membershipId: context?.membershipId,
          role: context?.role,
          requiredCapabilities: capabilities,
          event: 'security.authorization.denied',
        },
        `Security Alert: Authorization denied for any capability in: ${capabilities.join(', ')}`,
      );

      throw new AuthorizationError(
        `Permission denied: Missing at least one required capability in [${capabilities.join(', ')}]`,
      );
    }
  }
}

/**
 * Ergonomic Top-Level Assertion Guard Helpers
 */
export function requireCapability(context: TenantContext, capability: Capability): void {
  AuthorizationEngine.requireCapability(context, capability);
}

export function requireAllCapabilities(
  context: TenantContext,
  capabilities: Capability[],
): void {
  AuthorizationEngine.requireAllCapabilities(context, capabilities);
}

export function requireAnyCapability(
  context: TenantContext,
  capabilities: Capability[],
): void {
  AuthorizationEngine.requireAnyCapability(context, capabilities);
}
