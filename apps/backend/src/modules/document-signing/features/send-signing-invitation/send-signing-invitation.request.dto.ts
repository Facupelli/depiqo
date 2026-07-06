import { getOrderByIdParamSchema } from '@repo/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SendSigningInvitationBodySchema = z.object({
  recipientEmail: z.string().trim().email().optional(),
});

export class SendSigningInvitationBodyDto extends createZodDto(SendSigningInvitationBodySchema) {}

export class SendSigningInvitationParamDto extends createZodDto(getOrderByIdParamSchema) {}
