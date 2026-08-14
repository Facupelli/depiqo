import type { GetStorefrontRentalOffersPackageCompositionItemDto } from "@repo/api-contracts";

export type CartPackageCompositionGroup = {
	categoryId: string | null;
	categoryName: string;
	requirements: GetStorefrontRentalOffersPackageCompositionItemDto[];
};

export function groupCartPackageComposition(
	requirements: GetStorefrontRentalOffersPackageCompositionItemDto[],
): CartPackageCompositionGroup[] {
	const groups = new Map<string, CartPackageCompositionGroup>();

	for (const requirement of requirements) {
		const key = requirement.category?.id ?? "uncategorized";
		const categoryName = requirement.category?.name ?? "Sin categoría";
		const group = groups.get(key) ?? {
			categoryId: requirement.category?.id ?? null,
			categoryName,
			requirements: [],
		};
		group.requirements.push(requirement);
		groups.set(key, group);
	}

	return [...groups.values()];
}
