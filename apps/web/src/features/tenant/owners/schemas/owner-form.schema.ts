import {
	type CreateOwnerDto,
	createOwnerSchema,
	type UpdateOwnerDto,
	updateOwnerSchema,
} from "@repo/schemas";
import { z } from "zod";
import { emptyToNull, emptyToNullOrUndefined } from "@/shared/utils/form.utils";

export const ownerFormSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.email("Invalid email").or(z.literal("")),
	phone: z.string().or(z.literal("")),
	notes: z.string().or(z.literal("")),
	isActive: z.boolean(),
});

export type OwnerFormValues = z.infer<typeof ownerFormSchema>;

export const ownerFormDefaults: OwnerFormValues = {
	name: "",
	email: "",
	phone: "",
	notes: "",
	isActive: true,
};

export function ownerToFormValues(
	owner: Partial<{
		name: string;
		email: string | null;
		phone: string | null;
		notes: string | null;
		isActive: boolean;
	}>,
): OwnerFormValues {
	return {
		name: owner.name ?? "",
		email: owner.email ?? "",
		phone: owner.phone ?? "",
		notes: owner.notes ?? "",
		isActive: owner.isActive ?? true,
	};
}

// ---------------------------------------------------------------------------
// MAPPERS
// ---------------------------------------------------------------------------

export function toCreateOwnerDto(values: OwnerFormValues): CreateOwnerDto {
	const dto = {
		name: values.name.trim(),
		email: emptyToNull(values.email),
		phone: emptyToNull(values.phone),
		notes: emptyToNull(values.notes),
		isActive: values.isActive,
	};

	// Parse through the shared schema as a safety net — catches contract drift
	// between the form mapper and the actual DTO shape at runtime.
	return createOwnerSchema.parse(dto);
}

export function toUpdateOwnerDto(
	// Only the fields the user actually changed should be passed here.
	// TanStack Form's `form.getFieldMeta` or a dirty-fields map can help.
	dirtyValues: Partial<OwnerFormValues>,
): UpdateOwnerDto {
	const dto: UpdateOwnerDto = {};

	if (dirtyValues.name !== undefined) {
		dto.name = dirtyValues.name.trim();
	}
	if (dirtyValues.email !== undefined) {
		dto.email = emptyToNullOrUndefined(dirtyValues.email);
	}
	if (dirtyValues.phone !== undefined) {
		dto.phone = emptyToNullOrUndefined(dirtyValues.phone);
	}
	if (dirtyValues.notes !== undefined) {
		dto.notes = emptyToNullOrUndefined(dirtyValues.notes);
	}
	if (dirtyValues.isActive !== undefined) {
		dto.isActive = dirtyValues.isActive;
	}

	return updateOwnerSchema.parse(dto);
}
