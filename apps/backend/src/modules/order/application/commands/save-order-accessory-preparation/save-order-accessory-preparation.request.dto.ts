import { getOrderByIdParamSchema } from '@repo/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SaveOrderAccessoryPreparationAccessorySchema = z.object({
  accessoryRentalItemId: z.uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().nullable().optional(),
  assetIds: z.array(z.uuid()).optional(),
  autoAssignQuantity: z.number().int().nonnegative().optional(),
});

export const SaveOrderAccessoryPreparationSchema = z.object({
  items: z.array(
    z.object({
      orderItemId: z.uuid(),
      accessories: z.array(SaveOrderAccessoryPreparationAccessorySchema),
    }),
  ),
});

export class SaveOrderAccessoryPreparationRequestDto extends createZodDto(SaveOrderAccessoryPreparationSchema) {}

export class SaveOrderAccessoryPreparationParamDto extends createZodDto(getOrderByIdParamSchema) {}
