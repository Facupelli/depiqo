import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AccessoryPreparationAssetSchema = z.object({
  id: z.string().uuid(),
  serialNumber: z.string().nullable(),
  ownerId: z.string().uuid().nullable(),
  ownerName: z.string().nullable(),
});

const AccessoryPreparationSelectedLineSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().int(),
  notes: z.string().nullable(),
  assignedAssets: z.array(AccessoryPreparationAssetSchema),
});

const CompatibleAccessoryPreparationSchema = z.object({
  accessoryRentalItemId: z.string().uuid(),
  name: z.string(),
  isDefaultIncluded: z.boolean(),
  defaultQuantity: z.number().int(),
  defaultNotes: z.string().nullable(),
  selectedLine: AccessoryPreparationSelectedLineSchema.nullable(),
  suggestedQuantity: z.number().int().nullable(),
  suggestedNotes: z.string().nullable(),
  availableCount: z.number().int(),
});

const OrderItemAccessoryPreparationSchema = z.object({
  orderItemId: z.string().uuid(),
  productTypeId: z.string().uuid(),
  productTypeName: z.string(),
  assignedPrimaryAssets: z.array(AccessoryPreparationAssetSchema),
  compatibleAccessories: z.array(CompatibleAccessoryPreparationSchema),
});

export const GetOrderAccessoryPreparationResponseSchema = z.object({
  orderId: z.string().uuid(),
  locationId: z.string().uuid(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  items: z.array(OrderItemAccessoryPreparationSchema),
});

export class GetOrderAccessoryPreparationResponseDto extends createZodDto(
  GetOrderAccessoryPreparationResponseSchema,
) {}

export type GetOrderAccessoryPreparationResponse = z.infer<typeof GetOrderAccessoryPreparationResponseSchema>;
