import { GetRentalOffersPricingResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalOffersPricingResponseDto extends createZodDto(GetRentalOffersPricingResponseSchema) {}
