import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { rentalRemitoApplicationError, RentalRemitoApplicationError } from './rental-remito-application.error';
import { RentalRemitoSourceReadModel } from './rental-remito-source-read-model';

@Injectable()
export class RentalRemitoReadModelLoader {
  constructor(private readonly prisma: PrismaService) {}

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
        tenantId: true,
        branchId: true,
        customerId: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        priceSnapshot: true,
        bookingSnapshot: true,
        insuranceSelected: true,
        confirmedAt: true,
        demandLines: {
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
        accessorySelections: {
          select: {
            id: true,
            sourceRentalDemandLineId: true,
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

    const [tenant, branch, customer, contractSigner] = await Promise.all([
      this.loadTenant(tenantId),
      this.loadBranch(tenantId, rental.branchId),
      rental.customerId ? this.loadCustomer(tenantId, rental.customerId) : Promise.resolve(null),
      this.loadDefaultContractSigner(tenantId),
    ]);

    if (!tenant) {
      return err(
        rentalRemitoApplicationError(
          'Unexpected',
          `Tenant "${tenantId}" was not found while loading rental remito read model.`,
        ),
      );
    }

    if (!branch) {
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
        tenantId: rental.tenantId,
        branchId: rental.branchId,
        customerId: rental.customerId,
        status: rental.status,
        periodStart: rental.periodStart,
        periodEnd: rental.periodEnd,
        priceSnapshot: rental.priceSnapshot,
        bookingSnapshot: rental.bookingSnapshot,
        insuranceSelected: rental.insuranceSelected,
        confirmedAt: rental.confirmedAt,
      },
      tenant,
      branch,
      customer,
      contractSigner,
      equipmentLines: rental.demandLines.map((line) => ({
        id: line.id,
        name: line.equipmentTypeNameSnapshot,
        quantity: line.quantity,
      })),
      accessoryLines: rental.accessorySelections.map((selection) => ({
        id: selection.id,
        sourceRentalDemandLineId: selection.sourceRentalDemandLineId,
        name: selection.equipmentTypeNameSnapshot,
        quantity: selection.quantity,
      })),
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

  private async loadBranch(tenantId: string, branchId: string): Promise<RentalRemitoSourceReadModel['branch'] | null> {
    // TODO(v2-contract-boundaries): Replace this cross-context Prisma read with a public read API/facade.
    const branch = await this.prisma.client.v2Branch.findFirst({
      where: {
        id: branchId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        timezone: true,
      },
    });

    if (!branch) {
      return null;
    }

    return {
      id: branch.id,
      name: branch.name,
      timezone: branch.timezone,
    };
  }

  private async loadCustomer(
    tenantId: string,
    customerId: string,
  ): Promise<RentalRemitoSourceReadModel['customer'] | null> {
    // TODO(v2-contract-boundaries): Replace this cross-context Prisma read with a public read API/facade.
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: {
        id: customerId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isCompany: true,
        companyName: true,
        profile: {
          select: {
            fullName: true,
            phone: true,
            documentNumber: true,
            address: true,
            businessName: true,
          },
        },
      },
    });

    if (!customer) {
      return null;
    }

    const displayName = this.resolveCustomerDisplayName(customer);

    return {
      id: customer.id,
      email: customer.email,
      displayName,
      phone: customer.profile?.phone ?? customer.phone,
      documentNumber: customer.profile?.documentNumber ?? null,
      address: customer.profile?.address ?? null,
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

  private resolveCustomerDisplayName(customer: {
    firstName: string;
    lastName: string;
    isCompany: boolean;
    companyName: string | null;
    profile: {
      fullName: string;
      businessName: string | null;
    } | null;
  }): string {
    if (customer.isCompany) {
      return (
        customer.profile?.businessName ??
        customer.companyName ??
        customer.profile?.fullName ??
        `${customer.firstName} ${customer.lastName}`.trim()
      );
    }

    return customer.profile?.fullName ?? `${customer.firstName} ${customer.lastName}`.trim();
  }
}
