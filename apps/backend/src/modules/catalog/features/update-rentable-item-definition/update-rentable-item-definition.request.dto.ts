import {
  UpdateRentableItemDefinitionBodySchema,
  UpdateRentableItemDefinitionParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateRentableItemDefinitionParamsDto extends createZodDto(UpdateRentableItemDefinitionParamsSchema) {}
export class UpdateRentableItemDefinitionBodyDto extends createZodDto(UpdateRentableItemDefinitionBodySchema) {}
