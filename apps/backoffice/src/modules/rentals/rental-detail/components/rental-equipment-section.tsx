import { Button } from "@repo/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import {
	ChevronDown,
	ChevronUp,
	Package,
	Pencil,
	Trash2,
	User2Icon,
} from "lucide-react";
import { useState } from "react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { cn } from "@/lib/utils";
import { AddProductDialog } from "../add-selection/add-product-dialog";
import { ChangeSelectionQuantityDialog } from "../change-selection-quantity/change-selection-quantity-dialog";
import type {
	GetRentalDetailViewResponseDto,
	RentalDetailViewDemandLineDto,
	RentalDetailViewSelectionDto,
} from "../get-rental-detail-view/get-rental-detail-view.schema";
import { DemandLineAccessoryAssignmentSheet } from "../preparation/accessories/demand-line-accessory-assignment-sheet";
import { RentalAccessoryAssignmentSheet } from "../preparation/accessories/rental-accessory-assignment-sheet";
import { RemoveSelectionAlertDialog } from "../remove-selection/remove-selection-alert-dialog";
import { useRemoveSelectionDialog } from "../remove-selection/use-remove-selection-dialog";
import { useRentalDetailContext } from "../rental-detail.context";
import { isNonEmptyString } from "../rental-detail.utils";
import { ReplaceAssignedAssetDialog } from "../replace-assigned-asset/replace-assigned-asset-dialog";
import { DemandLineRowActions } from "./demand-line-row-actions";

export function RentalEquipmentSection() {
	const { rental } = useRentalDetailContext();
	const [isAccessorySheetOpen, setIsAccessorySheetOpen] = useState(false);
	const [selectedAccessoryDemandLineId, setSelectedAccessoryDemandLineId] =
		useState<string | null>(null);
	const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
	const [quantitySelection, setQuantitySelection] =
		useState<RentalDetailViewSelectionDto | null>(null);
	const [removeSelectionId, setRemoveSelectionId] = useState<string | null>(
		null,
	);
	const [replaceAssignedAssetId, setReplaceAssignedAssetId] = useState<
		string | null
	>(null);
	const removeDialog = useRemoveSelectionDialog({
		selectionId: removeSelectionId,
		onClose: () => setRemoveSelectionId(null),
	});
	const accessoriesByEquipmentLine = groupAccessoriesByEquipmentLine(
		rental.accessories,
	);
	const unlinkedAccessories = rental.accessories.filter(
		(accessory) => !accessory.sourceRentalDemandLineId,
	);
	const selectedAccessoryDemandLine = rental.selections
		.flatMap((selection) => selection.demandLines)
		.find((demandLine) => demandLine.id === selectedAccessoryDemandLineId);
	const canAssignDemandLineAccessories =
		rental.status === "CONFIRMED" && Date.now() < Date.parse(rental.period.end);

	return (
		<div className="space-y-8">
			<RentalAccessoryAssignmentSheet
				open={isAccessorySheetOpen}
				onOpenChange={setIsAccessorySheetOpen}
			/>
			<DemandLineAccessoryAssignmentSheet
				demandLine={selectedAccessoryDemandLine ?? null}
				open={selectedAccessoryDemandLine !== undefined}
				onOpenChange={(open) => {
					if (!open) setSelectedAccessoryDemandLineId(null);
				}}
			/>
			<AddProductDialog
				open={isAddProductDialogOpen}
				onOpenChange={setIsAddProductDialogOpen}
			/>
			<ChangeSelectionQuantityDialog
				open={quantitySelection !== null}
				onOpenChange={(open) => {
					if (!open) setQuantitySelection(null);
				}}
				selection={quantitySelection}
			/>
			<RemoveSelectionAlertDialog
				open={removeSelectionId !== null}
				onOpenChange={removeDialog.onOpenChange}
				selection={removeDialog.selection}
				assignedAssetGroups={removeDialog.assignedAssetGroups}
				isPending={removeDialog.isSubmitting}
				errorMessage={removeDialog.errorMessage}
				onConfirm={removeDialog.onSubmit}
			/>
			<ReplaceAssignedAssetDialog
				currentAssignedAssetId={replaceAssignedAssetId}
				onClose={() => setReplaceAssignedAssetId(null)}
			/>
			<div>
				<div className="mb-5 flex min-w-0 flex-col gap-3 @3xl/rental-detail:flex-row @3xl/rental-detail:items-center @3xl/rental-detail:justify-between">
					<h2 className="text-sm font-semibold text-neutral-950">
						Equipos y accesorios
					</h2>
					<div className="flex min-w-0 flex-col items-start gap-2 @sm/rental-detail:flex-row @sm/rental-detail:flex-wrap @sm/rental-detail:items-center @3xl/rental-detail:justify-end">
						{rental.status === "CONFIRMED" ? (
							<Button
								type="button"
								onClick={() => setIsAddProductDialogOpen(true)}
							>
								Añadir producto
							</Button>
						) : null}
						{rental.status === "DRAFT" ? (
							<span className="text-sm text-muted-foreground">
								Confirma el pedido para asignar accesorios
							</span>
						) : (
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsAccessorySheetOpen(true)}
							>
								Asignar accesorios
							</Button>
						)}
					</div>
				</div>
				<section className="mb-10 min-w-0 space-y-3">
					{rental.selections.map((selection) => {
						const hasReferencedAccessories = selection.demandLines.some(
							(demandLine) => accessoriesByEquipmentLine.has(demandLine.id),
						);
						const removeDisabledReason =
							rental.selections.length <= 1
								? "El pedido debe conservar al menos un producto."
								: hasReferencedAccessories
									? "Quitá o reasigná los accesorios asociados antes de eliminar este producto."
									: null;

						return (
							<RentalEquipmentCard
								key={selection.id}
								accessoriesByEquipmentLine={accessoriesByEquipmentLine}
								selection={selection}
								onEditQuantity={
									rental.status === "CONFIRMED"
										? () => setQuantitySelection(selection)
										: undefined
								}
								onRemove={
									rental.status === "CONFIRMED"
										? () => {
												removeDialog.onTargetChange();
												setRemoveSelectionId(selection.id);
											}
										: undefined
								}
								removeDisabledReason={removeDisabledReason}
								onReplaceAssignedAsset={
									rental.status === "CONFIRMED"
										? setReplaceAssignedAssetId
										: undefined
								}
								onAssignAccessories={
									canAssignDemandLineAccessories
										? setSelectedAccessoryDemandLineId
										: undefined
								}
							/>
						);
					})}
					{unlinkedAccessories.length > 0 ? (
						<UnlinkedAccessoriesCard accessories={unlinkedAccessories} />
					) : null}
				</section>
			</div>
		</div>
	);
}

function RentalEquipmentCard({
	selection,
	accessoriesByEquipmentLine,
	onEditQuantity,
	onRemove,
	onReplaceAssignedAsset,
	onAssignAccessories,
	removeDisabledReason,
}: {
	selection: RentalDetailViewSelectionDto;
	onEditQuantity?: () => void;
	onRemove?: () => void;
	onReplaceAssignedAsset?: (assetId: string) => void;
	onAssignAccessories?: (rentalDemandLineId: string) => void;
	removeDisabledReason: string | null;
	accessoriesByEquipmentLine: Map<
		string,
		GetRentalDetailViewResponseDto["accessories"]
	>;
}) {
	const isPackage = selection.rentableItemKind !== "SINGLE";
	const [isPackageExpanded, setIsPackageExpanded] = useState(true);
	const packageContentsId = `combo-${selection.id}-contents`;
	const singleDemandLine = selection.demandLines[0];
	const accessories = singleDemandLine
		? (accessoriesByEquipmentLine.get(singleDemandLine.id) ?? [])
		: [];
	const owners = singleDemandLine
		? getAssetOwners(singleDemandLine.assignedAssets)
		: [];
	const replaceableAssignedAssets = singleDemandLine
		? getReplaceableAssignedAssets(singleDemandLine.assignedAssets)
		: [];

	return (
		<div className="@container/equipment-card min-w-0 rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-neutral-300 @sm/equipment-card:p-4">
			<div className="flex min-w-0 items-start gap-3">
				<ProductImage imageUrl={selection.rentableItem?.imageUrl ?? null} />
				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-start gap-2">
						<div className="min-w-0 flex-1">
							<p className="break-words font-semibold leading-snug text-neutral-950">
								{selection.rentableItemName}
							</p>
							<div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-neutral-500 text-xs">
								<span>{isPackage ? "Combo" : "Equipo"}</span>
								<span aria-hidden="true">·</span>
								<QuantityText quantity={selection.quantity} />
								{!isPackage && singleDemandLine ? (
									<AssignedAssetMetadata
										assignments={singleDemandLine.assignedAssets}
									/>
								) : null}
							</div>
							{!isPackage && owners.length > 0 ? (
								<div className="mt-1 space-y-0.5">
									{owners.map((owner) => (
										<span
											key={owner}
											className="flex min-w-0 items-start gap-1 text-[11px] text-neutral-500"
										>
											<User2Icon className="mt-0.5 size-3 shrink-0" />
											<span className="min-w-0 break-words">
												Propietario: {owner}
											</span>
										</span>
									))}
								</div>
							) : null}
						</div>
						<div className="flex shrink-0 items-center">
							{onEditQuantity ? (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-7 text-neutral-500"
									onClick={onEditQuantity}
									aria-label={`Editar cantidad de ${selection.rentableItemName}`}
								>
									<Pencil className="size-3.5" />
								</Button>
							) : null}
							{onRemove ? (
								<RemoveSelectionButton
									disabledReason={removeDisabledReason}
									onRemove={onRemove}
								/>
							) : null}
							{isPackage ? (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-7 text-neutral-500"
									onClick={() => setIsPackageExpanded((expanded) => !expanded)}
									aria-controls={packageContentsId}
									aria-expanded={isPackageExpanded}
									aria-label={
										isPackageExpanded
											? `Ocultar equipos de ${selection.rentableItemName}`
											: `Mostrar equipos de ${selection.rentableItemName}`
									}
								>
									{isPackageExpanded ? (
										<ChevronUp className="size-3.5" />
									) : (
										<ChevronDown className="size-3.5" />
									)}
								</Button>
							) : null}
							{!isPackage &&
							singleDemandLine &&
							(onAssignAccessories ||
								(onReplaceAssignedAsset &&
									replaceableAssignedAssets.length > 0)) ? (
								<DemandLineRowActions
									equipmentTypeName={singleDemandLine.equipmentTypeName}
									rentalDemandLineId={singleDemandLine.id}
									replaceableAssignedAssets={replaceableAssignedAssets}
									onAssignAccessories={onAssignAccessories}
									onReplaceAssignedAsset={onReplaceAssignedAsset}
								/>
							) : null}
						</div>
					</div>
				</div>
			</div>
			{isPackage ? (
				<div
					id={packageContentsId}
					aria-hidden={!isPackageExpanded}
					className={cn(
						"grid transition-[grid-template-rows,opacity] duration-150 ease-out motion-reduce:transition-none",
						isPackageExpanded
							? "grid-rows-[1fr] opacity-100"
							: "pointer-events-none grid-rows-[0fr] opacity-0",
					)}
				>
					<div className="min-h-0 overflow-hidden" inert={!isPackageExpanded}>
						<RentalPackageChildrenList
							accessoriesByEquipmentLine={accessoriesByEquipmentLine}
							items={selection.demandLines}
							onReplaceAssignedAsset={onReplaceAssignedAsset}
							onAssignAccessories={onAssignAccessories}
						/>
					</div>
				</div>
			) : null}
			{!isPackage && accessories.length > 0 ? (
				<RentalAccessoriesList accessories={accessories} />
			) : null}
		</div>
	);
}

function RemoveSelectionButton({
	disabledReason,
	onRemove,
}: {
	disabledReason: string | null;
	onRemove: () => void;
}) {
	if (!disabledReason) {
		return (
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-6 text-destructive hover:text-destructive"
				onClick={onRemove}
				aria-label="Eliminar producto"
			>
				<Trash2 className="size-3.5" />
			</Button>
		);
	}

	return (
		<Popover>
			<PopoverTrigger
				render={
					<button
						type="button"
						aria-disabled="true"
						aria-label={`Eliminar producto. ${disabledReason}`}
						className="inline-flex size-6 items-center justify-center rounded-md text-destructive opacity-50"
					>
						<Trash2 className="size-3.5" />
					</button>
				}
			/>
			<PopoverContent side="top" className="w-72">
				<PopoverDescription>{disabledReason}</PopoverDescription>
			</PopoverContent>
		</Popover>
	);
}

function RentalPackageChildrenList({
	items,
	accessoriesByEquipmentLine,
	onReplaceAssignedAsset,
	onAssignAccessories,
}: {
	items: RentalDetailViewDemandLineDto[];
	onReplaceAssignedAsset?: (assetId: string) => void;
	onAssignAccessories?: (rentalDemandLineId: string) => void;
	accessoriesByEquipmentLine: Map<
		string,
		GetRentalDetailViewResponseDto["accessories"]
	>;
}) {
	return (
		<div className="mt-3 min-w-0 space-y-2.5">
			{items.map((child) => (
				<RentalPackageChildRow
					key={child.id}
					accessories={accessoriesByEquipmentLine.get(child.id) ?? []}
					equipment={child}
					onReplaceAssignedAsset={onReplaceAssignedAsset}
					onAssignAccessories={onAssignAccessories}
				/>
			))}
		</div>
	);
}

function RentalPackageChildRow({
	equipment,
	accessories,
	onReplaceAssignedAsset,
	onAssignAccessories,
}: {
	equipment: RentalDetailViewDemandLineDto;
	accessories: GetRentalDetailViewResponseDto["accessories"];
	onReplaceAssignedAsset?: (assetId: string) => void;
	onAssignAccessories?: (rentalDemandLineId: string) => void;
}) {
	const owners = getAssetOwners(equipment.assignedAssets);
	const replaceableAssignedAssets = getReplaceableAssignedAssets(
		equipment.assignedAssets,
	);

	return (
		<div className="@container/package-child min-w-0 rounded-lg bg-neutral-50 px-3 py-2.5">
			<div className="flex min-w-0 items-start gap-2">
				<div className="min-w-0 flex-1">
					<p className="break-words font-medium leading-snug text-neutral-800 text-sm">
						{equipment.equipmentTypeName}
					</p>
					<div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[11px] text-neutral-500">
						<QuantityText quantity={equipment.quantity} />
						<AssignedAssetMetadata assignments={equipment.assignedAssets} />
					</div>
					{owners.length > 0 ? (
						<div className="mt-1 space-y-0.5">
							{owners.map((owner) => (
								<span
									key={owner}
									className="flex min-w-0 items-start gap-1 text-[11px] text-neutral-500"
								>
									<User2Icon className="mt-0.5 size-3 shrink-0" />
									<span className="min-w-0 break-words">
										Propietario: {owner}
									</span>
								</span>
							))}
						</div>
					) : null}
				</div>
				{onAssignAccessories ||
				(onReplaceAssignedAsset && replaceableAssignedAssets.length > 0) ? (
					<DemandLineRowActions
						equipmentTypeName={equipment.equipmentTypeName}
						rentalDemandLineId={equipment.id}
						replaceableAssignedAssets={replaceableAssignedAssets}
						onAssignAccessories={onAssignAccessories}
						onReplaceAssignedAsset={onReplaceAssignedAsset}
					/>
				) : null}
			</div>
			{accessories.length > 0 ? (
				<RentalAccessoriesList accessories={accessories} variant="compact" />
			) : null}
		</div>
	);
}

function RentalAccessoriesList({
	accessories,
	variant = "default",
}: {
	accessories: GetRentalDetailViewResponseDto["accessories"];
	variant?: "default" | "compact";
}) {
	return (
		<div
			className={cn(
				"min-w-0 rounded-md px-3 py-1.5",
				variant === "default" ? "mt-3 bg-neutral-50" : "mt-2 bg-white/80",
			)}
		>
			<p className="mb-1 font-semibold text-[10px] text-neutral-400 uppercase tracking-wide">
				Accesorios
			</p>
			<div className="space-y-1.5">
				{accessories.map((accessory) => (
					<RentalAccessoryRow key={accessory.id} accessory={accessory} />
				))}
			</div>
		</div>
	);
}

function RentalAccessoryRow({
	accessory,
}: {
	accessory: GetRentalDetailViewResponseDto["accessories"][number];
}) {
	const serials = getAssetSerials(accessory.assignedAssets);
	const missingAssetIds = getMissingAssetIds(accessory.assignedAssets);

	return (
		<div className="min-w-0 py-0.5 text-xs">
			<p className="min-w-0 break-words text-neutral-700">
				<span className="font-medium">{accessory.equipmentTypeName}</span>{" "}
				<span className="whitespace-nowrap text-neutral-500">
					×{accessory.quantity}
				</span>
			</p>
			{serials.length > 0 ? (
				<SerialMetadata serials={serials} className="mt-0.5" />
			) : null}
			<MissingAssetsFeedback assetIds={missingAssetIds} />
		</div>
	);
}

function UnlinkedAccessoriesCard({
	accessories,
}: {
	accessories: GetRentalDetailViewResponseDto["accessories"];
}) {
	return (
		<div className="min-w-0 rounded-xl bg-amber-50/60 px-4 py-3">
			<p className="mb-1.5 font-semibold text-amber-900 text-xs">
				Accesorios generales
			</p>
			<div className="space-y-1.5">
				{accessories.map((accessory) => (
					<RentalAccessoryRow key={accessory.id} accessory={accessory} />
				))}
			</div>
		</div>
	);
}

function AssignedAssetMetadata({
	assignments,
}: {
	assignments: RentalDetailViewDemandLineDto["assignedAssets"];
}) {
	const serials = getAssetSerials(assignments);
	const missingAssetIds = getMissingAssetIds(assignments);

	return (
		<>
			{serials.length > 0 ? (
				<>
					<span aria-hidden="true">·</span>
					<SerialMetadata serials={serials} />
				</>
			) : null}
			{missingAssetIds.length > 0 ? (
				<div className="basis-full">
					<MissingAssetsFeedback assetIds={missingAssetIds} />
				</div>
			) : null}
		</>
	);
}

function SerialMetadata({
	serials,
	className,
}: {
	serials: string[];
	className?: string;
}) {
	return (
		<span
			className={cn(
				"min-w-0 break-words text-[11px] text-neutral-500",
				className,
			)}
		>
			<span>S/N </span>
			{serials.map((serial, index) => (
				<span className="text-sm" key={serial}>
					{index > 0 ? <span className="font-sans"> · </span> : null}
					<span className="break-all font-mono text-depiqo-blue-900/80">
						{serial}
					</span>
				</span>
			))}
		</span>
	);
}

function ProductImage({ imageUrl }: { imageUrl: string | null }) {
	const publicImageUrl = buildR2PublicUrl(imageUrl, "catalog");

	return (
		<div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
			{publicImageUrl ? (
				<img
					alt=""
					className="h-full w-full object-cover"
					src={publicImageUrl}
				/>
			) : (
				<Package className="size-5 text-neutral-300" />
			)}
		</div>
	);
}

function MissingAssetsFeedback({ assetIds }: { assetIds: string[] }) {
	if (assetIds.length === 0) {
		return null;
	}

	return (
		<p className="min-w-0 break-words font-mono text-[11px] text-amber-700">
			Asset no encontrado: {assetIds.join(", ")}
		</p>
	);
}

function QuantityText({ quantity }: { quantity: number }) {
	return <span className="whitespace-nowrap text-sm">×{quantity}</span>;
}

function groupAccessoriesByEquipmentLine(
	accessories: GetRentalDetailViewResponseDto["accessories"],
) {
	const groups = new Map<
		string,
		GetRentalDetailViewResponseDto["accessories"]
	>();

	for (const accessory of accessories) {
		if (!accessory.sourceRentalDemandLineId) {
			continue;
		}

		const group = groups.get(accessory.sourceRentalDemandLineId) ?? [];
		group.push(accessory);
		groups.set(accessory.sourceRentalDemandLineId, group);
	}

	return groups;
}

function getReplaceableAssignedAssets(
	assets: RentalDetailViewDemandLineDto["assignedAssets"],
) {
	return assets.flatMap((assignment) => {
		const serialNumber = assignment.asset?.serialNumber?.trim();

		return serialNumber !== undefined
			? [
					{
						assetId: assignment.assetId,
						label: serialNumber || assignment.assetId,
					},
				]
			: [];
	});
}

function getAssetOwners(
	assets: GetRentalDetailViewResponseDto["selections"][number]["demandLines"][number]["assignedAssets"],
) {
	return [
		...new Set(
			assets.map((asset) => asset.asset?.owner?.name).filter(isNonEmptyString),
		),
	];
}

function getAssetSerials(
	assets: GetRentalDetailViewResponseDto["selections"][number]["demandLines"][number]["assignedAssets"],
) {
	return assets
		.map((asset) => asset.asset?.serialNumber)
		.filter(isNonEmptyString);
}

function getMissingAssetIds(
	assets: GetRentalDetailViewResponseDto["selections"][number]["demandLines"][number]["assignedAssets"],
) {
	return assets
		.filter((asset) => asset.isMissing)
		.map((asset) => asset.assetId);
}
