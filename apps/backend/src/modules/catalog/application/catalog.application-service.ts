import { Injectable } from '@nestjs/common';
import {
  BundleDto,
  BundleBookingEligibilityDto,
  BundleInactiveForBookingError,
  BundleNotBookableAtLocationError,
  BundleOrderMetaComponentDto,
  CatalogPublicApi,
  ProductTypeDto,
  ProductTypeBookingEligibilityDto,
  ProductTypeInactiveForBookingError,
  ProductTypeNotBookableAtLocationError,
} from '../catalog.public-api';
import { PrismaService } from 'src/core/database/prisma.service';
import { RentalItemKind, TrackingMode } from '@repo/types';

@Injectable()
export class CatalogApplicationService implements CatalogPublicApi {
  constructor(private readonly prisma: PrismaService) {}

  async getProductType(id: string): Promise<ProductTypeDto | null> {
    const row = await this.prisma.client.productType.findUnique({
      where: { id },
      select: { id: true, trackingMode: true, retiredAt: true, publishedAt: true },
    });

    if (!row) {
      return null;
    }

    return new ProductTypeDto(row.id, row.trackingMode as TrackingMode, row.retiredAt, row.publishedAt);
  }

  async getBundle(id: string): Promise<BundleDto | null> {
    const row = await this.prisma.client.bundle.findUnique({
      where: { id },
      select: { id: true, retiredAt: true, publishedAt: true },
    });

    if (!row) {
      return null;
    }

    return new BundleDto(row.id, row.retiredAt, row.publishedAt);
  }

  async getProductTypeBookingEligibility(
    tenantId: string,
    locationId: string,
    id: string,
  ): Promise<ProductTypeBookingEligibilityDto | null> {
    const row = await this.prisma.client.productType.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        categoryId: true,
        kind: true,
        retiredAt: true,
        publishedAt: true,
        pricingTiers: {
          where: { OR: [{ locationId }, { locationId: null }] },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!row || row.tenantId !== tenantId) {
      return null;
    }

    if (row.kind !== RentalItemKind.PRIMARY) {
      throw new ProductTypeInactiveForBookingError(id);
    }

    if (row.retiredAt !== null || row.publishedAt === null) {
      throw new ProductTypeInactiveForBookingError(id);
    }

    if (row.pricingTiers.length === 0) {
      throw new ProductTypeNotBookableAtLocationError(id, locationId);
    }

    return new ProductTypeBookingEligibilityDto(row.id, row.categoryId);
  }

  async getBundleBookingEligibility(
    tenantId: string,
    locationId: string,
    id: string,
  ): Promise<BundleBookingEligibilityDto | null> {
    const row = await this.prisma.client.bundle.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        retiredAt: true,
        publishedAt: true,
        pricingTiers: {
          where: { OR: [{ locationId }, { locationId: null }] },
          select: { id: true },
          take: 1,
        },
        components: {
          select: {
            quantity: true,
            productType: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!row || row.tenantId !== tenantId) {
      return null;
    }

    if (row.retiredAt !== null || row.publishedAt === null) {
      throw new BundleInactiveForBookingError(id);
    }

    if (row.pricingTiers.length === 0) {
      throw new BundleNotBookableAtLocationError(id, locationId);
    }

    return new BundleBookingEligibilityDto(
      row.id,
      row.name,
      row.components.map(
        (component) =>
          new BundleOrderMetaComponentDto(component.productType.id, component.productType.name, component.quantity),
      ),
    );
  }
}
