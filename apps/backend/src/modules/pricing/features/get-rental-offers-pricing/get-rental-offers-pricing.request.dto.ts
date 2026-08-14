import { GetRentalOffersPricingQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalOffersPricingRequestDto extends createZodDto(GetRentalOffersPricingQuerySchema) {}
