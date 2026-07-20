import {
	type SendSigningInvitationBodyDto,
	SendSigningInvitationBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const rentalSigningInvitationFormSchema = z.object({
	recipientEmail: z.string().trim().email("Ingresá un email válido."),
});

export type RentalSigningInvitationFormValues = z.infer<
	typeof rentalSigningInvitationFormSchema
>;

export function createRentalSigningInvitationFormDefaults(
	recipientEmail: string | null | undefined,
): RentalSigningInvitationFormValues {
	return {
		recipientEmail: recipientEmail ?? "",
	};
}

export function toRentalSigningInvitationDto(
	values: RentalSigningInvitationFormValues,
): SendSigningInvitationBodyDto {
	return SendSigningInvitationBodySchema.parse({
		recipientEmail: values.recipientEmail.trim(),
	});
}
