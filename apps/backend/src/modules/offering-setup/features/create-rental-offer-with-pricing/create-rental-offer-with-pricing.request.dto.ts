import { CreateRentalOfferWithPricingBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateRentalOfferWithPricingRequestDto extends createZodDto(CreateRentalOfferWithPricingBodySchema) {}
