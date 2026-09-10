export const equipmentTypeRentalUsageKeys = {
	all: () => ["v2", "backoffice", "equipment-type-rental-usages"] as const,
	detail: (equipmentTypeId: string) =>
		[...equipmentTypeRentalUsageKeys.all(), equipmentTypeId] as const,
};
