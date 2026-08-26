import type { RentalDetailViewSelectionDto } from "../get-rental-detail-view/get-rental-detail-view.schema";

export type QuantityChangeMode = "unchanged" | "increase" | "decrease";
export type AvailabilityState = "checking" | "ready" | "error";

export interface DemandLineReleaseRequirement {
	demandLineId: string;
	equipmentTypeName: string;
	requiredCount: number;
	assignedAssets: RentalDetailViewSelectionDto["demandLines"][number]["assignedAssets"];
}

export function getQuantityChangeMode(
	currentQuantity: number,
	newQuantity: number,
): QuantityChangeMode {
	if (newQuantity === currentQuantity) return "unchanged";
	return newQuantity > currentQuantity ? "increase" : "decrease";
}

export function getAdditionalQuantity(
	currentQuantity: number,
	newQuantity: number,
): number {
	return Math.max(newQuantity - currentQuantity, 0);
}

export function getMaximumQuantity(
	currentQuantity: number,
	availableAdditionalUnits: number | null,
): number | null {
	return availableAdditionalUnits === null
		? null
		: currentQuantity + Math.max(availableAdditionalUnits, 0);
}

export function deriveDemandLineReleaseRequirements(
	selection: RentalDetailViewSelectionDto,
	newQuantity: number,
): DemandLineReleaseRequirement[] | null {
	if (
		!Number.isInteger(newQuantity) ||
		newQuantity < 1 ||
		newQuantity >= selection.quantity
	) {
		return [];
	}

	const requirements: DemandLineReleaseRequirement[] = [];
	for (const line of selection.demandLines) {
		if (line.quantity % selection.quantity !== 0) return null;
		const unitsPerSelection = line.quantity / selection.quantity;
		const requiredCount = line.quantity - newQuantity * unitsPerSelection;
		if (!Number.isInteger(requiredCount) || requiredCount < 1) return null;
		requirements.push({
			demandLineId: line.id,
			equipmentTypeName: line.equipmentTypeName,
			requiredCount,
			assignedAssets: line.assignedAssets,
		});
	}
	return requirements;
}

export function areReleaseSelectionsValid(
	requirements: DemandLineReleaseRequirement[] | null,
	selectedAssetIds: ReadonlySet<string>,
): boolean {
	if (!requirements || requirements.length === 0) return false;
	const allAssignedIds = new Set(
		requirements.flatMap((line) =>
			line.assignedAssets.map((assignment) => assignment.assetId),
		),
	);
	if ([...selectedAssetIds].some((id) => !allAssignedIds.has(id))) return false;

	let requiredTotal = 0;
	for (const requirement of requirements) {
		const lineIds = new Set(
			requirement.assignedAssets.map((assignment) => assignment.assetId),
		);
		const selectedForLine = [...selectedAssetIds].filter((id) =>
			lineIds.has(id),
		);
		if (selectedForLine.length !== requirement.requiredCount) return false;
		requiredTotal += requirement.requiredCount;
	}
	return selectedAssetIds.size === requiredTotal;
}

export function canSubmitQuantityChange(input: {
	currentQuantity: number;
	newQuantity: number;
	availableAdditionalUnits: number | null;
	availabilityState: AvailabilityState;
	releaseRequirements: DemandLineReleaseRequirement[] | null;
	selectedAssetIds: ReadonlySet<string>;
	isPending: boolean;
}): boolean {
	if (
		input.isPending ||
		!Number.isInteger(input.newQuantity) ||
		input.newQuantity < 1 ||
		input.newQuantity === input.currentQuantity
	) {
		return false;
	}

	if (input.newQuantity > input.currentQuantity) {
		if (input.availabilityState === "checking") return false;
		if (input.availabilityState === "error") return true;
		const maximum = getMaximumQuantity(
			input.currentQuantity,
			input.availableAdditionalUnits,
		);
		return maximum !== null && input.newQuantity <= maximum;
	}

	return areReleaseSelectionsValid(
		input.releaseRequirements,
		input.selectedAssetIds,
	);
}
