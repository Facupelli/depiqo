import { Button } from "@repo/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { Package, Pencil, RefreshCw, Trash2, User2Icon } from "lucide-react";
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
import { RentalAccessoryAssignmentSheet } from "../preparation/accessories/rental-accessory-assignment-sheet";
import { RemoveSelectionAlertDialog } from "../remove-selection/remove-selection-alert-dialog";
import { useRemoveSelectionDialog } from "../remove-selection/use-remove-selection-dialog";
import { useRentalDetailContext } from "../rental-detail.context";
import { isNonEmptyString } from "../rental-detail.utils";
import { ReplaceAssignedAssetDialog } from "../replace-assigned-asset/replace-assigned-asset-dialog";

export function RentalEquipmentSection() {
	const { rental } = useRentalDetailContext();
	const [isAccessorySheetOpen, setIsAccessorySheetOpen] = useState(false);
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

	return (
		<div className="space-y-8">
			<RentalAccessoryAssignmentSheet
				open={isAccessorySheetOpen}
				onOpenChange={setIsAccessorySheetOpen}
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
	removeDisabledReason,
}: {
	selection: RentalDetailViewSelectionDto;
	onEditQuantity?: () => void;
	onRemove?: () => void;
	onReplaceAssignedAsset?: (assetId: string) => void;
	removeDisabledReason: string | null;
	accessoriesByEquipmentLine: Map<
		string,
		GetRentalDetailViewResponseDto["accessories"]
	>;
}) {
	const isPackage = selection.rentableItemKind !== "SINGLE";
	const singleDemandLine = selection.demandLines[0];
	const accessories = singleDemandLine
		? (accessoriesByEquipmentLine.get(singleDemandLine.id) ?? [])
		: [];
	const owners = singleDemandLine
		? getAssetOwners(singleDemandLine.assignedAssets)
		: [];

	return (
		<div className="@container/equipment-card min-w-0 rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-neutral-300 @sm/equipment-card:p-4">
			<div className="flex min-w-0 items-start gap-3 @md/equipment-card:gap-4">
				<ProductImage imageUrl={selection.rentableItem?.imageUrl ?? null} />
				<div className="min-w-0 flex-1 space-y-2">
					<div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-1">
						<span className="min-w-0 flex-1 break-words font-semibold leading-snug text-neutral-950">
							{selection.rentableItemName}
						</span>
						<div className="flex shrink-0 items-center">
							{onEditQuantity ? (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-6 text-neutral-500"
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
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<QuantityText quantity={selection.quantity} />
						<span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-[11px] text-neutral-600">
							{isPackage ? "Combo" : "Equipo"}
						</span>
					</div>
					{!isPackage ? (
						<div className="space-y-2">
							<div className="space-y-0.5">
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
							<div className="space-y-1.5">
								<p className="text-neutral-400 text-xs">Nº de serie</p>
								<AssignedAssetsList
									assignments={singleDemandLine?.assignedAssets ?? []}
									onReplace={onReplaceAssignedAsset}
								/>
							</div>
						</div>
					) : null}
				</div>
			</div>
			{isPackage ? (
				<RentalPackageChildrenList
					accessoriesByEquipmentLine={accessoriesByEquipmentLine}
					items={selection.demandLines}
					onReplaceAssignedAsset={onReplaceAssignedAsset}
				/>
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
}: {
	items: RentalDetailViewDemandLineDto[];
	onReplaceAssignedAsset?: (assetId: string) => void;
	accessoriesByEquipmentLine: Map<
		string,
		GetRentalDetailViewResponseDto["accessories"]
	>;
}) {
	return (
		<div className="mt-4 min-w-0 border-neutral-100 border-t pt-3">
			<p className="mb-2 font-semibold text-[11px] text-neutral-400 uppercase tracking-wide">
				Equipos del combo
			</p>
			<div className="space-y-2">
				{items.map((child) => (
					<RentalPackageChildRow
						key={child.id}
						accessories={accessoriesByEquipmentLine.get(child.id) ?? []}
						equipment={child}
						onReplaceAssignedAsset={onReplaceAssignedAsset}
					/>
				))}
			</div>
		</div>
	);
}

function RentalPackageChildRow({
	equipment,
	accessories,
	onReplaceAssignedAsset,
}: {
	equipment: RentalDetailViewDemandLineDto;
	accessories: GetRentalDetailViewResponseDto["accessories"];
	onReplaceAssignedAsset?: (assetId: string) => void;
}) {
	const owners = getAssetOwners(equipment.assignedAssets);

	return (
		<div className="@container/package-child min-w-0 rounded-lg border border-neutral-100 bg-neutral-50 px-2.5 py-2 @sm/package-child:px-3">
			<div className="grid min-w-0 gap-3 @md/package-child:grid-cols-[minmax(0,1fr)_auto] @md/package-child:items-center">
				<div className="flex min-w-0 items-start gap-3">
					<ProductImage imageUrl={null} variant="compact" />
					<div className="min-w-0 space-y-0.5">
						<p className="break-words font-medium text-neutral-800 text-sm">
							{equipment.equipmentTypeName}
						</p>
						<QuantityText quantity={equipment.quantity} compact />
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
				</div>
				<div className="min-w-0 space-y-1 @md/package-child:justify-self-end">
					<AssignedAssetsList
						assignments={equipment.assignedAssets}
						onReplace={onReplaceAssignedAsset}
						compact
					/>
				</div>
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
				"border-neutral-100 border-t",
				variant === "default" ? "mt-4 pt-3" : "mt-3 pt-2",
			)}
		>
			<p
				className={cn(
					"font-semibold text-[11px] text-neutral-400 uppercase tracking-wide",
					variant === "default" ? "mb-2" : "mb-1.5",
				)}
			>
				{variant === "default" ? "Accesorios asignados" : "Accesorios"}
			</p>
			{accessories.length > 0 ? (
				<div
					className={cn(variant === "default" ? "space-y-2" : "space-y-1.5")}
				>
					{accessories.map((accessory) => (
						<RentalAccessoryRow
							key={accessory.id}
							accessory={accessory}
							variant={variant}
						/>
					))}
				</div>
			) : (
				<div
					className={cn(
						"rounded-lg border border-dashed border-neutral-200 bg-neutral-50 text-neutral-400 text-xs",
						variant === "default" ? "px-3 py-2" : "px-2.5 py-1.5",
					)}
				>
					Sin accesorios asignados
				</div>
			)}
		</div>
	);
}

function RentalAccessoryRow({
	accessory,
	variant = "default",
}: {
	accessory: GetRentalDetailViewResponseDto["accessories"][number];
	variant?: "default" | "compact";
}) {
	const serials = getAssetSerials(accessory.assignedAssets);
	const missingAssetIds = getMissingAssetIds(accessory.assignedAssets);

	return (
		<div
			className={cn(
				"@container/accessory-row grid min-w-0 gap-2 rounded-lg border @md/accessory-row:grid-cols-[minmax(0,1fr)_auto] @md/accessory-row:items-center @md/accessory-row:gap-3",
				variant === "default"
					? "border-neutral-100 bg-neutral-50 px-2.5 py-2 @sm/accessory-row:px-3"
					: "border-neutral-200/70 bg-white/70 px-2.5 py-1.5",
			)}
		>
			<div className="flex min-w-0 items-start gap-3">
				<div
					className={cn(
						"flex shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white",
						variant === "default" ? "size-10" : "size-8",
					)}
				>
					<Package
						className={cn(
							"text-neutral-300",
							variant === "default" ? "size-4" : "size-3.5",
						)}
					/>
				</div>
				<div className="min-w-0">
					<p
						className={cn(
							"break-words font-medium text-neutral-800",
							variant === "default" ? "text-sm" : "text-xs",
						)}
					>
						{accessory.equipmentTypeName}
					</p>
					<QuantityText quantity={accessory.quantity} compact />
				</div>
			</div>
			<div className="min-w-0 space-y-1 @md/accessory-row:justify-self-end">
				{serials.length > 0 ? (
					<SerialChips serials={serials} maxVisible={3} />
				) : (
					<span className="font-mono text-[11px] text-neutral-400">
						Sin serie
					</span>
				)}
				<MissingAssetsFeedback assetIds={missingAssetIds} />
			</div>
		</div>
	);
}

function UnlinkedAccessoriesCard({
	accessories,
}: {
	accessories: GetRentalDetailViewResponseDto["accessories"];
}) {
	return (
		<div className="min-w-0 rounded-xl border border-amber-200 bg-amber-50/60 p-3 @sm/rental-detail:p-4">
			<p className="mb-3 font-semibold text-amber-900 text-xs">
				Accesorios sin equipo asociado
			</p>
			<div className="space-y-2">
				{accessories.map((accessory) => (
					<RentalAccessoryRow key={accessory.id} accessory={accessory} />
				))}
			</div>
		</div>
	);
}

function AssignedAssetsList({
	assignments,
	onReplace,
	compact = false,
}: {
	assignments: RentalDetailViewDemandLineDto["assignedAssets"];
	onReplace?: (assetId: string) => void;
	compact?: boolean;
}) {
	if (assignments.length === 0) {
		return (
			<span className="font-mono text-[11px] text-neutral-400">
				Sin assets asignadas
			</span>
		);
	}

	return (
		<div className="min-w-0 space-y-1.5">
			{assignments.map((assignment) => {
				const label = assignment.asset?.serialNumber?.trim();
				const isIdentifiable = label !== undefined;

				return (
					<div
						key={assignment.assetId}
						className="flex min-w-0 flex-wrap items-center justify-between gap-2"
					>
						<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
							{isIdentifiable && (
								<span className="max-w-full break-all rounded-sm border border-neutral-200 bg-white px-2 py-0.5 font-mono font-semibold text-neutral-600 text-xs">
									{label}
								</span>
							)}
							{assignment.isMissing ? (
								<span className="text-amber-700 text-[11px]">
									Asset no encontrado
								</span>
							) : null}
						</div>
						{onReplace && isIdentifiable ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className={cn(
									"h-7 px-2 text-neutral-600 text-xs",
									compact && "h-6",
								)}
								onClick={() => onReplace(assignment.assetId)}
							>
								<RefreshCw className="size-3" />
								Reemplazar
							</Button>
						) : null}
					</div>
				);
			})}
		</div>
	);
}

function SerialChips({
	serials,
	maxVisible,
}: {
	serials: string[];
	maxVisible: number;
}) {
	const visibleSerials = serials.slice(0, maxVisible);
	const hiddenCount = serials.length - visibleSerials.length;

	return (
		<div className="flex min-w-0 flex-wrap gap-1.5">
			{visibleSerials.map((serial) => (
				<span
					key={serial}
					className="max-w-full break-all rounded-sm border border-neutral-200 bg-white px-2 py-0.5 font-mono font-semibold text-neutral-600 text-xs"
				>
					{serial}
				</span>
			))}
			{hiddenCount > 0 ? (
				<span className="rounded-sm border border-neutral-200 bg-white px-2 py-0.5 font-medium text-[11px] text-neutral-500">
					+{hiddenCount} más
				</span>
			) : null}
		</div>
	);
}

function ProductImage({
	imageUrl,
	variant = "default",
}: {
	imageUrl: string | null;
	variant?: "default" | "compact";
}) {
	const publicImageUrl = buildR2PublicUrl(imageUrl, "catalog");
	const sizeClassName =
		variant === "default" ? "size-14 @md/equipment-card:size-18" : "size-10";
	const iconClassName =
		variant === "default" ? "size-5 @md/equipment-card:size-6" : "size-4";

	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100",
				sizeClassName,
			)}
		>
			{publicImageUrl ? (
				<img
					alt=""
					className="h-full w-full object-cover"
					src={publicImageUrl}
				/>
			) : (
				<Package className={cn("text-neutral-300", iconClassName)} />
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

function QuantityText({
	quantity,
	compact = false,
}: {
	quantity: number;
	compact?: boolean;
}) {
	return (
		<div
			className={
				compact
					? "font-medium text-[11px] text-neutral-400"
					: "font-semibold text-neutral-400 text-xs"
			}
		>
			{compact ? null : <span>Cantidad: </span>}
			<span className={compact ? "" : "text-sm text-neutral-500"}>
				{quantity}
			</span>{" "}
			<span className={compact ? "" : "text-neutral-500"}>
				{quantity > 1 ? "unidades" : "unidad"}
			</span>
		</div>
	);
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
