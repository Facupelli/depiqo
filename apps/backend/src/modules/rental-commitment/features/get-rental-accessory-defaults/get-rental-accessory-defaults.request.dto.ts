import { GetRentalAccessoryDefaultsParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalAccessoryDefaultsParamsDto extends createZodDto(GetRentalAccessoryDefaultsParamsSchema) {}
