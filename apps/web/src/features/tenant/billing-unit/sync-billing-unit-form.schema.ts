import {
	type SyncTenantBillingUnitsDto,
	syncTenantBillingUnitsSchema,
} from "@repo/schemas";
import { z } from "zod";

export const tenantBillingUnitsFormSchema = z.object({
	billingUnitIds: z
		.array(z.string())
		.min(1, "At least one billing unit is required"),
});

export type TenantBillingUnitsFormValues = z.infer<
	typeof tenantBillingUnitsFormSchema
>;

export function tenantBillingUnitsToFormValues(
	billingUnitIds: string[],
): TenantBillingUnitsFormValues {
	return { billingUnitIds };
}

export function toSyncTenantBillingUnitsDto(
	values: TenantBillingUnitsFormValues,
): SyncTenantBillingUnitsDto {
	return syncTenantBillingUnitsSchema.parse(values);
}
