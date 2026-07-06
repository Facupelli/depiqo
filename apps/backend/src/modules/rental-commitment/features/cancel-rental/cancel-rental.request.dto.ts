import { CancelRentalParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CancelRentalParamsDto extends createZodDto(CancelRentalParamsSchema) {}
