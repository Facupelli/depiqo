import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';
import { AcceptedRentalPricingFacts } from 'src/modules/rental-commitment/public-api/accepted-rental-pricing-facts.public-api';
import { CommittedRentalSelectionsAndDemand } from 'src/modules/rental-commitment/public-api/committed-rental-selections-and-demand.public-api';
import { RentalPhysicalAssignments } from 'src/modules/rental-commitment/public-api/rental-physical-assignments.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { RentalCustomerContactFacts } from 'src/modules/tenant-management/public-api/rental-customer-contact-facts.public-api';
import { RetainedRentalCustomerProfileFacts } from 'src/modules/tenant-management/public-api/retained-rental-customer-profile-facts.public-api';

import { rentalRemitoApplicationError, RentalRemitoApplicationError } from './rental-remito-application.error';
import { RentalRemitoSourceReadModel } from './rental-remito-source-read-model';

@Injectable()
export class RentalRemitoReadModelLoader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetInventoryDisplayFacts: AssetInventoryDisplayFacts,
    private readonly acceptedRentalPricingFacts: AcceptedRentalPricingFacts,
    private readonly committedRentalSelectionsAndDemand: CommittedRentalSelectionsAndDemand,
    private readonly rentalPhysicalAssignments: RentalPhysicalAssignments,
    private readonly branchFacts: BranchFacts,
    private readonly retainedRentalCustomerProfileFacts: RetainedRentalCustomerProfileFacts,
    private readonly rentalCustomerContactFacts: RentalCustomerContactFacts,
  ) {}

  async load(
    tenantId: string,
    rentalId: string,
  ): Promise<Result<RentalRemitoSourceReadModel, RentalRemitoApplicationError>> {
    // TODO(v2-contract-boundaries): Replace this cross-context Prisma read with a public read API/facade.
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: rentalId,
        tenantId,
      },
      select: {
        id: true,
        rentalNumber: true,
        tenantId: true,
        branchId: true,
        customerId: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        insuranceSelected: true,
        confirmedAt: true,
        accessorySelections: {
          select: {
            id: true,
            equipmentTypeNameSnapshot: true,
            quantity: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!rental) {
      return err(
        rentalRemitoApplicationError('RentalNotFound', `Rental "${rentalId}" was not found for tenant "${tenantId}".`),
      );
    }

    const [tenant, branchContext, customer, contractSigner, acceptedPricing, selectionsAndDemand, physicalAssignments] =
      await Promise.all([
        this.loadTenant(tenantId),
        this.branchFacts.getBranchFacts({ tenantId, branchId: rental.branchId }),
        rental.customerId ? this.loadCustomer(tenantId, rental.customerId) : Promise.resolve(null),
        this.loadDefaultContractSigner(tenantId),
        this.acceptedRentalPricingFacts.getAcceptedRentalPricingFacts({ tenantId, rentalId }),
        this.committedRentalSelectionsAndDemand.getCommittedRentalSelectionsAndDemand({ tenantId, rentalId }),
        this.rentalPhysicalAssignments.getRentalPhysicalAssignments({ tenantId, rentalId }),
      ]);

    if (!tenant) {
      return err(
        rentalRemitoApplicationError(
          'Unexpected',
          `Tenant "${tenantId}" was not found while loading rental remito read model.`,
        ),
      );
    }

    if (acceptedPricing.isErr()) {
      if (acceptedPricing.error.code === 'RentalNotFound') {
        return err(
          rentalRemitoApplicationError('RentalNotFound', acceptedPricing.error.message, acceptedPricing.error),
        );
      }

      return err(
        rentalRemitoApplicationError('PriceSnapshotInvalid', acceptedPricing.error.message, acceptedPricing.error),
      );
    }

    if (selectionsAndDemand.isErr()) {
      return err(
        rentalRemitoApplicationError('RentalNotFound', selectionsAndDemand.error.message, selectionsAndDemand.error),
      );
    }

    if (physicalAssignments.isErr()) {
      return err(
        rentalRemitoApplicationError('RentalNotFound', physicalAssignments.error.message, physicalAssignments.error),
      );
    }

    const assignedAssetIdsByDemandLineId = new Map(
      physicalAssignments.value.demandAssignments.map((assignment) => [
        assignment.demandLineId,
        assignment.assignedAssetIds,
      ]),
    );
    const assignedAssetIdsByAccessorySelectionId = new Map(
      physicalAssignments.value.accessoryAssignments.map((assignment) => [
        assignment.accessorySelectionId,
        assignment.assignedAssetIds,
      ]),
    );
    const assetDisplayFacts = await this.assetInventoryDisplayFacts.getAssetDisplayFacts({
      tenantId,
      assetIds: [
        ...new Set([
          ...physicalAssignments.value.demandAssignments.flatMap((assignment) => assignment.assignedAssetIds),
          ...physicalAssignments.value.accessoryAssignments.flatMap((assignment) => assignment.assignedAssetIds),
        ]),
      ],
    });
    const serialNumberByAssetId = new Map(assetDisplayFacts.map((asset) => [asset.assetId, asset.serialNumber]));

    if (branchContext.isErr()) {
      return err(
        rentalRemitoApplicationError('BranchContextMissing', branchContext.error.message, branchContext.error),
      );
    }

    if (branchContext.value.isDeleted) {
      return err(
        rentalRemitoApplicationError(
          'BranchContextMissing',
          `Branch "${rental.branchId}" was not found while loading rental "${rental.id}".`,
        ),
      );
    }

    return ok({
      rental: {
        id: rental.id,
        rentalNumber: rental.rentalNumber,
        tenantId: rental.tenantId,
        branchId: rental.branchId,
        customerId: rental.customerId,
        status: rental.status,
        periodStart: rental.periodStart,
        periodEnd: rental.periodEnd,
        acceptedPricing: acceptedPricing.value,
        insuranceSelected: rental.insuranceSelected,
        confirmedAt: rental.confirmedAt,
      },
      tenant,
      branch: {
        id: branchContext.value.branchId,
        name: branchContext.value.displayName,
        timezone: branchContext.value.effectiveTimezone,
      },
      customer,
      contractSigner,
      equipmentLines: selectionsAndDemand.value.demandLines.map((line) => {
        const assignedAssetIds = assignedAssetIdsByDemandLineId.get(line.demandLineId) ?? [];

        return {
          id: line.demandLineId,
          name: line.equipmentTypeNameSnapshot,
          quantity: line.quantity,
          serialNumbers: assignedAssetIds
            .map((assetId) => serialNumberByAssetId.get(assetId)?.trim())
            .filter((serialNumber): serialNumber is string => Boolean(serialNumber)),
        };
      }),
      accessoryLines: rental.accessorySelections.map((selection) => {
        const assignedAssetIds = assignedAssetIdsByAccessorySelectionId.get(selection.id) ?? [];

        return {
          id: selection.id,
          name: selection.equipmentTypeNameSnapshot,
          quantity: selection.quantity,
          serialNumbers: assignedAssetIds
            .map((assetId) => serialNumberByAssetId.get(assetId)?.trim())
            .filter((serialNumber): serialNumber is string => Boolean(serialNumber)),
        };
      }),
    });
  }

  private async loadTenant(tenantId: string): Promise<RentalRemitoSourceReadModel['tenant'] | null> {
    // TODO(v2-contract-boundaries): Replace this cross-context Prisma read with a public read API/facade.
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: {
        id: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        config: true,
        branding: {
          select: {
            logoUrl: true,
          },
        },
      },
    });

    if (!tenant) {
      return null;
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      config: tenant.config,
      branding: tenant.branding
        ? {
            logoUrl: tenant.branding.logoUrl,
          }
        : null,
    };
  }

  private async loadCustomer(
    tenantId: string,
    customerId: string,
  ): Promise<RentalRemitoSourceReadModel['customer'] | null> {
    const [profile, contact] = await Promise.all([
      this.retainedRentalCustomerProfileFacts.getRetainedRentalCustomerProfileFacts({
        tenantId,
        rentalCustomerId: customerId,
      }),
      this.rentalCustomerContactFacts.getRentalCustomerContactFacts({
        tenantId,
        rentalCustomerId: customerId,
      }),
    ]);

    if (!profile || !contact) {
      return null;
    }

    return {
      id: profile.rentalCustomerId,
      email: contact.email,
      displayName: profile.fullName,
      phone: profile.phone ?? contact.phone,
      documentNumber: profile.documentNumber,
      address: profile.address,
    };
  }

  private async loadDefaultContractSigner(
    tenantId: string,
  ): Promise<RentalRemitoSourceReadModel['contractSigner'] | null> {
    // TODO(v2-contract-boundaries): Replace this cross-context Prisma read with a public read API/facade.
    const signer = await this.prisma.client.v2TenantContractSigner.findFirst({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        fullName: true,
        documentNumber: true,
        phone: true,
        address: true,
        signatureUrl: true,
      },
      orderBy: [
        {
          isDefault: 'desc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    if (!signer) {
      return null;
    }

    return {
      fullName: signer.fullName,
      documentNumber: signer.documentNumber,
      phone: signer.phone,
      address: signer.address,
      signatureUrl: signer.signatureUrl,
    };
  }
}
