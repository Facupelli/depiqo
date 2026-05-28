import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './core/database/database.module';
import { AppConfigModule } from './config/config.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantInterceptor } from './modules/shared/tenant/tenant.interceptor';
import { LoggerModule } from './core/logger/logger.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { CustomerModule } from './modules/customer/customer.module';
import { OrderModule } from './modules/order/order.module';
import { CqrsModule } from '@nestjs/cqrs';
import { BillingUnitModule } from './modules/billing-unit/billing-unit.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { InternalModule } from './modules/internal/internal.module';
import { SharedModule } from './modules/shared/shared.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ObjectStorageModule } from './modules/object-storage/object-storage.module';
import { DocumentSigningModule } from './modules/document-signing/document-signing.module';
import { HealthController } from './health/health.controller';
import { DomainEventsModule } from './core/domain/events/domain-events.module';
import { V2TenantManagementModule } from './modules/v2/tenant-management/tenant-management.module';
import { V2CatalogModule } from './modules/v2/catalog/catalog.module';
import { V2OfferingSetupModule } from './modules/v2/offering-setup/offering-setup.module';
import { V2AssetInventoryModule } from './modules/v2/asset-inventory/asset-inventory.module';
import { V2PricingModule } from './modules/v2/pricing/pricing.module';
import { V2RentalCommitmentModule } from './modules/v2/rental-commitment/rental-commitment.module';
import { V2ContractsModule } from './modules/v2/contracts/contracts.module';
import { V2DocumentSigningModule } from './modules/v2/document-signing/document-signing.module';

@Module({
  imports: [
    SharedModule,
    LoggerModule,
    AppConfigModule,
    DatabaseModule,
    EventEmitterModule.forRoot(),
    DomainEventsModule,
    CqrsModule.forRoot(),
    InternalModule,
    TenantModule,
    NotificationsModule,
    ObjectStorageModule,
    DocumentSigningModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    InventoryModule,
    CustomerModule,
    OrderModule,
    BillingUnitModule,
    PricingModule,
    // V2
    V2TenantManagementModule,
    V2CatalogModule,
    V2OfferingSetupModule,
    V2AssetInventoryModule,
    V2PricingModule,
    V2RentalCommitmentModule,
    V2ContractsModule,
    V2DocumentSigningModule,
  ],
  providers: [
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: ActorTypeGuard,
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: PermissionsGuard,
    // },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
  controllers: [HealthController],
})
export class AppModule {}
