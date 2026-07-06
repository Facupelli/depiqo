import { GetRentableItemDetailParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentableItemDetailRequestDto extends createZodDto(GetRentableItemDetailParamsSchema) {}
