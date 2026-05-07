import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { tenantConfigSchema } from '@repo/schemas';
import { OrderItemType, OrderStatus } from '@repo/types';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  GetLocationContextQuery,
  LocationContextReadModel,
} from 'src/modules/tenant/public/queries/get-location-context.query';
import { GetTenantAdminSignerProfileQuery } from 'src/modules/users/public/queries/get-tenant-admin-signer-profile.query';
import {
  ContractCustomerProfileMissingError,
  OrderBudgetMustBeDraftError,
} from 'src/modules/order/domain/errors/contract.errors';
import { OrderSigningAllowedOnlyForConfirmedOrdersError } from 'src/modules/order/domain/errors/order.errors';
import { OrderNotFoundException } from 'src/modules/order/domain/exceptions/order.exceptions';
import { BookingSnapshot } from 'src/modules/order/domain/value-objects/booking-snapshot.value-object';
import { PriceSnapshot } from 'src/modules/order/domain/value-objects/price-snapshot.value-object';
import {
  ContractData,
  ContractPartyData,
  ContractRendererPort,
  EquipmentLine,
  IncludedItem,
  SignedContractSummary,
} from 'src/modules/order/domain/ports/contract-render.port';

export interface OrderDocumentCustomerInput {
  fullName?: string;
  documentNumber?: string;
  address?: string;
  phone?: string;
}

export interface RenderOrderDocumentInput {
  tenantId: string;
  orderId: string;
  documentLabel: string;
  fileNamePrefix: string;
  equipmentTitle: string;
  customerOverride?: OrderDocumentCustomerInput;
  requireLinkedCustomerDocumentNumber?: boolean;
  requireDraftOrder?: boolean;
  requireConfirmedOrder?: boolean;
  showRentalSignatureBlock?: boolean;
  signedSummary?: RenderSignedContractSummaryInput | SignedContractSummary;
}

export interface RenderSignedContractSummaryInput {
  signatureImageDataUrl: string;
  recipientEmail: string;
  signedAt: Date;
  sessionReference: string;
}

export interface RenderOrderDocumentResult {
  buffer: Buffer;
  customerId: string | null;
  customerEmail: string | null;
  documentNumber: string;
  fileName: string;
  downloadFileName: string;
}

type RenderOrderDocumentError =
  | ContractCustomerProfileMissingError
  | OrderBudgetMustBeDraftError
  | OrderSigningAllowedOnlyForConfirmedOrdersError;

type GroupableEquipmentLine = EquipmentLine & {
  groupKey: string;
};

const ORDER_ITEM_ACCESSORY_NORMALIZATION_STARTED_AT = new Date('2026-05-07T14:41:13.000Z');

@Injectable()
export class OrderDocumentRendererService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
    private readonly contractRenderer: ContractRendererPort,
  ) {}

  async renderContract(
    tenantId: string,
    orderId: string,
  ): Promise<
    Result<
      RenderOrderDocumentResult,
      ContractCustomerProfileMissingError | OrderSigningAllowedOnlyForConfirmedOrdersError
    >
  > {
    return this.render({
      tenantId,
      orderId,
      documentLabel: 'REMITO',
      fileNamePrefix: 'remito',
      equipmentTitle: 'LISTA DE EQUIPOS RETIRADOS',
      requireLinkedCustomerDocumentNumber: true,
      requireConfirmedOrder: true,
      showRentalSignatureBlock: true,
    }) as Promise<
      Result<
        RenderOrderDocumentResult,
        ContractCustomerProfileMissingError | OrderSigningAllowedOnlyForConfirmedOrdersError
      >
    >;
  }

  async renderSignedContract(
    tenantId: string,
    orderId: string,
    signedSummary: RenderSignedContractSummaryInput,
  ): Promise<Result<RenderOrderDocumentResult, ContractCustomerProfileMissingError>> {
    return this.render({
      tenantId,
      orderId,
      documentLabel: 'REMITO',
      fileNamePrefix: 'remito',
      equipmentTitle: 'LISTA DE EQUIPOS RETIRADOS',
      requireLinkedCustomerDocumentNumber: true,
      showRentalSignatureBlock: true,
      signedSummary,
    }) as Promise<Result<RenderOrderDocumentResult, ContractCustomerProfileMissingError>>;
  }

  async renderBudget(
    tenantId: string,
    orderId: string,
    customerOverride?: OrderDocumentCustomerInput,
  ): Promise<Result<RenderOrderDocumentResult, OrderBudgetMustBeDraftError>> {
    return this.render({
      tenantId,
      orderId,
      documentLabel: 'PRESUPUESTO',
      fileNamePrefix: 'presupuesto',
      equipmentTitle: 'LISTA DE EQUIPOS PRESUPUESTADOS',
      customerOverride,
      requireDraftOrder: true,
      showRentalSignatureBlock: false,
    }) as Promise<Result<RenderOrderDocumentResult, OrderBudgetMustBeDraftError>>;
  }

  private async render(
    input: RenderOrderDocumentInput,
  ): Promise<Result<RenderOrderDocumentResult, RenderOrderDocumentError>> {
    const order = await this.prisma.client.order.findFirst({
      where: { id: input.orderId, tenantId: input.tenantId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                documentNumber: true,
                phone: true,
                address: true,
              },
            },
          },
        },
        items: {
          include: {
            productType: {
              select: {
                name: true,
                includedItems: true,
              },
            },
            accessories: {
              select: {
                quantity: true,
                notes: true,
                accessoryRentalItem: {
                  select: { name: true },
                },
                assetAssignments: {
                  select: {
                    asset: {
                      select: { serialNumber: true },
                    },
                  },
                  orderBy: { createdAt: 'asc' },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
            bundleSnapshot: {
              include: {
                components: {
                  include: {
                    productType: {
                      select: {
                        name: true,
                        includedItems: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const tenant = await this.prisma.client.tenant.findUnique({
      where: { id: input.tenantId },
      select: {
        name: true,
        logoUrl: true,
        config: true,
      },
    });

    if (!order) {
      throw new OrderNotFoundException(input.orderId);
    }

    if (!tenant) {
      throw new Error(`Tenant "${input.tenantId}" was not found.`);
    }

    if (input.requireDraftOrder && order.status !== OrderStatus.DRAFT) {
      return err(new OrderBudgetMustBeDraftError(order.id, order.status as OrderStatus));
    }

    if (input.requireConfirmedOrder && order.status !== OrderStatus.CONFIRMED) {
      return err(new OrderSigningAllowedOnlyForConfirmedOrdersError(order.id, order.status as OrderStatus));
    }

    if (input.requireLinkedCustomerDocumentNumber && !order.customer?.profile?.documentNumber) {
      return err(new ContractCustomerProfileMissingError(order.customer?.id ?? input.orderId));
    }

    const signerProfile = await this.queryBus.execute(new GetTenantAdminSignerProfileQuery(input.tenantId));
    const locationContext = await this.queryBus.execute<GetLocationContextQuery, LocationContextReadModel | null>(
      new GetLocationContextQuery(input.tenantId, order.locationId),
    );

    if (!locationContext) {
      throw new Error(`Location context not found for location "${order.locationId}"`);
    }

    const bookingSnapshot = hasBookingSnapshot(order.bookingSnapshot)
      ? BookingSnapshot.fromJSON(order.bookingSnapshot)
      : buildLegacyBookingSnapshot(order.periodStart, order.periodEnd, locationContext.effectiveTimezone);

    const firstItem = order.items[0];
    const jornadas = firstItem ? PriceSnapshot.fromJSON(firstItem.priceSnapshot).totalUnits : 0;

    const tenantConfig = tenantConfigSchema.parse(tenant.config);
    const financialSnapshot = order.financialSnapshot as { total?: string };
    const agreedPrice = formatCurrency(
      Number(financialSnapshot.total ?? 0),
      tenantConfig.pricing.currency,
      tenantConfig.pricing.locale,
    );

    const equipmentLines = groupEquipmentLines(
      order.items.flatMap((item): GroupableEquipmentLine[] => {
        if (item.type === OrderItemType.PRODUCT && item.productType) {
          const selectedAccessories = mapSelectedAccessoriesToIncludedItems(item.accessories);

          return [
            {
              groupKey: item.id,
              name: item.productType.name,
              quantity: 1,
              includedItems:
                selectedAccessories.length > 0
                  ? selectedAccessories
                  : parseLegacyIncludedItemsForHistoricalOrder(order.createdAt, item.productType.includedItems),
            },
          ];
        }

        if (item.type === OrderItemType.BUNDLE && item.bundleSnapshot) {
          return item.bundleSnapshot.components.map((component) => ({
            groupKey: component.productTypeId,
            name: component.productType.name,
            quantity: component.quantity,
            includedItems: parseLegacyIncludedItemsForHistoricalOrder(
              order.createdAt,
              component.productType.includedItems,
            ),
          }));
        }

        return [];
      }),
    );

    const paddedOrderNumber = String(order.orderNumber).padStart(4, '0');
    const documentNumber = `${tenant.name}-${paddedOrderNumber}`;
    const tenantCustomer = toContractPartyData(order.customer);
    const resolvedCustomer = mergeContractPartyData(tenantCustomer, input.customerOverride);
    const downloadFileName = buildContractDownloadFileName(resolvedCustomer.fullName, paddedOrderNumber);

    const contractData: ContractData = {
      document: {
        label: input.documentLabel,
        number: documentNumber,
        equipmentTitle: input.equipmentTitle,
        pickupDate: formatLocalDateKey(bookingSnapshot.pickupDate),
        returnDate: formatLocalDateKey(bookingSnapshot.returnDate),
        jornadas,
        agreedPrice,
        logoUrl: tenant.logoUrl,
        rentalSignatureUrl: buildBrandingAssetUrl(signerProfile?.signUrl ?? null),
        showRentalSignatureBlock: input.showRentalSignatureBlock ?? true,
        landlord: {
          fullName: signerProfile?.fullName ?? '',
          documentNumber: signerProfile?.documentNumber ?? '',
          address: signerProfile?.address ?? '',
          phone: signerProfile?.phone ?? '',
        },
        tenant: resolvedCustomer,
        signedSummary: input.signedSummary
          ? {
              signatureImageDataUrl: input.signedSummary.signatureImageDataUrl,
              recipientEmail: input.signedSummary.recipientEmail,
              signedAt:
                input.signedSummary.signedAt instanceof Date
                  ? formatSignedTimestamp(input.signedSummary.signedAt, locationContext.effectiveTimezone)
                  : input.signedSummary.signedAt,
              sessionReference: input.signedSummary.sessionReference,
            }
          : undefined,
      },
      equipmentLines,
    };

    const buffer = await this.contractRenderer.render(contractData);

    const fileName = `${input.fileNamePrefix}-${downloadFileName}${input.signedSummary ? '-signed' : ''}`;

    return ok({
      buffer,
      customerId: order.customerId,
      customerEmail: order.customer?.email ?? null,
      documentNumber,
      fileName,
      downloadFileName: fileName,
    });
  }
}

function hasBookingSnapshot(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    return false;
  }

  const data = raw as Record<string, unknown>;

  return (
    typeof data.pickupDate === 'string' &&
    typeof data.pickupTime === 'number' &&
    typeof data.returnDate === 'string' &&
    typeof data.returnTime === 'number' &&
    typeof data.timezone === 'string'
  );
}

function buildLegacyBookingSnapshot(periodStart: Date, periodEnd: Date, timezone: string): BookingSnapshot {
  return BookingSnapshot.reconstitute({
    pickupDate: toLocalDateKey(periodStart, timezone),
    pickupTime: toMinutesFromMidnight(periodStart, timezone),
    returnDate: toLocalDateKey(periodEnd, timezone),
    returnTime: toMinutesFromMidnight(periodEnd, timezone),
    timezone,
  });
}

function formatLocalDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return `${day}/${month}/${year}`;
}

function formatSignedTimestamp(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';

  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function toLocalDateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

function toMinutesFromMidnight(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');

  return get('hour') * 60 + get('minute');
}

function parseIncludedItems(value: unknown): IncludedItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Record<string, unknown>;

    if (
      typeof candidate.name !== 'string' ||
      typeof candidate.quantity !== 'number' ||
      (candidate.notes !== null && candidate.notes !== undefined && typeof candidate.notes !== 'string')
    ) {
      return [];
    }

    return [
      {
        name: candidate.name,
        quantity: candidate.quantity,
        notes: candidate.notes == null ? null : candidate.notes,
        assignedAssetCount: null,
        assignedAssetIdentifiers: [],
      },
    ];
  });
}

function parseLegacyIncludedItemsForHistoricalOrder(orderCreatedAt: Date, value: unknown): IncludedItem[] {
  return orderCreatedAt < ORDER_ITEM_ACCESSORY_NORMALIZATION_STARTED_AT ? parseIncludedItems(value) : [];
}

function mapSelectedAccessoriesToIncludedItems(
  accessories: Array<{
    quantity: number;
    notes: string | null;
    accessoryRentalItem: { name: string };
    assetAssignments: Array<{ asset: { serialNumber: string | null } }>;
  }>,
): IncludedItem[] {
  return accessories.map((accessory) => ({
    name: accessory.accessoryRentalItem.name,
    quantity: accessory.quantity,
    notes: accessory.notes,
    assignedAssetCount: accessory.assetAssignments.length,
    assignedAssetIdentifiers: accessory.assetAssignments.flatMap((assignment) =>
      assignment.asset.serialNumber ? [assignment.asset.serialNumber] : [],
    ),
  }));
}

function groupEquipmentLines(lines: GroupableEquipmentLine[]): EquipmentLine[] {
  const grouped = new Map<string, EquipmentLine>();

  for (const line of lines) {
    const existing = grouped.get(line.groupKey);

    if (existing) {
      existing.quantity += line.quantity;
      continue;
    }

    grouped.set(line.groupKey, {
      name: line.name,
      quantity: line.quantity,
      includedItems: line.includedItems,
    });
  }

  return Array.from(grouped.values());
}

function formatCurrency(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function toContractPartyData(
  customer: {
    firstName: string;
    lastName: string;
    profile: {
      documentNumber: string | null;
      address: string | null;
      phone: string | null;
    } | null;
  } | null,
): ContractPartyData {
  if (!customer) {
    return emptyPartyData();
  }

  return {
    fullName: `${customer.firstName} ${customer.lastName}`.trim(),
    documentNumber: customer.profile?.documentNumber ?? '',
    address: customer.profile?.address ?? '',
    phone: customer.profile?.phone ?? '',
  };
}

function mergeContractPartyData(base: ContractPartyData, override?: OrderDocumentCustomerInput): ContractPartyData {
  if (!override) {
    return base;
  }

  return {
    fullName: override.fullName ?? base.fullName,
    documentNumber: override.documentNumber ?? base.documentNumber,
    address: override.address ?? base.address,
    phone: override.phone ?? base.phone,
  };
}

function emptyPartyData(): ContractPartyData {
  return {
    fullName: '',
    documentNumber: '',
    address: '',
    phone: '',
  };
}

function buildContractDownloadFileName(customerFullName: string, paddedOrderNumber: string): string {
  const normalizedName = customerFullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalizedName.length > 0 ? `${normalizedName}-${paddedOrderNumber}` : paddedOrderNumber;
}

function buildBrandingAssetUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const brandingPublicUrl = process.env.VITE_BRANDING_R2_PUBLIC_URL;

  if (!brandingPublicUrl) {
    return null;
  }

  return `${brandingPublicUrl.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}
