import { CreatePricingForRentalOfferResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreatePricingForRentalOfferResponseDto extends createZodDto(CreatePricingForRentalOfferResponseSchema) {}
