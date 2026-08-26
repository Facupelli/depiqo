import {
	type CreateEquipmentTypeAccessoryDefaultsBodyDto,
	CreateEquipmentTypeAccessoryDefaultsBodySchema,
	type ReplaceEquipmentTypeAccessoryDefaultsBodyDto,
	ReplaceEquipmentTypeAccessoryDefaultsBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const createAccessorySuggestionItemFormSchema = z.object({
	accessoryEquipmentTypeId: z
		.string()
		.uuid("Selecciona un tipo de equipo válido"),
	accessoryEquipmentTypeName: z.string().min(1, "Selecciona un tipo de equipo"),
	quantity: z
		.number()
		.int("La cantidad debe ser un número entero")
		.positive("La cantidad debe ser mayor a cero"),
});

export const addAccessorySuggestionsFormSchema = z.object({
	accessories: z
		.array(createAccessorySuggestionItemFormSchema)
		.min(1, "Agrega al menos un accesorio por defecto"),
});

export type CreateEquipmentTypeAccessoryDefaultItemFormValues = z.infer<
	typeof createAccessorySuggestionItemFormSchema
>;
export const editAccessorySuggestionsFormSchema = z.object({
	accessories: z.array(createAccessorySuggestionItemFormSchema),
});

export type AddAccessorySuggestionsFormValues = z.infer<
	typeof addAccessorySuggestionsFormSchema
>;

export function addAccessorySuggestionsFormDefaultValues(): AddAccessorySuggestionsFormValues {
	return {
		accessories: [],
	};
}

export function createAccessorySuggestionItem(
	accessoryEquipmentTypeId: string,
	accessoryEquipmentTypeName: string,
): CreateEquipmentTypeAccessoryDefaultItemFormValues {
	return {
		accessoryEquipmentTypeId,
		accessoryEquipmentTypeName,
		quantity: 1,
	};
}

export function toAddAccessorySuggestionsDto(
	values: AddAccessorySuggestionsFormValues,
): CreateEquipmentTypeAccessoryDefaultsBodyDto {
	const dto = {
		accessories: values.accessories.map((accessory) => ({
			accessoryEquipmentTypeId: accessory.accessoryEquipmentTypeId,
			quantity: accessory.quantity,
		})),
	};

	return CreateEquipmentTypeAccessoryDefaultsBodySchema.parse(dto);
}

type AccessoryDefaultLike = {
	accessoryEquipmentTypeId: string;
	accessoryEquipmentTypeName: string;
	quantity: number;
};

export function fromAccessoryDefaultsToEditFormValues(
	accessoryDefaults: AccessoryDefaultLike[],
): AddAccessorySuggestionsFormValues {
	return {
		accessories: accessoryDefaults.map((accessoryDefault) => ({
			accessoryEquipmentTypeId: accessoryDefault.accessoryEquipmentTypeId,
			accessoryEquipmentTypeName: accessoryDefault.accessoryEquipmentTypeName,
			quantity: accessoryDefault.quantity,
		})),
	};
}

export function toReplaceAccessoryDefaultsDto(
	values: AddAccessorySuggestionsFormValues,
): ReplaceEquipmentTypeAccessoryDefaultsBodyDto {
	const dto = {
		accessories: values.accessories.map((accessory) => ({
			accessoryEquipmentTypeId: accessory.accessoryEquipmentTypeId,
			quantity: accessory.quantity,
		})),
	};

	return ReplaceEquipmentTypeAccessoryDefaultsBodySchema.parse(dto);
}
