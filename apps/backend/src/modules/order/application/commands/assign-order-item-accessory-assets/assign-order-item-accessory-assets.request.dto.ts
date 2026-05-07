import { assignOrderItemAccessoryAssetsSchema, getOrderByIdParamSchema } from '@repo/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const assignOrderItemAccessoryAssetsParamSchema = getOrderByIdParamSchema.extend({
  orderItemId: z.uuid(),
  orderItemAccessoryId: z.uuid(),
});

export class AssignOrderItemAccessoryAssetsRequestDto extends createZodDto(assignOrderItemAccessoryAssetsSchema) {}

export class AssignOrderItemAccessoryAssetsParamDto extends createZodDto(assignOrderItemAccessoryAssetsParamSchema) {}
