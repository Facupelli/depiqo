import type { OrderAccessoryPreparationResponseDto } from "@repo/schemas";
import { Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	Package,
	Save,
	ShieldCheck,
	Wrench,
	X,
} from "lucide-react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatOrderNumber } from "@/features/orders/order.utils";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";
import { useAccessoryPreparationForm } from "../hooks/use-accessory-preparation-form";
import type {
	AccessoryPreparationAccessoryFormValues,
	AccessoryPreparationItemFormValues,
} from "../schemas/accessory-preparation-form.schema";
import { getAssetLabel } from "../schemas/accessory-preparation-form.schema";

type AccessoryPreparationPageProps = {
	order: ParsedOrderDetailResponseDto;
	orderId: string;
	preparation: OrderAccessoryPreparationResponseDto;
};

type AccessoryPreparationFormState = ReturnType<
	typeof useAccessoryPreparationForm
>;

const formId = "accessory-preparation-form";

export function AccessoryPreparationPage({
	order,
	orderId,
	preparation,
}: AccessoryPreparationPageProps) {
	const preparationForm = useAccessoryPreparationForm({ orderId, preparation });
	const hasProductItems = preparationForm.values.items.length > 0;

	return (
		<div className="min-h-screen bg-neutral-50 px-6 pb-10 text-neutral-950 lg:px-8">
			<AccessoryPreparationBreadcrumb
				orderId={orderId}
				orderNumber={order.number}
			/>

			<form
				id={formId}
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					preparationForm.form.handleSubmit();
				}}
			>
				<header className="flex flex-col gap-5 border-b border-neutral-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="max-w-3xl">
						<div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-500">
							<Wrench className="size-4" />
							<span>Preparacion de accesorios</span>
						</div>
						<h1 className="text-3xl font-bold tracking-tight">
							Preparar accesorios
						</h1>
						<p className="mt-2 text-sm text-neutral-500">
							Revisa los items de producto del pedido y sus accesorios compatibles
							antes de guardar asignaciones.
						</p>
						{preparationForm.submitErrorMessage ? (
							<p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
								{preparationForm.submitErrorMessage}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
						<Button
							variant="outline"
							nativeButton={false}
							render={
								<Link to="/dashboard/orders/$orderId" params={{ orderId }}>
									<ArrowLeft className="size-4" />
									Cancelar
								</Link>
							}
						/>
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
				</header>

				<main className="py-8">
					{hasProductItems ? (
						<div className="grid gap-5">
							{preparationForm.values.items.map((item, itemIndex) => (
								<PreparationItemCard
									formState={preparationForm}
									item={item}
									itemIndex={itemIndex}
									key={item.orderItemId}
								/>
							))}
						</div>
					) : (
						<AccessoryPreparationEmptyState />
					)}
				</main>
			</form>
		</div>
	);
}

function AccessoryPreparationBreadcrumb({
	orderId,
	orderNumber,
}: {
	orderId: string;
	orderNumber: number;
}) {
	return (
		<Breadcrumb className="py-6">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink render={<Link to="/dashboard/orders">Pedidos</Link>} />
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink
						render={
							<Link to="/dashboard/orders/$orderId" params={{ orderId }}>
								#{formatOrderNumber(orderNumber)}
							</Link>
						}
					/>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbPage>Preparar accesorios</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}

function AccessoryPreparationEmptyState() {
	return (
		<section className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center">
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

function PreparationItemCard({
	formState,
	item,
	itemIndex,
}: {
	formState: AccessoryPreparationFormState;
	item: AccessoryPreparationItemFormValues;
	itemIndex: number;
}) {
	const selectedCount = item.accessories.filter(
		(accessory) => accessory.selected,
	).length;

	return (
		<section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
			<div className="flex flex-col gap-4 border-b border-neutral-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400">
						Item de producto
					</p>
					<h2 className="mt-1 text-xl font-semibold text-neutral-950">
						{item.productTypeName}
					</h2>
					<AssignedPrimaryAssets assets={item.assignedPrimaryAssets} />
				</div>

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					<SummaryPill label="Compatibles" value={item.accessories.length} />
					<SummaryPill label="Seleccionados" value={selectedCount} />
					<SummaryPill
						label="Assets primarios"
						value={item.assignedPrimaryAssets.length}
					/>
				</div>
			</div>

			<div className="mt-5 grid gap-3">
				{item.accessories.length > 0 ? (
					item.accessories.map((accessory, accessoryIndex) => (
						<CompatibleAccessoryRow
							accessory={accessory}
							accessoryIndex={accessoryIndex}
							formState={formState}
							itemIndex={itemIndex}
							key={accessory.accessoryRentalItemId}
						/>
					))
				) : (
					<p className="rounded-lg border border-dashed border-neutral-200 px-4 py-5 text-sm text-neutral-500">
						No hay accesorios compatibles sugeridos para este item.
					</p>
				)}
			</div>
		</section>
	);
}

function AssignedPrimaryAssets({
	assets,
}: {
	assets: AccessoryPreparationItemFormValues["assignedPrimaryAssets"];
}) {
	if (assets.length === 0) {
		return (
			<p className="mt-2 text-xs text-neutral-500">
				Sin assets primarios asignados.
			</p>
		);
	}

	return (
		<div className="mt-3 flex flex-wrap gap-2">
			{assets.map((asset) => (
				<span
					key={asset.id}
					className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600"
				>
					<ShieldCheck className="size-3" />
					{getAssetLabel(asset)}
				</span>
			))}
		</div>
	);
}

function SummaryPill({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
			<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-400">
				{label}
			</p>
			<p className="mt-1 text-lg font-semibold text-neutral-950">{value}</p>
		</div>
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
	const maxAutoAssignQuantity = Math.max(
		0,
		accessory.quantity - accessory.selectedAssetIds.length,
	);

	return (
		<div
			className={
				accessory.selected
					? "rounded-xl border border-neutral-300 bg-white px-4 py-4"
					: "rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4"
			}
		>
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<formState.form.Field
							name={`items[${itemIndex}].accessories[${accessoryIndex}].selected`}
						>
							{(field) => (
								<Switch
									checked={field.state.value}
									onCheckedChange={(checked) =>
										formState.setAccessorySelected(
											itemIndex,
											accessoryIndex,
											checked,
										)
									}
									aria-label={`Seleccionar ${accessory.name}`}
								/>
							)}
						</formState.form.Field>
						<p className="text-sm font-semibold text-neutral-950">
							{accessory.name}
						</p>
						{accessory.isDefaultIncluded ? (
							<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
								Incluido por defecto
							</span>
						) : null}
						{accessory.saved ? (
							<span className="rounded-full bg-neutral-950 px-2 py-0.5 text-[11px] font-medium text-white">
								Guardado
							</span>
						) : accessory.selected ? (
							<span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
								Borrador
							</span>
						) : null}
					</div>

					<div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:max-w-xl">
						<AccessoryMetric label="Disponible" value={accessory.availableCount} />
						<AccessoryMetric
							label="Sugerido"
							value={accessory.suggestedQuantity ?? "-"}
						/>
						<AccessoryMetric label="Assets" value={selectedAssets.length} />
					</div>

					{shouldShowAvailabilityWarning ? (
						<p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
							<AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
							La cantidad supera los accesorios disponibles. Puedes guardar y dejar
							que el backend valide la disponibilidad final.
						</p>
					) : null}
				</div>

				<div className="grid gap-4 lg:w-[420px]">
					<formState.form.Field
						name={`items[${itemIndex}].accessories[${accessoryIndex}].quantity`}
					>
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Cantidad</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="number"
										min={Math.max(1, accessory.selectedAssetIds.length)}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											formState.setAccessoryQuantity(
												itemIndex,
												accessoryIndex,
												toNumber(event.target.value, 1),
											)
										}
										disabled={!accessory.selected}
										aria-invalid={isInvalid}
									/>
									{accessory.selectedAssetIds.length > 0 ? (
										<FieldDescription>
											Minimo {accessory.selectedAssetIds.length} por assets
											preservados.
										</FieldDescription>
									) : null}
									{isInvalid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							);
						}}
					</formState.form.Field>

					<formState.form.Field
						name={`items[${itemIndex}].accessories[${accessoryIndex}].autoAssignQuantity`}
					>
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Auto-asignar</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="number"
										min={0}
										max={maxAutoAssignQuantity}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											formState.setAutoAssignQuantity(
												itemIndex,
												accessoryIndex,
												toNumber(event.target.value, 0),
											)
										}
										disabled={!accessory.selected}
										aria-invalid={isInvalid}
									/>
									<FieldDescription>
										Maximo {maxAutoAssignQuantity} segun la cantidad y assets
										seleccionados.
									</FieldDescription>
									{isInvalid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							);
						}}
					</formState.form.Field>

					<formState.form.Field
						name={`items[${itemIndex}].accessories[${accessoryIndex}].notes`}
					>
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										Notas <span className="text-xs text-neutral-400">(opcional)</span>
									</FieldLabel>
									<Textarea
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										disabled={!accessory.selected}
										className="min-h-20 resize-none"
										aria-invalid={isInvalid}
									/>
									{isInvalid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							);
						}}
					</formState.form.Field>
				</div>
			</div>

			<div className="mt-4 border-t border-neutral-100 pt-4">
				<p className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">
					Assets de accesorio asignados
				</p>
				{selectedAssets.length > 0 ? (
					<div className="mt-2 flex flex-wrap gap-2">
						{selectedAssets.map((asset) => (
							<span
								key={asset.id}
								className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600"
							>
								<ShieldCheck className="size-3" />
								{getAssetLabel(asset)}
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="-mr-2 size-6 text-neutral-400 hover:text-red-600"
									onClick={() =>
										formState.removeAssignedAsset(
											itemIndex,
											accessoryIndex,
											asset.id,
										)
									}
									disabled={!accessory.selected}
								>
									<X className="size-3" />
									<span className="sr-only">Quitar asset asignado</span>
								</Button>
							</span>
						))}
					</div>
				) : (
					<p className="mt-2 text-sm text-neutral-500">
						Sin assets especificos preservados. Usa auto-asignacion para que el
						backend seleccione assets disponibles para el periodo.
					</p>
				)}
			</div>
		</div>
	);
}

function AccessoryMetric({
	label,
	value,
}: {
	label: string;
	value: number | string;
}) {
	return (
		<div className="rounded-lg bg-neutral-50 px-3 py-2 text-right">
			<p className="font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-400">
				{label}
			</p>
			<p className="mt-0.5 font-mono text-sm font-semibold text-neutral-950">
				{value}
			</p>
		</div>
	);
}

function toNumber(value: string, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}
