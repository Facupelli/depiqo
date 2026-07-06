import { GetRentalDetailParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalDetailParamsDto extends createZodDto(GetRentalDetailParamsSchema) {}
