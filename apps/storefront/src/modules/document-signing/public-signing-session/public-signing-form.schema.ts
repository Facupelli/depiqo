import {
	type AcceptPublicSigningSessionBodyDto,
	AcceptPublicSigningSessionBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

const SIGNATURE_IMAGE_DATA_URL_MAX_LENGTH = 350_000;
const pngDataUrlPattern = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;

export const publicSigningFormSchema = z.object({
	signatureImageDataUrl: z
		.string()
		.trim()
		.min(1, "Dibuja tu firma para continuar.")
		.max(
			SIGNATURE_IMAGE_DATA_URL_MAX_LENGTH,
			"La imagen de la firma es demasiado grande. Redibújala para continuar.",
		)
		.regex(pngDataUrlPattern, "La firma debe ser una imagen PNG válida."),
	accepted: z.boolean().refine((value) => value, {
		message: "Debes confirmar que aceptas el texto de firma para continuar.",
	}),
});

export type PublicSigningFormValues = z.infer<typeof publicSigningFormSchema>;

export function createPublicSigningFormDefaults(): PublicSigningFormValues {
	return { signatureImageDataUrl: "", accepted: false };
}

export function toAcceptPublicSigningSessionDto(
	values: PublicSigningFormValues,
	acceptanceTextVersion: string,
): AcceptPublicSigningSessionBodyDto {
	return AcceptPublicSigningSessionBodySchema.parse({
		signatureImageDataUrl: values.signatureImageDataUrl.trim(),
		acceptanceTextVersion,
		accepted: values.accepted,
	});
}
