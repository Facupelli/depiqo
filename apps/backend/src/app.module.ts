import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from './core/database/database.module';
import { AppConfigModule } from './config/config.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantInterceptor } from './modules/shared/tenant/tenant.interceptor';
import { LoggerModule } from './core/logger/logger.module';
import { CqrsModule } from '@nestjs/cqrs';
import { SharedModule } from './modules/shared/shared.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ObjectStorageModule } from './modules/object-storage/object-storage.module';
import { HealthController } from './health/health.controller';
import { IntegrationEventsModule } from './core/domain/events/integration-events.module';
import { TenantManagementModule } from './modules/tenant-management/tenant-management.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OfferingSetupModule } from './modules/offering-setup/offering-setup.module';
import { AssetInventoryModule } from './modules/asset-inventory/asset-inventory.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { RentalCommitmentModule } from './modules/rental-commitment/rental-commitment.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { DocumentSigningModule } from './modules/document-signing/document-signing.module';

@Module({
  imports: [
    SharedModule,
    LoggerModule,
    AppConfigModule,
    DatabaseModule,
    EventEmitterModule.forRoot(),
    IntegrationEventsModule,
    CqrsModule.forRoot(),
    NotificationsModule,
    ObjectStorageModule,
    TenantManagementModule,
    CatalogModule,
    OfferingSetupModule,
    AssetInventoryModule,
    PricingModule,
    RentalCommitmentModule,
    ContractsModule,
    DocumentSigningModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
  controllers: [HealthController],
})
export class AppModule {}
