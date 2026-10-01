import { RestoreRentableItemParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RestoreRentableItemRequestDto extends createZodDto(RestoreRentableItemParamsSchema) {}
