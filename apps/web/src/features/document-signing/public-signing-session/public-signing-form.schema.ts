import {
	type AcceptPublicSigningSessionBodyDto,
	AcceptPublicSigningSessionBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const publicSigningFormSchema = z.object({
	signatureImageDataUrl: z
		.string()
		.trim()
		.min(1, "Dibuja tu firma para continuar."),
	accepted: z.boolean().refine((value) => value, {
		message: "Debes confirmar que revisaste y aceptas el contrato.",
	}),
});

export type PublicSigningFormValues = z.infer<typeof publicSigningFormSchema>;

export function createPublicSigningFormDefaults(): PublicSigningFormValues {
	return {
		signatureImageDataUrl: "",
		accepted: false,
	};
}

export function toAcceptPublicSigningSessionDto(
	values: PublicSigningFormValues,
	acceptanceTextVersion: string,
): AcceptPublicSigningSessionBodyDto {
	return AcceptPublicSigningSessionBodySchema.parse({
		signatureImageDataUrl: values.signatureImageDataUrl.trim(),
		acceptanceTextVersion,
		accepted: true,
	});
}
