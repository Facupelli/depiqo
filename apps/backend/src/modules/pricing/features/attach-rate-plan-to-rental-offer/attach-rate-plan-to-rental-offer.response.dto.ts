import { AttachRatePlanToRentalOfferResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class AttachRatePlanToRentalOfferResponseDto extends createZodDto(AttachRatePlanToRentalOfferResponseSchema) {}
