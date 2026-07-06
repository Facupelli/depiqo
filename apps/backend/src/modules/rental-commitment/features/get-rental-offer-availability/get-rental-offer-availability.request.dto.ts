import { GetRentalOfferAvailabilityRequestSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalOfferAvailabilityRequestDto extends createZodDto(GetRentalOfferAvailabilityRequestSchema) {}
