import { CreateRentalOfferWithPricingResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateRentalOfferWithPricingResponseDto extends createZodDto(CreateRentalOfferWithPricingResponseSchema) {}
