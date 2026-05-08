import type { OrderAccessoryPreparationResponseDto } from "@repo/schemas";
import { AlertTriangle, Minus, Package, Plus, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAccessoryPreparationForm } from "../hooks/use-accessory-preparation-form";
import type {
	AccessoryPreparationAccessoryFormValues,
	AccessoryPreparationItemFormValues,
} from "../schemas/accessory-preparation-form.schema";
import { getAssetLabel } from "../schemas/accessory-preparation-form.schema";

type AccessoryPreparationWorkspaceProps = {
	orderId: string;
	preparation: OrderAccessoryPreparationResponseDto;
	productImagesByOrderItemId: Record<string, string | null>;
	onClose: () => void;
};

type AccessoryPreparationFormState = ReturnType<
	typeof useAccessoryPreparationForm
>;

const formId = "accessory-preparation-form";

export function AccessoryPreparationWorkspace({
	orderId,
	preparation,
	productImagesByOrderItemId,
	onClose,
}: AccessoryPreparationWorkspaceProps) {
	const preparationForm = useAccessoryPreparationForm({ orderId, preparation });
	const items = preparationForm.values.items;
	const [selectedOrderItemId, setSelectedOrderItemId] = useState<string | null>(
		items[0]?.orderItemId ?? null,
	);
	const selectedItemIndex = Math.max(
		0,
		items.findIndex((item) => item.orderItemId === selectedOrderItemId),
	);
	const selectedItem = items[selectedItemIndex] ?? null;
	const hasProductItems = items.length > 0;

	return (
		<form
			id={formId}
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				preparationForm.form.handleSubmit();
			}}
		>
			<div className="mb-5 flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400">
						Asignacion de accesorios
					</p>
					<h2 className="mt-1 text-xl font-semibold text-neutral-950">
						Preparar accesorios del pedido
					</h2>
					<p className="mt-1 max-w-2xl text-sm text-neutral-500">
						Selecciona un producto y ajusta los accesorios vinculados.
					</p>
					{preparationForm.submitErrorMessage ? (
						<p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{preparationForm.submitErrorMessage}
						</p>
					) : null}
				</div>

				<div className="flex flex-col gap-2 sm:flex-row">
					<Button type="button" variant="outline" onClick={onClose}>
						Volver al detalle
					</Button>
					<preparationForm.form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<Button
								type="submit"
								disabled={
									!hasProductItems ||
									!canSubmit ||
									isSubmitting ||
									preparationForm.isPending
								}
							>
								<Save className="size-4" />
								{isSubmitting || preparationForm.isPending
									? "Guardando..."
									: "Guardar preparacion"}
							</Button>
						)}
					</preparationForm.form.Subscribe>
				</div>
			</div>

			{hasProductItems ? (
				<div className="grid gap-5 xl:grid-cols-[400px_1fr]">
					<ProductSelectionRail
						items={items}
						productImagesByOrderItemId={productImagesByOrderItemId}
						selectedOrderItemId={selectedItem?.orderItemId ?? null}
						onSelect={setSelectedOrderItemId}
					/>

					{selectedItem ? (
						<AccessoryAssignmentPanel
							formState={preparationForm}
							item={selectedItem}
							itemIndex={selectedItemIndex}
						/>
					) : null}
				</div>
			) : (
				<AccessoryPreparationEmptyState />
			)}
		</form>
	);
}

function ProductSelectionRail({
	items,
	productImagesByOrderItemId,
	selectedOrderItemId,
	onSelect,
}: {
	items: AccessoryPreparationItemFormValues[];
	productImagesByOrderItemId: Record<string, string | null>;
	selectedOrderItemId: string | null;
	onSelect: (orderItemId: string) => void;
}) {
	return (
		<Card className="gap-0 border-neutral-200 bg-white py-0 shadow-none">
			<CardHeader className="border-b border-neutral-100 px-4 py-3">
				<CardTitle>Productos del pedido ({items.length})</CardTitle>
				<CardDescription>
					Selecciona un producto para revisar sus accesorios.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-2.5 px-3 py-3">
				{items.map((item) => {
					const selectedCount = getSelectedAccessoryCount(item);
					const isSelected = item.orderItemId === selectedOrderItemId;
					const productImage = productImagesByOrderItemId[item.orderItemId];

					return (
						<button
							key={item.orderItemId}
							type="button"
							onClick={() => onSelect(item.orderItemId)}
							className={cn(
								"rounded-xl border bg-white p-3 text-left transition-colors hover:border-neutral-400",
								isSelected
									? "border-neutral-950 ring-1 ring-neutral-950"
									: "border-neutral-200",
							)}
						>
							<div className="flex items-start gap-3">
								<div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
									{productImage ? (
										<img
											src={productImage}
											alt={item.productTypeName}
											loading="lazy"
											decoding="async"
											className="h-full w-full object-cover"
										/>
									) : (
										<Package className="size-5 text-neutral-400" />
									)}
								</div>
								<div className="min-w-0 flex-1">
									<p className="line-clamp-2 text-sm font-semibold text-neutral-950">
										{item.productTypeName}
									</p>
									<AssignedPrimaryAssets
										assets={item.assignedPrimaryAssets}
										compact
									/>
								</div>
							</div>

							<div className="mt-2 flex justify-end">
								<span className="text-xs font-medium text-neutral-500">
									{selectedCount} / {item.accessories.length} incluidos
								</span>
							</div>
						</button>
					);
				})}
			</CardContent>
		</Card>
	);
}

function AccessoryAssignmentPanel({
	formState,
	item,
	itemIndex,
}: {
	formState: AccessoryPreparationFormState;
	item: AccessoryPreparationItemFormValues;
	itemIndex: number;
}) {
	const selectedCount = getSelectedAccessoryCount(item);
	const omittedCount = item.accessories.length - selectedCount;
	const defaultIncludedCount = item.accessories.filter(
		(accessory) => accessory.isDefaultIncluded,
	).length;

	return (
		<Card className="gap-0 border-neutral-200 bg-white py-0 shadow-none">
			<CardHeader className="px-5 py-3">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<CardTitle>Accesorios sugeridos</CardTitle>
						<CardDescription>
							Revisa y ajusta los accesorios para el producto seleccionado.
						</CardDescription>
					</div>
					<div className="grid grid-cols-3 overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm">
						<SummaryStat label="Incluidos" value={selectedCount} />
						<SummaryStat label="Omitidos" value={omittedCount} />
						<SummaryStat label="Por defecto" value={defaultIncludedCount} />
					</div>
				</div>
			</CardHeader>

			<CardContent className="px-5 pt-1 pb-4">
				{item.accessories.length > 0 ? (
					<div className="overflow-hidden rounded-xl border border-neutral-200">
						<div className="hidden grid-cols-[1fr_140px_170px] border-b border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400 lg:grid">
							<span>Accesorio</span>
							<span>Origen</span>
							<span className="text-right">Asignado</span>
						</div>

						{item.accessories.map((accessory, accessoryIndex) => (
							<CompatibleAccessoryRow
								accessory={accessory}
								accessoryIndex={accessoryIndex}
								formState={formState}
								itemIndex={itemIndex}
								key={accessory.accessoryRentalItemId}
							/>
						))}
					</div>
				) : (
					<p className="rounded-lg border border-dashed border-neutral-200 px-4 py-5 text-sm text-neutral-500">
						No hay accesorios compatibles sugeridos para este producto.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function CompatibleAccessoryRow({
	accessory,
	accessoryIndex,
	formState,
	itemIndex,
}: {
	accessory: AccessoryPreparationAccessoryFormValues;
	accessoryIndex: number;
	formState: AccessoryPreparationFormState;
	itemIndex: number;
}) {
	const selectedAssets = accessory.assignedAssets.filter((asset) =>
		accessory.selectedAssetIds.includes(asset.id),
	);
	const shouldShowAvailabilityWarning =
		accessory.selected &&
		(accessory.quantity > accessory.availableCount ||
			(accessory.suggestedQuantity !== null &&
				accessory.availableCount < accessory.suggestedQuantity));

	return (
		<div
			className={cn(
				"grid gap-4 border-b border-neutral-100 px-4 py-4 last:border-b-0 lg:grid-cols-[1fr_140px_170px] lg:items-start",
				accessory.selected ? "bg-white" : "bg-neutral-50/70",
			)}
		>
			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm font-semibold text-neutral-950">
						{accessory.name}
					</span>
					{accessory.saved ? (
						<span className="rounded-full bg-neutral-950 px-2 py-0.5 text-[11px] font-medium text-white">
							Guardado
						</span>
					) : null}
				</div>

				<div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500 lg:hidden">
					<AccessoryOriginBadge accessory={accessory} />
					<span>{accessory.availableCount} disponibles</span>
				</div>

				{shouldShowAvailabilityWarning ? (
					<p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
						<AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
						La cantidad supera los accesorios disponibles. El backend validara
						la disponibilidad final al guardar.
					</p>
				) : null}

				<AssignedAccessoryAssets
					accessory={accessory}
					selectedAssets={selectedAssets}
				/>
			</div>

			<div className="hidden lg:block">
				<AccessoryOriginBadge accessory={accessory} />
				<p className="mt-2 text-xs text-neutral-500">
					{accessory.availableCount} disponibles
				</p>
			</div>

			<QuantityStepper
				accessory={accessory}
				accessoryIndex={accessoryIndex}
				formState={formState}
				itemIndex={itemIndex}
			/>
		</div>
	);
}

function QuantityStepper({
	accessory,
	accessoryIndex,
	formState,
	itemIndex,
}: {
	accessory: AccessoryPreparationAccessoryFormValues;
	accessoryIndex: number;
	formState: AccessoryPreparationFormState;
	itemIndex: number;
}) {
	const minimumQuantity = Math.max(1, accessory.selectedAssetIds.length);
	const assignedQuantity = accessory.selected ? accessory.quantity : 0;

	function handleDecrease() {
		if (!accessory.selected) {
			return;
		}

		if (accessory.quantity <= minimumQuantity) {
			formState.setAccessorySelected(itemIndex, accessoryIndex, false);
			return;
		}

		formState.setAccessoryQuantity(
			itemIndex,
			accessoryIndex,
			accessory.quantity - 1,
		);
	}

	function handleIncrease() {
		if (!accessory.selected) {
			formState.setAccessorySelected(itemIndex, accessoryIndex, true);
			formState.setAccessoryQuantity(itemIndex, accessoryIndex, 1);
			return;
		}

		formState.setAccessoryQuantity(
			itemIndex,
			accessoryIndex,
			accessory.quantity + 1,
		);
	}

	return (
		<div className="flex items-center justify-between gap-3 lg:justify-end">
			<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400 lg:hidden">
				Asignado
			</span>
			<div className="inline-flex overflow-hidden rounded-lg border border-neutral-200 bg-white">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-9 rounded-none"
					disabled={!accessory.selected}
					onClick={handleDecrease}
				>
					<Minus className="size-4" />
					<span className="sr-only">
						{assignedQuantity <= minimumQuantity
							? "Omitir accesorio"
							: "Restar cantidad"}
					</span>
				</Button>
				<span className="flex h-9 min-w-12 items-center justify-center border-x border-neutral-200 px-3 text-sm font-semibold text-neutral-950">
					{assignedQuantity}
				</span>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-9 rounded-none"
					onClick={handleIncrease}
				>
					<Plus className="size-4" />
					<span className="sr-only">
						{accessory.selected ? "Sumar cantidad" : "Anadir accesorio"}
					</span>
				</Button>
			</div>
		</div>
	);
}

function AssignedAccessoryAssets({
	accessory,
	selectedAssets,
}: {
	accessory: AccessoryPreparationAccessoryFormValues;
	selectedAssets: AccessoryPreparationAccessoryFormValues["assignedAssets"];
}) {
	if (!accessory.selected || selectedAssets.length === 0) {
		return null;
	}

	return (
		<div className="mt-3 flex flex-wrap gap-2">
			{selectedAssets.map((asset) => (
				<span
					key={asset.id}
					className="inline-flex items-center rounded-full border border-dashed border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-800"
				>
					{getAssetLabel(asset)}
				</span>
			))}
		</div>
	);
}

function AssignedPrimaryAssets({
	assets,
	compact = false,
}: {
	assets: AccessoryPreparationItemFormValues["assignedPrimaryAssets"];
	compact?: boolean;
}) {
	if (assets.length === 0) {
		return (
			<p className="mt-2 text-xs text-neutral-500">
				Sin assets primarios asignados.
			</p>
		);
	}

	return (
		<div className={cn("mt-2 flex flex-wrap gap-1.5", compact && "gap-1")}>
			{assets.map((asset) => (
				<span
					key={asset.id}
					className="rounded-sm border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs text-neutral-600 font-semibold"
				>
					{getAssetLabel(asset)}
				</span>
			))}
		</div>
	);
}

function AccessoryOriginBadge({
	accessory,
}: {
	accessory: AccessoryPreparationAccessoryFormValues;
}) {
	return accessory.isDefaultIncluded ? (
		<span className="inline-flex rounded-full bg-neutral-950 px-2 py-0.5 text-[11px] font-medium text-white">
			Sugerido
		</span>
	) : (
		<span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
			Opcional
		</span>
	);
}

function SummaryStat({ label, value }: { label: string; value: number }) {
	return (
		<div className="min-w-24 border-r border-neutral-200 px-4 py-3 last:border-r-0">
			<p className="text-xs text-neutral-500">{label}</p>
			<p className="mt-1 text-xl font-semibold text-neutral-950">{value}</p>
		</div>
	);
}

function AccessoryPreparationEmptyState() {
	return (
		<section className="flex min-h-90 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center">
			<div className="max-w-md">
				<div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
					<Package className="size-7" />
				</div>
				<h2 className="mt-5 text-lg font-semibold text-neutral-950">
					No hay items de producto para preparar
				</h2>
				<p className="mt-2 text-sm text-neutral-500">
					Solo los items de producto pueden recibir accesorios. Este pedido no
					incluye productos preparados individualmente.
				</p>
			</div>
		</section>
	);
}

function getSelectedAccessoryCount(item: AccessoryPreparationItemFormValues) {
	return item.accessories.filter((accessory) => accessory.selected).length;
}
