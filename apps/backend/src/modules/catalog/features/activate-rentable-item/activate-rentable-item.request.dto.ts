import { ActivateRentableItemParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ActivateRentableItemRequestDto extends createZodDto(ActivateRentableItemParamsSchema) {}
