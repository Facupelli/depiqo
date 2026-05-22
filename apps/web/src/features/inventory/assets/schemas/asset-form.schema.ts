import {
	type CreateAssetDto,
	createAssetSchema,
	type UpdateAssetDto,
	updateAssetSchema,
} from "@repo/schemas";
import { TrackingMode } from "@repo/types";
import { z } from "zod";
import { emptyToNull, emptyToNullOrUndefined } from "@/shared/utils/form.utils";

export const pooledAssetFormSchema = z.object({
	locationId: z.string().min(1, "Location is required"),
	ownerId: z.string().or(z.literal("")),
	serialNumber: z.string().or(z.literal("")),
	notes: z.string().or(z.literal("")),
});

export const identifiedAssetFormSchema = z.object({
	locationId: z.string().min(1, "Location is required"),
	ownerId: z.string().or(z.literal("")),
	serialNumber: z.string().min(1, "Numero de serie es requerido"),
	notes: z.string().or(z.literal("")),
});

export const assetFormSchema = (trackingMode: TrackingMode) =>
	trackingMode === TrackingMode.IDENTIFIED
		? identifiedAssetFormSchema
		: pooledAssetFormSchema;

export type AssetFormValues = z.infer<typeof pooledAssetFormSchema>;

export function getAssetFormDefaults(locationId: string): AssetFormValues {
	return {
		locationId,
		ownerId: "",
		serialNumber: "",
		notes: "",
	};
}

export function assetToFormValues(asset: {
	locationId: string;
	ownerId: string | null;
	serialNumber: string | null;
	notes: string | null;
}): AssetFormValues {
	return {
		locationId: asset.locationId,
		ownerId: asset.ownerId ?? "",
		serialNumber: asset.serialNumber ?? "",
		notes: asset.notes ?? "",
	};
}

export function toCreateAssetDto(
	values: AssetFormValues,
	productTypeId: string,
): CreateAssetDto {
	const dto = {
		productTypeId,
		locationId: values.locationId,
		ownerId: emptyToNull(values.ownerId),
		serialNumber: emptyToNull(values.serialNumber),
		notes: emptyToNull(values.notes),
		isActive: true,
	};

	return createAssetSchema.parse(dto);
}

export function toUpdateAssetDto(
	dirtyValues: Partial<AssetFormValues>,
): UpdateAssetDto {
	const dto: UpdateAssetDto = {};

	if (dirtyValues.locationId !== undefined) {
		dto.locationId = dirtyValues.locationId;
	}
	if (dirtyValues.ownerId !== undefined) {
		dto.ownerId = emptyToNullOrUndefined(dirtyValues.ownerId);
	}
	if (dirtyValues.serialNumber !== undefined) {
		dto.serialNumber = emptyToNullOrUndefined(dirtyValues.serialNumber);
	}
	if (dirtyValues.notes !== undefined) {
		dto.notes = emptyToNullOrUndefined(dirtyValues.notes);
	}

	return updateAssetSchema.parse(dto);
}
