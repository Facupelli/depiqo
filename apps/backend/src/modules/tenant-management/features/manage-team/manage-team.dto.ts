import {
  ChangeTenantCollaboratorRoleBodySchema,
  ChangeTenantCollaboratorRoleResponseSchema,
  CreateTenantCollaboratorBodySchema,
  CreateTenantCollaboratorResponseSchema,
  GetTenantCollaboratorResponseSchema,
  GetTenantCollaboratorsResponseSchema,
  ReactivateTenantCollaboratorResponseSchema,
  ResetTenantCollaboratorPasswordResponseSchema,
  SuspendTenantCollaboratorResponseSchema,
  TenantCollaboratorParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class TenantCollaboratorParamsDto extends createZodDto(TenantCollaboratorParamsSchema) {}
export class CreateTenantCollaboratorBodyDto extends createZodDto(CreateTenantCollaboratorBodySchema) {}
export class ChangeTenantCollaboratorRoleBodyDto extends createZodDto(ChangeTenantCollaboratorRoleBodySchema) {}
export class GetTenantCollaboratorsResponseDto extends createZodDto(GetTenantCollaboratorsResponseSchema) {}
export class GetTenantCollaboratorResponseDto extends createZodDto(GetTenantCollaboratorResponseSchema) {}
export class CreateTenantCollaboratorResponseDto extends createZodDto(CreateTenantCollaboratorResponseSchema) {}
export class ChangeTenantCollaboratorRoleResponseDto extends createZodDto(ChangeTenantCollaboratorRoleResponseSchema) {}
export class SuspendTenantCollaboratorResponseDto extends createZodDto(SuspendTenantCollaboratorResponseSchema) {}
export class ReactivateTenantCollaboratorResponseDto extends createZodDto(ReactivateTenantCollaboratorResponseSchema) {}
export class ResetTenantCollaboratorPasswordResponseDto extends createZodDto(
  ResetTenantCollaboratorPasswordResponseSchema,
) {}
