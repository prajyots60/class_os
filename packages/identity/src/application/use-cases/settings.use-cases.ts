import { logger } from '@coaching-os/observability';
import { NotFoundError } from '@coaching-os/shared';
import type {
  InstituteEntityProps,
  InstituteStatus,
  UpdateInstituteDetailsProps,
} from '../../domain/entities/institute.entity';
import type { InstituteRepository } from '../../domain/repositories/institute.repository';
import { CAPABILITIES, requireAnyCapability } from '../../authorization';
import type { TenantContext } from './membership.use-cases';

export interface GetInstituteSettingsQuery {
  tenantContext: TenantContext;
}

export type InstituteSettingsDTO = InstituteEntityProps;

export class GetInstituteSettingsUseCase {
  constructor(private readonly repository: InstituteRepository) {}

  public async execute(query: GetInstituteSettingsQuery): Promise<InstituteSettingsDTO> {
    const { tenantContext } = query;

    // 1. Authorization: Capability check (settings:read or institute:read)
    requireAnyCapability(tenantContext, [
      CAPABILITIES.SETTINGS_READ,
      CAPABILITIES.INSTITUTE_READ,
    ]);

    // 2. Fetch aggregate strictly scoped to trusted tenantContext.instituteId
    const institute = await this.repository.findById(tenantContext.instituteId);
    if (!institute) {
      throw new NotFoundError(`Institute with ID ${tenantContext.instituteId} not found.`);
    }

    // 3. Return clean DTO
    return institute.toJSON();
  }
}

export interface UpdateInstituteSettingsCommand {
  tenantContext: TenantContext;
  details: UpdateInstituteDetailsProps;
}

export class UpdateInstituteSettingsUseCase {
  constructor(private readonly repository: InstituteRepository) {}

  public async execute(command: UpdateInstituteSettingsCommand): Promise<InstituteSettingsDTO> {
    const { tenantContext, details } = command;

    // 1. Authorization MUST occur BEFORE repository fetch or mutation
    requireAnyCapability(tenantContext, [
      CAPABILITIES.SETTINGS_UPDATE,
      CAPABILITIES.INSTITUTE_UPDATE,
    ]);

    // 2. Fetch aggregate strictly scoped to trusted tenantContext.instituteId
    const existing = await this.repository.findById(tenantContext.instituteId);
    if (!existing) {
      throw new NotFoundError(`Institute with ID ${tenantContext.instituteId} not found.`);
    }

    // 3. Apply domain mutation & validations (logoUrl, primaryColor, non-empty fields)
    existing.updateDetails(details);

    // 4. Persist updated aggregate
    const updated = await this.repository.update(existing);

    // 5. Emit structured observability event for audit log tracking
    const updatedFields = Object.keys(details).filter(
      (key) => details[key as keyof UpdateInstituteDetailsProps] !== undefined,
    );

    logger.info(
      {
        userId: tenantContext.userId,
        instituteId: tenantContext.instituteId,
        operation: 'identity.institute.settings.updated',
        updatedFields,
      },
      'identity.institute.settings.updated',
    );

    // 6. Return clean DTO
    return updated.toJSON();
  }
}
