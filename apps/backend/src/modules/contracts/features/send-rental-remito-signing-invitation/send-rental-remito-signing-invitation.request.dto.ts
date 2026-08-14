import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendRentalRemitoSigningInvitationParamSchema = z.object({
  orderId: z.string().uuid(),
});

export const SendRentalRemitoSigningInvitationBodySchema = z.object({
  recipientEmail: z.string().trim().email().optional(),
});

export class SendRentalRemitoSigningInvitationBodyDto extends createZodDto(
  SendRentalRemitoSigningInvitationBodySchema,
) {}

export class SendRentalRemitoSigningInvitationParamDto extends createZodDto(
  SendRentalRemitoSigningInvitationParamSchema,
) {}
