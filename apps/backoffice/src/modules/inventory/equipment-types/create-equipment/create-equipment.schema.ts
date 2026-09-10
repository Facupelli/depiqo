import {
	type CreateEquipmentBodyDto,
	CreateEquipmentBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const equipmentFormSchema = z.object({
	name: z.string().trim().min(1, "El nombre es obligatorio"),
	description: z.string(),
	imageUrl: z.string(),
	categoryId: z.string(),
});

export const assetFormSchema = z.object({
	draftId: z.string(),
	branchId: z.string().min(1, "La sucursal es obligatoria"),
	serialNumber: z.string(),
	notes: z.string(),
	ownerId: z.string(),
});

export const assetsFormSchema = z.array(assetFormSchema);

export const standaloneRentalFormSchema = z
	.object({
		enabled: z.boolean(),
		name: z.string(),
		description: z.string(),
		imageUrl: z.string(),
		categoryId: z.string(),
		branchIds: z.array(z.string()),
	})
	.superRefine((rental, context) => {
		if (!rental.enabled) return;

		if (!rental.name.trim()) {
			context.addIssue({
				code: "custom",
				path: ["name"],
				message: "El nombre es obligatorio",
			});
		}

		if (rental.branchIds.length === 0) {
			context.addIssue({
				code: "custom",
				path: ["branchIds"],
				message: "Selecciona al menos una sucursal",
			});
		}
	});

export const createEquipmentFormSchema = z.object({
	equipment: equipmentFormSchema,
	assets: assetsFormSchema,
	standaloneRental: standaloneRentalFormSchema,
});

export type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;
export type AssetFormValues = z.infer<typeof assetFormSchema>;
export type StandaloneRentalFormValues = z.infer<
	typeof standaloneRentalFormSchema
>;
export type CreateEquipmentFormValues = z.infer<
	typeof createEquipmentFormSchema
>;

export function createEmptyAsset(): AssetFormValues {
	return {
		draftId: crypto.randomUUID(),
		branchId: "",
		serialNumber: "",
		notes: "",
		ownerId: "",
	};
}

export function createEquipmentFormDefaultValues(): CreateEquipmentFormValues {
	return {
		equipment: {
			name: "",
			description: "",
			imageUrl: "",
			categoryId: "",
		},
		assets: [],
		standaloneRental: {
			enabled: false,
			name: "",
			description: "",
			imageUrl: "",
			categoryId: "",
			branchIds: [],
		},
	};
}

export function toCreateEquipmentDto(
	values: CreateEquipmentFormValues,
): CreateEquipmentBodyDto {
	const dto = {
		equipment: {
			name: values.equipment.name.trim(),
			description: emptyToNull(values.equipment.description),
			imageUrl: emptyToNull(values.equipment.imageUrl),
			categoryId: emptyToNull(values.equipment.categoryId),
		},
		assets: values.assets.map((asset) => ({
			branchId: asset.branchId,
			serialNumber: emptyToNull(asset.serialNumber),
			notes: emptyToNull(asset.notes),
			ownerId: emptyToNull(asset.ownerId),
		})),
		...(values.standaloneRental.enabled
			? {
					standaloneRental: {
						name: values.standaloneRental.name.trim(),
						description: emptyToNull(values.standaloneRental.description),
						imageUrl: emptyToNull(values.standaloneRental.imageUrl),
						categoryId: emptyToNull(values.standaloneRental.categoryId),
						branchIds: values.standaloneRental.branchIds,
					},
				}
			: {}),
	};

	return CreateEquipmentBodySchema.parse(dto);
}
