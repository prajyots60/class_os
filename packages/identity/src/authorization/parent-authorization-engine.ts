import { NotFoundError } from '@coaching-os/shared';
import type {
  AuthorizedStudentContext,
  ParentAuthorizationRepository,
  ParentChildProfile,
  ParentStudentLink,
} from '../domain/repositories/parent-authorization.repository';
import { PrismaParentAuthorizationRepository } from '../infrastructure/repositories/prisma-parent-authorization.repository';
import type { ParentAuthContext } from './parent-auth-context';

export { type ParentAuthContext };

export class ParentAuthorizationEngine {
  constructor(
    private readonly repo: ParentAuthorizationRepository = new PrismaParentAuthorizationRepository(),
  ) {}

  /**
   * Evaluates boolean ownership for a generic parent-owned resource.
   */
  public authorizeParentResource(
    ctx: ParentAuthContext,
    resourceParentIdentityId: string,
  ): boolean {
    return ctx.parentIdentityId === resourceParentIdentityId;
  }

  /**
   * Evaluates ownership of a ChildProfile.
   */
  public authorizeChildProfile(
    ctx: ParentAuthContext,
    childProfile: ParentChildProfile,
  ): boolean {
    return childProfile.parentIdentityId === ctx.parentIdentityId;
  }

  /**
   * Evaluates ownership of a StudentLink.
   */
  public authorizeStudentLink(
    ctx: ParentAuthContext,
    studentLink: ParentStudentLink,
  ): boolean {
    return studentLink.parentIdentityId === ctx.parentIdentityId;
  }

  /**
   * Resolves authorized student relationship context.
   * Returns null if no valid relationship exists between the parent and student.
   */
  public async authorizeStudent(
    ctx: ParentAuthContext,
    studentId: string,
  ): Promise<AuthorizedStudentContext | null> {
    return this.repo.resolveParentStudentRelationship(
      ctx.parentIdentityId,
      studentId,
    );
  }

  /**
   * Enforces ChildProfile access with Universal 404 Masking.
   * Throws NotFoundError (HTTP 404) if child profile does not exist or belongs to another parent.
   */
  public async requireChildProfileAccess(
    ctx: ParentAuthContext,
    childProfileId: string,
  ): Promise<ParentChildProfile> {
    const profile = await this.repo.findChildProfile(childProfileId);
    if (!profile || !this.authorizeChildProfile(ctx, profile)) {
      throw new NotFoundError('The requested resource was not found.');
    }
    return profile;
  }

  /**
   * Enforces StudentLink access with Universal 404 Masking.
   * Throws NotFoundError (HTTP 404) if student link does not exist or belongs to another parent.
   */
  public async requireStudentLinkAccess(
    ctx: ParentAuthContext,
    studentLinkId: string,
  ): Promise<ParentStudentLink> {
    const link = await this.repo.findStudentLink(studentLinkId);
    if (!link || !this.authorizeStudentLink(ctx, link)) {
      throw new NotFoundError('The requested resource was not found.');
    }
    return link;
  }

  /**
   * Enforces Student relationship access with Universal 404 Masking.
   * Throws NotFoundError (HTTP 404) if student is unlinked or belongs to another parent/institute.
   */
  public async requireStudentAccess(
    ctx: ParentAuthContext,
    studentId: string,
  ): Promise<AuthorizedStudentContext> {
    const studentCtx = await this.authorizeStudent(ctx, studentId);
    if (!studentCtx) {
      throw new NotFoundError('The requested resource was not found.');
    }
    return studentCtx;
  }
}
