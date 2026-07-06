import { AttachRatePlanToRentalOfferBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class AttachRatePlanToRentalOfferRequestDto extends createZodDto(AttachRatePlanToRentalOfferBodySchema) {}
