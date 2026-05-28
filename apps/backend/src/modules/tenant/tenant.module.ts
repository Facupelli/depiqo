import { Module } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { UsersModule } from '../users/users.module';
import { TenantRepository } from './infrastructure/persistence/repositories/tenant.repository';
import { IsSlugTakenQueryHandler } from './application/queries/is-slug-taken/is-slug-taken.query-handler';
import { GetTenantQueryHandler } from './application/queries/get-tenant/get-tenant.query-handler';
import { GetLocationsQueryHandler } from './location/application/queries/get-locations/get-locations.query-handler';
import { GetOwnersQueryHandler } from './owner/application/queries/get-owners/get-owners.query-handler';
import { CreateOwnerCommandHandler } from './owner/application/commands/create-owner/create-owner.command-handler';
import { CreateLocationCommandHandler } from './location/application/commands/create-location/create-location.command-handler';
import { UpdateLocationCommandHandler } from './location/application/commands/update-location/update-location.command-handler';
import { DeactivateLocationCommandHandler } from './location/application/commands/deactivate-location/deactivate-location.command-handler';
import { LocationRepository } from './location/infrastructure/persistence/repositories/location.repository';
import { OwnerRepository } from './owner/infrastructure/persistence/repositories/owner.repository';
import { TenantBillingUnitRepository } from './infrastructure/persistence/repositories/billing-unit.repository';
import { GetTenantBillingUnitsQueryHandler } from './application/queries/get-billing-units/get-tenant-billing-units.query-handler';
import { SyncTenantBillingUnitsService } from './application/commands/sync-billing-units/sync-tenant-billing-units.service';
import { UpdateTenantConfigCommandHandler } from './application/commands/update-config/update-config.command-handler';
import { UpdateTenantBrandingCommandHandler } from './application/commands/update-branding/update-branding.command-handler';
import { FindTenantByCustomDomainQueryHandler } from './application/queries/find-tenant-by-custom-domain/find-tenant-by-custom-domain.query-handler';
import { FindTenantBySlugQueryHandler } from './application/queries/find-tenant-by-slug/find-tenant-by-slug.query-handler';
import { FindTenantByIdQueryHandler } from './application/queries/find-tenant-by-id/find-tenant-by-id.query-handler';
import { GetLocationSchedulesQueryHandler } from './location/application/queries/get-location-schedules/get-location-schedules.query-handler';
import { AddScheduleToLocationCommandHandler } from './location/application/commands/add-schedule-to-location/add-schedule-to-location.command-handler';
import { BulkAddSchedulesToLocationCommandHandler } from './location/application/commands/bulk-add-schedule-to-location/bulk-add-schedule-to-location.command-handler';
import { GetLocationScheduleSlotsQueryHandler } from './location/application/queries/get-location-schedule-slots/get-location-schedule-slots.query-handler';
import { GetLocationContextQueryHandler } from './location/application/queries/get-location-context/get-location-context.query-handler';
import { GetRentalLocationsQueryHandler } from './location/application/queries/get-rental-locations/get-rental-locations.query-handler';
import { GetOwnerQueryHandler } from './owner/application/queries/get-owner/get-owner.query-handler';
import { CreateOwnerContractCommandHandler } from './owner/application/commands/create-owner-contract/create-owner-contract.command-handler';
import { OwnerContractRepository } from './owner/infrastructure/persistence/repositories/owner-contract.repository';
import { FindActiveContractForScopeQueryHandler } from './owner/application/queries/find-active-owner-contract/find-active-owner-contract.query-handler';
import { FindAssetsWithoutActiveOwnerContractsQueryHandler } from './owner/application/queries/find-assets-without-active-owner-contracts/find-assets-without-active-owner-contracts.query-handler';
import { RegisterTenantService } from './application/commands/register-tenant/register-tenant.service';
import { InventoryModule } from '../inventory/inventory.module';
import { GetTenantConfigQueryHandler } from './application/queries/get-tenant-config/get-tenant-config.query-handler';
import { RegisterCustomDomainService } from './application/commands/register-custom-domain/register-custom-domain.service';
import { RefreshCustomDomainStatusService } from './application/commands/refresh-custom-domain-status/refresh-custom-domain-status.service';
import { GetCustomDomainQueryHandler } from './application/queries/get-custom-domain/get-custom-domain.query-handler';
import { RegisterTenantHttpController } from './application/commands/register-tenant/register-tenant.http.controller';
import { RegisterCustomDomainHttpController } from './application/commands/register-custom-domain/register-custom-domain.http.controller';
import { RefreshCustomDomainStatusHttpController } from './application/commands/refresh-custom-domain-status/refresh-custom-domain-status.http.controller';
import { GetCurrentTenantHttpController } from './application/queries/get-tenant/get-current-tenant.http.controller';
import { GetCustomDomainHttpController } from './application/queries/get-custom-domain/get-custom-domain.http.controller';
import { GetTenantBillingUnitsHttpController } from './application/queries/get-billing-units/get-tenant-billing-units.http.controller';
import { GetLocationsHttpController } from './location/application/queries/get-locations/get-locations.http.controller';
import { CreateOwnerHttpController } from './owner/infrastructure/controllers/create-owner.http.controller';
import { CreateOwnerContractHttpController } from './owner/infrastructure/controllers/create-owner-contract.http.controller';
import { GetOwnersHttpController } from './owner/infrastructure/controllers/get-owners.http.controller';
import { GetOwnerHttpController } from './owner/infrastructure/controllers/get-owner.http.controller';
import { TenantPublicApi } from './tenant.public-api';
import { TenantFacade } from './tenant.facade';
import { UpdateTenantConfigHttpController } from './application/commands/update-config/update-tenant-config.http.controller';
import { UpdateTenantBrandingHttpController } from './application/commands/update-branding/update-tenant-branding.http.controller';
import { SyncTenantBillingUnitsHttpController } from './application/commands/sync-billing-units/sync-tenant-billing-units.http.controller';
import { GetTenantPricingConfigHttpController } from './application/queries/get-tenant-config/get-tenant-pricing-config.http.controller';
import { CreateLocationHttpController } from './location/application/commands/create-location/create-location.http.controller';
import { UpdateLocationHttpController } from './location/application/commands/update-location/update-location.http.controller';
import { DeactivateLocationHttpController } from './location/application/commands/deactivate-location/deactivate-location.http.controller';
import { GetLocationScheduleSlotsHttpController } from './location/application/queries/get-location-schedule-slots/get-location-schedule-slots.http.controller';
import { GetLocationSchedulesHttpController } from './location/application/queries/get-location-schedules/get-location-schedules.http.controller';
import { GetRentalLocationSchedulesHttpController } from './location/application/queries/get-rental-location-schedules/get-rental-location-schedules.http.controller';
import { GetRentalLocationsHttpController } from './location/application/queries/get-rental-locations/get-rental-locations.http.controller';
import { AddLocationScheduleHttpController } from './location/application/commands/add-schedule-to-location/add-location-schedule.http.controller';
import { BulkAddLocationSchedulesHttpController } from './location/application/commands/bulk-add-schedule-to-location/bulk-add-location-schedules.http.controller';
import { UpdateLocationScheduleCommandHandler } from './location/application/commands/update-location-schedule/update-location-schedule.command-handler';
import { UpdateLocationScheduleHttpController } from './location/application/commands/update-location-schedule/update-location-schedule.http.controller';
import { CloudflareCustomHostnameService } from './infrastructure/services/cloudflare-custom-hostname.service';

const commandHandlers = [
  RegisterTenantService,
  RegisterCustomDomainService,
  RefreshCustomDomainStatusService,
  UpdateTenantConfigCommandHandler,
  UpdateTenantBrandingCommandHandler,
  SyncTenantBillingUnitsService,
  // owner
  CreateOwnerCommandHandler,
  CreateOwnerContractCommandHandler,
  // location
  CreateLocationCommandHandler,
  UpdateLocationCommandHandler,
  DeactivateLocationCommandHandler,
  AddScheduleToLocationCommandHandler,
  BulkAddSchedulesToLocationCommandHandler,
  UpdateLocationScheduleCommandHandler,
];
const queryHandlers = [
  IsSlugTakenQueryHandler,
  GetCustomDomainQueryHandler,
  GetTenantConfigQueryHandler,
  GetTenantQueryHandler,
  GetTenantBillingUnitsQueryHandler,
  // owner
  GetOwnersQueryHandler,
  GetOwnerQueryHandler,
  FindActiveContractForScopeQueryHandler,
  FindAssetsWithoutActiveOwnerContractsQueryHandler,
  // location
  GetLocationsQueryHandler,
  GetRentalLocationsQueryHandler,
  GetLocationContextQueryHandler,
  GetLocationScheduleSlotsQueryHandler,
  GetLocationSchedulesQueryHandler,
  // internal
  FindTenantByIdQueryHandler,
  FindTenantByCustomDomainQueryHandler,
  FindTenantBySlugQueryHandler,
];

const repositories = [
  {
    provide: TenantRepository,
    useFactory: (prisma: PrismaService) => new TenantRepository(prisma.client),
    inject: [PrismaService],
  },
  TenantBillingUnitRepository,
  LocationRepository,
  OwnerRepository,
  OwnerContractRepository,
];

const controllers = [
  RegisterTenantHttpController,
  RegisterCustomDomainHttpController,
  RefreshCustomDomainStatusHttpController,
  GetCurrentTenantHttpController,
  GetCustomDomainHttpController,
  GetTenantPricingConfigHttpController,
  UpdateTenantConfigHttpController,
  UpdateTenantBrandingHttpController,
  GetTenantBillingUnitsHttpController,
  SyncTenantBillingUnitsHttpController,
  CreateLocationHttpController,
  UpdateLocationHttpController,
  DeactivateLocationHttpController,
  GetLocationsHttpController,
  GetRentalLocationsHttpController,
  GetRentalLocationSchedulesHttpController,
  GetLocationScheduleSlotsHttpController,
  GetLocationSchedulesHttpController,
  AddLocationScheduleHttpController,
  BulkAddLocationSchedulesHttpController,
  UpdateLocationScheduleHttpController,
  CreateOwnerHttpController,
  CreateOwnerContractHttpController,
  GetOwnersHttpController,
  GetOwnerHttpController,
];

@Module({
  imports: [UsersModule, InventoryModule],
  controllers: controllers,
  providers: [
    ...repositories,
    ...commandHandlers,
    ...queryHandlers,
    CloudflareCustomHostnameService,
    TenantFacade,
    { provide: TenantPublicApi, useExisting: TenantFacade },
  ],
  exports: [TenantPublicApi],
})
export class TenantModule {}
