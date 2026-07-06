import type {
	GetRentalDetailEquipmentLineDto,
	GetRentalDetailResponseDto,
} from "@repo/api-contracts";
import { Clock, Package, User2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRentalDetailContext } from "../rental-detail.context";
import {
	formatRentalDetailDateTime,
	isNonEmptyString,
} from "../rental-detail.utils";
import { RentalAccessoryAssignmentSheet } from "./rental-accessory-assignment-sheet";

export function RentalEquipmentSection() {
	const { rental } = useRentalDetailContext();
	const [isAccessorySheetOpen, setIsAccessorySheetOpen] = useState(false);
	const rentalEquipment = mapEquipmentsToCardItems(rental.equipment);
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
			<div>
				<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<h2 className="text-sm font-semibold text-neutral-950">
						Equipos y accesorios
					</h2>
					<Button
						type="button"
						variant="outline"
						onClick={() => setIsAccessorySheetOpen(true)}
					>
						Asignar accesorios
					</Button>
				</div>
				<section className="mb-10 space-y-3">
					{rentalEquipment.map((item) => (
						<RentalEquipmentCard
							key={item.rentalSelectionId}
							equipment={item}
							accessoriesByEquipmentLine={accessoriesByEquipmentLine}
						/>
					))}
					{unlinkedAccessories.length > 0 ? (
						<UnlinkedAccessoriesCard accessories={unlinkedAccessories} />
					) : null}
				</section>
			</div>
			<ActivityLog />
		</div>
	);
}

type EquipmentCardItem = {
	rentalSelectionId: string;
	rentableItemId: string;
	rentableItemName: string;
	quantity: number;
	children: GetRentalDetailEquipmentLineDto[];
};

function mapEquipmentsToCardItems(
	equipments: GetRentalDetailEquipmentLineDto[],
): EquipmentCardItem[] {
	const cardsBySelectionId = new Map<string, EquipmentCardItem>();

	for (const equipment of equipments) {
		const existingCard = cardsBySelectionId.get(equipment.rentalSelectionId);

		if (existingCard) {
			existingCard.children.push(equipment);
			continue;
		}

		cardsBySelectionId.set(equipment.rentalSelectionId, {
			rentalSelectionId: equipment.rentalSelectionId,
			rentableItemId: equipment.rentableItemId,
			rentableItemName: equipment.rentableItemName,
			quantity: equipment.quantity,
			children: [equipment],
		});
	}

	return Array.from(cardsBySelectionId.values());
}

function RentalEquipmentCard({
	equipment,
	accessoriesByEquipmentLine,
}: {
	equipment: EquipmentCardItem;
	accessoriesByEquipmentLine: Map<
		string,
		GetRentalDetailResponseDto["accessories"]
	>;
}) {
	const isPackage = equipment.children.length > 1;
	const primaryEquipment = equipment.children[0];
	const accessories = primaryEquipment
		? (accessoriesByEquipmentLine.get(primaryEquipment.id) ?? [])
		: [];
	const owners = primaryEquipment
		? getAssetOwners(primaryEquipment.assignedAssets)
		: [];
	const serials = primaryEquipment
		? getAssetSerials(primaryEquipment.assignedAssets)
		: [];

	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300">
			<div className="grid gap-4 sm:grid-cols-[1fr_auto]">
				<div className="flex gap-4">
					<div className="flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
						<Package className="size-6 text-neutral-300" />
					</div>
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="font-semibold leading-snug text-neutral-950">
							{equipment.rentableItemName}
						</span>
						<QuantityText quantity={equipment.quantity} />
						{!isPackage
							? owners.map((owner) => (
									<span
										key={owner}
										className="flex items-center gap-1 text-[11px] text-neutral-500"
									>
										<User2Icon className="size-3 shrink-0" />
										{owner}
									</span>
								))
							: null}
						{!isPackage ? (
							<div className="mt-2 space-y-1.5">
								<p className="text-neutral-400 text-xs">Nº de serie</p>
								{serials.length > 0 ? (
									<SerialChips serials={serials} maxVisible={serials.length} />
								) : (
									<span className="font-mono text-[11px] text-neutral-400">
										Sin assets asignadas
									</span>
								)}
							</div>
						) : null}
					</div>
				</div>
				<div className="flex items-start justify-end">
					<span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-[11px] text-neutral-600">
						{isPackage ? "Paquete" : "Equipo"}
					</span>
				</div>
			</div>
			{isPackage ? (
				<RentalPackageChildrenList
					accessoriesByEquipmentLine={accessoriesByEquipmentLine}
					items={equipment.children}
				/>
			) : null}
			{!isPackage && accessories.length > 0 ? (
				<RentalAccessoriesList accessories={accessories} />
			) : null}
		</div>
	);
}

function RentalPackageChildrenList({
	items,
	accessoriesByEquipmentLine,
}: {
	items: GetRentalDetailEquipmentLineDto[];
	accessoriesByEquipmentLine: Map<
		string,
		GetRentalDetailResponseDto["accessories"]
	>;
}) {
	return (
		<div className="mt-4 border-neutral-100 border-t pt-3">
			<p className="mb-2 font-semibold text-[11px] text-neutral-400 uppercase tracking-wide">
				Equipos del paquete
			</p>
			<div className="space-y-2">
				{items.map((child) => (
					<RentalPackageChildRow
						key={child.id}
						accessories={accessoriesByEquipmentLine.get(child.id) ?? []}
						equipment={child}
					/>
				))}
			</div>
		</div>
	);
}

function RentalPackageChildRow({
	equipment,
	accessories,
}: {
	equipment: GetRentalDetailEquipmentLineDto;
	accessories: GetRentalDetailResponseDto["accessories"];
}) {
	const owners = getAssetOwners(equipment.assignedAssets);
	const serials = getAssetSerials(equipment.assignedAssets);

	return (
		<div className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
			<div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
				<div className="flex min-w-0 items-start gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white">
						<Package className="size-4 text-neutral-300" />
					</div>
					<div className="min-w-0 space-y-0.5">
						<p className="truncate font-medium text-neutral-800 text-sm">
							{equipment.equipmentTypeName}
						</p>
						<QuantityText quantity={equipment.quantity} compact />
						{owners.map((owner) => (
							<span
								key={owner}
								className="flex items-center gap-1 text-[11px] text-neutral-500"
							>
								<User2Icon className="size-3 shrink-0" />
								{owner}
							</span>
						))}
					</div>
				</div>
				<div className="sm:justify-self-end">
					{serials.length > 0 ? (
						<SerialChips serials={serials} maxVisible={3} />
					) : (
						<span className="font-mono text-[11px] text-neutral-400">
							Sin serie
						</span>
					)}
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
	accessories: GetRentalDetailResponseDto["accessories"];
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
	accessory: GetRentalDetailResponseDto["accessories"][number];
	variant?: "default" | "compact";
}) {
	const serials = getAssetSerials(accessory.assignedAssets);

	return (
		<div
			className={cn(
				"grid gap-3 rounded-lg border sm:grid-cols-[1fr_auto] sm:items-center",
				variant === "default"
					? "border-neutral-100 bg-neutral-50 px-3 py-2"
					: "border-neutral-200/70 bg-white/70 px-2.5 py-1.5",
			)}
		>
			<div className="flex min-w-0 items-center gap-3">
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
							"truncate font-medium text-neutral-800",
							variant === "default" ? "text-sm" : "text-xs",
						)}
					>
						{accessory.equipmentTypeName}
					</p>
					<QuantityText quantity={accessory.quantity} compact />
				</div>
			</div>
			<div className="sm:justify-self-end">
				{serials.length > 0 ? (
					<SerialChips serials={serials} maxVisible={3} />
				) : (
					<span className="font-mono text-[11px] text-neutral-400">
						Sin serie
					</span>
				)}
			</div>
		</div>
	);
}

function UnlinkedAccessoriesCard({
	accessories,
}: {
	accessories: GetRentalDetailResponseDto["accessories"];
}) {
	return (
		<div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
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
		<div className="flex flex-wrap gap-1.5">
			{visibleSerials.map((serial) => (
				<span
					key={serial}
					className="rounded-sm border border-neutral-200 bg-white px-2 py-0.5 font-mono font-semibold text-neutral-600 text-xs"
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
	accessories: GetRentalDetailResponseDto["accessories"],
) {
	const groups = new Map<string, GetRentalDetailResponseDto["accessories"]>();

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
	assets: GetRentalDetailResponseDto["equipment"][number]["assignedAssets"],
) {
	return [
		...new Set(
			assets.map((asset) => asset.owner?.name).filter(isNonEmptyString),
		),
	];
}

function getAssetSerials(
	assets: GetRentalDetailResponseDto["equipment"][number]["assignedAssets"],
) {
	return assets.map((asset) => asset.serialNumber).filter(isNonEmptyString);
}

function ActivityLog() {
	const { rental } = useRentalDetailContext();
	return (
		<section>
			<div className="flex items-center gap-2 mb-5">
				<Clock className="w-4 h-4 text-neutral-400" />
				<span className="text-sm font-semibold text-neutral-950">
					Activity Log
				</span>
			</div>
			<ActivityEntry
				label="Pedido creado"
				timestamp={formatRentalDetailDateTime(rental.createdAt)}
			/>
			{rental.confirmedAt ? (
				<ActivityEntry
					label="Pedido confirmado"
					timestamp={formatRentalDetailDateTime(rental.confirmedAt)}
				/>
			) : null}
			{rental.cancelledAt ? (
				<ActivityEntry
					label="Pedido cancelado"
					timestamp={formatRentalDetailDateTime(rental.cancelledAt)}
				/>
			) : null}
		</section>
	);
}

function ActivityEntry({
	label,
	timestamp,
}: {
	label: string;
	timestamp: string;
}) {
	return (
		<div className="flex items-start gap-4">
			<div className="flex flex-col items-center shrink-0 pt-1">
				<div className="w-8 h-8 rounded-full bg-neutral-950 flex items-center justify-center">
					<Clock className="w-3.5 h-3.5 text-white" />
				</div>
			</div>
			<div className="flex flex-col gap-0.5 pb-6">
				<span className="text-sm font-semibold text-neutral-950">{label}</span>
				<span className="text-xs text-neutral-400">{timestamp} · System</span>
			</div>
		</div>
	);
}
