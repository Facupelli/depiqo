import {
	type GetEquipmentTypeAccessoryDefaultsResponseDto,
	type ReplaceEquipmentTypeAccessoryDefaultsBodyDto,
	ReplaceEquipmentTypeAccessoryDefaultsBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const equipmentAccessoryFormItemSchema = z.object({
	accessoryEquipmentTypeId: z
		.string()
		.uuid("Selecciona un tipo de equipo válido"),
	name: z.string().min(1, "Selecciona un tipo de equipo"),
	quantity: z
		.number()
		.int("La cantidad debe ser un número entero")
		.min(1, "La cantidad debe ser mayor a cero"),
});

export const editEquipmentAccessoriesFormSchema = z.object({
	accessories: z.array(equipmentAccessoryFormItemSchema),
});

export type EquipmentAccessoryFormItem = z.infer<
	typeof equipmentAccessoryFormItemSchema
>;
export type EditEquipmentAccessoriesFormValues = z.infer<
	typeof editEquipmentAccessoriesFormSchema
>;

export function createEquipmentAccessoryFormItem(
	accessoryEquipmentTypeId: string,
	name: string,
): EquipmentAccessoryFormItem {
	return { accessoryEquipmentTypeId, name, quantity: 1 };
}

export function fromAccessoryDefaultsToFormValues(
	accessoryDefaults: GetEquipmentTypeAccessoryDefaultsResponseDto,
): EditEquipmentAccessoriesFormValues {
	return {
		accessories: accessoryDefaults.map((accessory) => ({
			accessoryEquipmentTypeId: accessory.accessoryEquipmentTypeId,
			name: accessory.name,
			quantity: accessory.defaultQuantity,
		})),
	};
}

export function toReplaceEquipmentAccessoriesDto(
	values: EditEquipmentAccessoriesFormValues,
): ReplaceEquipmentTypeAccessoryDefaultsBodyDto {
	return ReplaceEquipmentTypeAccessoryDefaultsBodySchema.parse({
		accessories: values.accessories.map((accessory) => ({
			accessoryEquipmentTypeId: accessory.accessoryEquipmentTypeId,
			quantity: accessory.quantity,
		})),
	});
}
