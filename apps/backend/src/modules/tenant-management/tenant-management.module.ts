import { Module } from '@nestjs/common';

import { TenantManagementPublicApiService } from './public-api/tenant-management-public-api.service';
import { AuthModule } from './auth/auth.module';
import { ApproveSubmittedCustomerOnboardingHttpController } from './features/approve-submitted-customer-onboarding/approve-submitted-customer-onboarding.controller';
import { ApproveSubmittedCustomerOnboardingHandler } from './features/approve-submitted-customer-onboarding/approve-submitted-customer-onboarding.handler';
import { CreateContractSignerHttpController } from './features/create-contract-signer/create-contract-signer.controller';
import { CreateContractSignerHandler } from './features/create-contract-signer/create-contract-signer.handler';
import { CreateBranchHttpController } from './features/create-branch/create-branch.controller';
import { CreateBranchHandler } from './features/create-branch/create-branch.handler';
import { GetBranchDetailHttpController } from './features/get-branch-detail/get-branch-detail.controller';
import { GetBranchDetailHandler } from './features/get-branch-detail/get-branch-detail.handler';
import { GetCustomerProfileDetailHttpController } from './features/get-customer-profile-detail/get-customer-profile-detail.controller';
import { GetCustomerProfileDetailHandler } from './features/get-customer-profile-detail/get-customer-profile-detail.handler';
import { GetBranchesHttpController } from './features/get-branches/get-branches.controller';
import { GetBranchesHandler } from './features/get-branches/get-branches.handler';
import { GetStorefrontBranchScheduleSlotsHttpController } from './features/get-storefront-branch-schedule-slots/get-storefront-branch-schedule-slots.controller';
import { GetStorefrontBranchScheduleSlotsHandler } from './features/get-storefront-branch-schedule-slots/get-storefront-branch-schedule-slots.handler';
import { GetStorefrontBranchSchedulesHttpController } from './features/get-storefront-branch-schedules/get-storefront-branch-schedules.controller';
import { GetStorefrontBranchSchedulesHandler } from './features/get-storefront-branch-schedules/get-storefront-branch-schedules.handler';
import { GetContractSignerHttpController } from './features/get-contract-signer/get-contract-signer.controller';
import { GetContractSignerHandler } from './features/get-contract-signer/get-contract-signer.handler';
import { GetCurrentTenantHttpController } from './features/get-current-tenant/get-current-tenant.controller';
import { GetCurrentTenantHandler } from './features/get-current-tenant/get-current-tenant.handler';
import { GetCustomDomainHttpController } from './features/get-custom-domain/get-custom-domain.controller';
import { GetCustomDomainHandler } from './features/get-custom-domain/get-custom-domain.handler';
import { GetPublicTenantConfigHttpController } from './features/get-public-tenant-config/get-public-tenant-config.controller';
import { GetPublicTenantConfigHandler } from './features/get-public-tenant-config/get-public-tenant-config.handler';
import { GetCustomerSummaryHttpController } from './features/get-customer-summary/get-customer-summary.controller';
import { GetCustomerSummaryHandler } from './features/get-customer-summary/get-customer-summary.handler';
import { GetRentalCustomersHttpController } from './features/get-rental-customers/get-rental-customers.controller';
import { GetRentalCustomersHandler } from './features/get-rental-customers/get-rental-customers.handler';
import { GetCurrentRentalCustomerProfileHttpController } from './customer/features/get-current-rental-customer-profile/get-current-rental-customer-profile.controller';
import { GetCurrentRentalCustomerProfileHandler } from './customer/features/get-current-rental-customer-profile/get-current-rental-customer-profile.handler';
import { SubmitCustomerProfileHttpController } from './customer/features/submit-customer-profile/submit-customer-profile.controller';
import { SubmitCustomerProfileHandler } from './customer/features/submit-customer-profile/submit-customer-profile.handler';
import { RegisterTenantWithOwnerController } from './features/register-tenant-with-owner/register-tenant-with-owner.controller';
import { RegisterTenantWithOwnerService } from './features/register-tenant-with-owner/register-tenant-with-owner.service';
import { RegisterCustomDomainHttpController } from './features/register-custom-domain/register-custom-domain.controller';
import { RegisterCustomDomainHandler } from './features/register-custom-domain/register-custom-domain.handler';
import { RefreshCustomDomainStatusHttpController } from './features/refresh-custom-domain-status/refresh-custom-domain-status.controller';
import { RefreshCustomDomainStatusHandler } from './features/refresh-custom-domain-status/refresh-custom-domain-status.handler';
import { RejectSubmittedCustomerOnboardingHttpController } from './features/reject-submitted-customer-onboarding/reject-submitted-customer-onboarding.controller';
import { RejectSubmittedCustomerOnboardingHandler } from './features/reject-submitted-customer-onboarding/reject-submitted-customer-onboarding.handler';
import { UpdateBranchHttpController } from './features/update-branch/update-branch.controller';
import { UpdateContractSignerHttpController } from './features/update-contract-signer/update-contract-signer.controller';
import { UpdateContractSignerHandler } from './features/update-contract-signer/update-contract-signer.handler';
import { UpdateBranchHandler } from './features/update-branch/update-branch.handler';
import { UpdateTenantBrandingHttpController } from './features/update-tenant-branding/update-tenant-branding.controller';
import { UpdateTenantBrandingHandler } from './features/update-tenant-branding/update-tenant-branding.handler';
import { UpdateTenantConfigHttpController } from './features/update-tenant-config/update-tenant-config.controller';
import { UpdateTenantConfigHandler } from './features/update-tenant-config/update-tenant-config.handler';
import { BranchRepository } from './infrastructure/persistence/repositories/branch.repository';
import { TenantRepository } from './infrastructure/persistence/repositories/tenant.repository';
import { TenantManagementPublicApi } from './public-api/tenant-management.public-api';
import { TenantContextModule } from './tenant-context/tenant-context.module';
import { CloudflareCustomHostnameService } from './infrastructure/cloudflare-custom-hostname.service';

@Module({
  imports: [AuthModule, TenantContextModule],
  controllers: [
    ApproveSubmittedCustomerOnboardingHttpController,
    CreateBranchHttpController,
    CreateContractSignerHttpController,
    GetBranchDetailHttpController,
    GetBranchesHttpController,
    GetCurrentRentalCustomerProfileHttpController,
    GetCustomerProfileDetailHttpController,
    GetContractSignerHttpController,
    GetCurrentTenantHttpController,
    GetCustomDomainHttpController,
    GetPublicTenantConfigHttpController,
    GetCustomerSummaryHttpController,
    GetRentalCustomersHttpController,
    GetStorefrontBranchScheduleSlotsHttpController,
    GetStorefrontBranchSchedulesHttpController,
    RegisterCustomDomainHttpController,
    RegisterTenantWithOwnerController,
    RefreshCustomDomainStatusHttpController,
    RejectSubmittedCustomerOnboardingHttpController,
    SubmitCustomerProfileHttpController,
    UpdateBranchHttpController,
    UpdateContractSignerHttpController,
    UpdateTenantBrandingHttpController,
    UpdateTenantConfigHttpController,
  ],
  providers: [
    BranchRepository,
    TenantRepository,
    CloudflareCustomHostnameService,
    ApproveSubmittedCustomerOnboardingHandler,
    CreateBranchHandler,
    CreateContractSignerHandler,
    GetBranchDetailHandler,
    GetBranchesHandler,
    GetCurrentRentalCustomerProfileHandler,
    GetCustomerProfileDetailHandler,
    GetContractSignerHandler,
    GetCurrentTenantHandler,
    GetCustomDomainHandler,
    GetPublicTenantConfigHandler,
    GetCustomerSummaryHandler,
    GetRentalCustomersHandler,
    GetStorefrontBranchScheduleSlotsHandler,
    GetStorefrontBranchSchedulesHandler,
    RegisterCustomDomainHandler,
    RegisterTenantWithOwnerService,
    RefreshCustomDomainStatusHandler,
    RejectSubmittedCustomerOnboardingHandler,
    SubmitCustomerProfileHandler,
    UpdateBranchHandler,
    UpdateContractSignerHandler,
    UpdateTenantBrandingHandler,
    UpdateTenantConfigHandler,
    { provide: TenantManagementPublicApi, useClass: TenantManagementPublicApiService },
  ],
  exports: [TenantManagementPublicApi],
})
export class TenantManagementModule {}
