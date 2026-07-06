import { GetStorefrontRentalOffersQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetStorefrontRentalOffersRequestDto extends createZodDto(GetStorefrontRentalOffersQuerySchema) {}
