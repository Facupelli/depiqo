import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const rejectOrderRequestSchema = z.object({
  orderId: z.uuid(),
  rejectionReason: z.string().trim().min(1).max(1000).nullable().optional(),
});

export class RejectOrderRequestDto extends createZodDto(rejectOrderRequestSchema) {}
