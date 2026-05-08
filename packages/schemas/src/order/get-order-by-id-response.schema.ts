import {
  FulfillmentMethod,
  OrderItemType,
  OrderStatus,
  PricingAdjustmentSourceKind,
  PromotionAdjustmentType,
} from "@repo/types";
import { z } from "zod";
import { minutesFromMidnightSchema } from "../shared/rental-temporal.schema";

const CustomerSummarySchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  isCompany: z.boolean(),
  companyName: z.string().nullable(),
});

const LocationSummarySchema = z.object({
  name: z.string(),
  effectiveTimezone: z.string(),
});

const RentalPeriodSchema = z.object({
  start: z.date(),
  end: z.date(),
});

const BookingSnapshotSchema = z.object({
  pickupDate: z.iso.date(),
  pickupTime: minutesFromMidnightSchema,
  returnDate: z.iso.date(),
  returnTime: minutesFromMidnightSchema,
  timezone: z.string(),
});

const DeliveryRequestSchema = z.object({
  recipientName: z.string(),
  phone: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  city: z.string(),
  stateRegion: z.string(),
  postalCode: z.string(),
  country: z.string(),
  instructions: z.string().nullable(),
});

const AssetSummarySchema = z.object({
  id: z.uuid(),
  serialNumber: z.string().nullable(),
  productTypeId: z.string(),
  ownerId: z.string().nullable(),
  ownerName: z.string().nullable(),
});

const OrderItemAccessorySchema = z.object({
  id: z.uuid(),
  accessoryRentalItemId: z.uuid(),
  name: z.string(),
  quantity: z.number().int().positive(),
  notes: z.string().nullable(),
  assignedAssets: z.array(AssetSummarySchema),
});

const ProductTypeItemSchema = z.object({
  id: z.uuid(),
  type: z.literal(OrderItemType.PRODUCT),
  productTypeId: z.uuid(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  assets: z.array(AssetSummarySchema),
  accessories: z.array(OrderItemAccessorySchema),
});

const BundleComponentSnapshotSchema = z.object({
  productTypeId: z.uuid(),
  productTypeName: z.string(),
  quantity: z.number().int(),
});

const BundleItemSchema = z.object({
  id: z.uuid(),
  type: z.literal(OrderItemType.BUNDLE),
  bundleId: z.uuid(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  components: z.array(BundleComponentSnapshotSchema),
  assets: z.array(AssetSummarySchema),
});

const OrderItemDetailSchema = z.discriminatedUnion("type", [
  ProductTypeItemSchema,
  BundleItemSchema,
]);

const DiscountLineSchema = z.object({
  sourceKind: z.enum(PricingAdjustmentSourceKind),
  sourceId: z.string(),
  label: z.string(),
  promotionId: z.string().nullable(),
  promotionLabel: z.string().nullable(),
  type: z.enum(PromotionAdjustmentType),
  value: z.number(),
  discountAmount: z.string(),
});

export type DiscountLine = z.infer<typeof DiscountLineSchema>;

const OwnerSplitLineSchema = z
  .object({
    ownerName: z.string(),
    ownerAmount: z.string(),
    rentalAmount: z.string(),
    componentName: z.string().nullable(),
  })
  .nullable();

const CalculatedPricingSchema = z.object({
  basePrice: z.string(),
  finalPrice: z.string(),
  pricePerBillingUnit: z.string(),
  discounts: z.array(DiscountLineSchema),
});

const EffectivePricingSnapshotSchema = z.object({
  finalPrice: z.string(),
  pricePerBillingUnit: z.string(),
  discounts: z.array(DiscountLineSchema),
});

const ManualPricingAdjustmentSchema = z.object({
  adjustmentAmount: z.string(),
});

const ManualPricingOverrideSchema = z.object({
  finalPrice: z.string(),
  setByUserId: z.string().nullable(),
  setAt: z.date().nullable(),
  previousFinalPrice: z.string().nullable(),
});

const PricingDetailsSchema = z.object({
  isOverridden: z.boolean(),
  effective: EffectivePricingSnapshotSchema,
  calculated: CalculatedPricingSchema,
  manualOverride: ManualPricingOverrideSchema.nullable(),
  manualAdjustment: ManualPricingAdjustmentSchema.nullable(),
});

const FinancialLineSchema = z.object({
  orderItemId: z.uuid(),
  label: z.string(),
  currency: z.string(),
  basePrice: z.string(),
  finalPrice: z.string(),
  discounts: z.array(DiscountLineSchema),
  pricing: PricingDetailsSchema,
  ownerSplit: OwnerSplitLineSchema,
});

const FinancialBreakdownSchema = z.object({
  items: z.array(FinancialLineSchema),
  itemsSubtotal: z.string(),
  subtotalBeforeDiscounts: z.string(),
  itemsDiscountTotal: z.string(),
  insuranceApplied: z.boolean(),
  insuranceAmount: z.string(),
  total: z.string(),
  yourRevenue: z.string(),
  ownerObligations: z.string(),
});

const OrderSigningStatusSchema = z.enum(["NO_REQUEST", "PENDING", "SIGNED", "EXPIRED", "VOIDED"]);

const OrderSigningSummarySchema = z.object({
  status: OrderSigningStatusSchema,
  documentType: z.enum(["RENTAL_AGREEMENT"]).nullable(),
  recipientEmail: z.string().nullable(),
  createdAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  signedAt: z.date().nullable(),
});

export const orderDetailSchema = z.object({
  id: z.uuid(),
  status: z.enum(OrderStatus),
  fulfillmentMethod: z.enum(FulfillmentMethod),
  number: z.number().int(),
  createdAt: z.date(),
  bookingSnapshot: BookingSnapshotSchema,
  pickupAt: z.date(),
  returnAt: z.date(),
  notes: z.string().nullable(),
  customer: CustomerSummarySchema.nullable(),
  location: LocationSummarySchema,
  deliveryRequest: DeliveryRequestSchema.nullable(),
  period: RentalPeriodSchema,
  items: z.array(OrderItemDetailSchema),
  financial: FinancialBreakdownSchema,
  signing: OrderSigningSummarySchema,
});

export type OrderDetailResponseDto = z.infer<typeof orderDetailSchema>;

export const getOrderByIdParamSchema = z.object({
  orderId: z.uuid(),
});

export type GetOrderByIdParamDto = z.infer<typeof getOrderByIdParamSchema>;
