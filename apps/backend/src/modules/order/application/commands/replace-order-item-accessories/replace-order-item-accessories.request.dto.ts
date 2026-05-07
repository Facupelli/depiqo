import { getOrderByIdParamSchema, replaceOrderItemAccessoriesSchema } from '@repo/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const replaceOrderItemAccessoriesParamSchema = getOrderByIdParamSchema.extend({
  orderItemId: z.uuid(),
});

export class ReplaceOrderItemAccessoriesRequestDto extends createZodDto(replaceOrderItemAccessoriesSchema) {}

export class ReplaceOrderItemAccessoriesParamDto extends createZodDto(replaceOrderItemAccessoriesParamSchema) {}
