import { DetachOfferPricingParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class DetachOfferPricingParamsDto extends createZodDto(DetachOfferPricingParamsSchema) {}
