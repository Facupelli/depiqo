import {
	type RegisterCustomDomainBodyDto,
	RegisterCustomDomainBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const customDomainFormSchema = z.object({
	domain: z
		.string()
		.trim()
		.min(1, "Domain is required")
		.refine((value) => !/\s/.test(value), "Domain cannot contain spaces"),
});

export type CustomDomainFormValues = z.infer<typeof customDomainFormSchema>;

export function createCustomDomainFormDefaultValues(): CustomDomainFormValues {
	return {
		domain: "",
	};
}

export function toRegisterCustomDomainDto(
	values: CustomDomainFormValues,
): RegisterCustomDomainBodyDto {
	const dto = {
		domain: values.domain.trim().toLowerCase(),
	};

	return RegisterCustomDomainBodySchema.parse(dto);
}
