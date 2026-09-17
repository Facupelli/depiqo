import {
  CreateTenantRoleResponseSchema,
  DeleteTenantRoleResponseSchema,
  GetTenantPermissionCatalogResponseSchema,
  GetTenantRoleResponseSchema,
  GetTenantRolesResponseSchema,
  TenantRoleBodySchema,
  TenantRoleParamsSchema,
  UpdateTenantRoleResponseSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class TenantRoleParamsDto extends createZodDto(TenantRoleParamsSchema) {}
export class TenantRoleBodyDto extends createZodDto(TenantRoleBodySchema) {}
export class GetTenantRolesResponseDto extends createZodDto(GetTenantRolesResponseSchema) {}
export class GetTenantRoleResponseDto extends createZodDto(GetTenantRoleResponseSchema) {}
export class CreateTenantRoleResponseDto extends createZodDto(CreateTenantRoleResponseSchema) {}
export class UpdateTenantRoleResponseDto extends createZodDto(UpdateTenantRoleResponseSchema) {}
export class DeleteTenantRoleResponseDto extends createZodDto(DeleteTenantRoleResponseSchema) {}
export class GetTenantPermissionCatalogResponseDto extends createZodDto(GetTenantPermissionCatalogResponseSchema) {}
