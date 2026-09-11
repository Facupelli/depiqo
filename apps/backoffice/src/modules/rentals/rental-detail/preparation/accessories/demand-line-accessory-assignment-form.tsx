import { Combobox } from "@base-ui/react/combobox";
import type { GetEquipmentTypesItemDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { useForm } from "@tanstack/react-form";
import {
	AlertCircle,
	Check,
	ChevronsUpDown,
	Loader2,
	Minus,
	Plus,
	Trash2,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { useEquipmentTypeOptions } from "@/modules/inventory/equipment-types/public";
import useDebounce from "@/shared/hooks/use-debounce";
import type { AssignRentalAccessoriesUiError } from "./assign-rental-accessories.errors";
import {
	type DemandLineAccessoryAssignmentFormValues,
	type DemandLineAccessoryMetadata,
	demandLineAccessoryAssignmentFormSchema,
} from "./demand-line-accessory-assignment.schema";

interface Props {
	defaultValues: DemandLineAccessoryAssignmentFormValues;
	metadataByEquipmentType: ReadonlyMap<string, DemandLineAccessoryMetadata>;
	defaultsFailed: boolean;
	isPending: boolean;
	error?: AssignRentalAccessoriesUiError;
	onRetryDefaults: () => Promise<
		DemandLineAccessoryAssignmentFormValues | undefined
	>;
	onSubmit: (values: DemandLineAccessoryAssignmentFormValues) => Promise<void>;
	onCancel: () => void;
	onChange: () => void;
}

export function DemandLineAccessoryAssignmentForm({
	defaultValues,
	metadataByEquipmentType,
	defaultsFailed,
	isPending,
	error,
	onRetryDefaults,
	onSubmit,
	onCancel,
	onChange,
}: Props) {
	const formId = useId();
	const removedEquipmentTypeIds = useRef(new Set<string>());
	const [isRetryingDefaults, setIsRetryingDefaults] = useState(false);
	const form = useForm({
		defaultValues,
		validators: { onSubmit: demandLineAccessoryAssignmentFormSchema },
		onSubmit: async ({ value }) => onSubmit(value),
	});

	async function handleRetryDefaults() {
		setIsRetryingDefaults(true);
		const retryValues = await onRetryDefaults().catch(() => undefined);
		setIsRetryingDefaults(false);
		if (!retryValues) return;

		const currentIds = new Set(
			form.state.values.accessories.map((item) => item.equipmentTypeId),
		);
		for (const accessory of retryValues.accessories) {
			if (
				!currentIds.has(accessory.equipmentTypeId) &&
				!removedEquipmentTypeIds.current.has(accessory.equipmentTypeId)
			) {
				form.pushFieldValue("accessories", accessory);
				currentIds.add(accessory.equipmentTypeId);
			}
		}
	}

	return (
		<>
			<form
				id={formId}
				className="min-w-0 space-y-5"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
			>
				{defaultsFailed ? (
					<div
						className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
						role="alert"
					>
						<AlertCircle className="mt-0.5 size-4 shrink-0" />
						<div className="min-w-0 flex-1">
							<p className="font-medium text-sm">
								No pudimos cargar los accesorios sugeridos.
							</p>
							<p className="mt-0.5 text-amber-800 text-xs">
								Puedes continuar con los accesorios asignados o buscar otros
								tipos de equipo.
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={isRetryingDefaults || isPending}
							onClick={handleRetryDefaults}
						>
							{isRetryingDefaults ? "Reintentando..." : "Reintentar"}
						</Button>
					</div>
				) : null}

				{error ? (
					<div
						className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-950 text-sm"
						role="alert"
					>
						{error.message}
					</div>
				) : null}

				<form.Field name="accessories" mode="array">
					{(field) => (
						<div className="space-y-5">
							<EquipmentTypePicker
								excludeIds={field.state.value.map(
									(item) => item.equipmentTypeId,
								)}
								disabled={isPending}
								onSelect={(option) => {
									onChange();
									field.pushValue({
										equipmentTypeId: option.id,
										equipmentTypeName: option.name,
										quantity: 1,
									});
								}}
							/>

							<section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
								<div className="border-neutral-200 border-b bg-neutral-50/80 px-4 py-3">
									<h3 className="font-semibold text-neutral-950 text-sm">
										Accesorios asignados
									</h3>
								</div>
								{field.state.value.length === 0 ? (
									<div className="px-4 py-10 text-center">
										<p className="font-medium text-neutral-800 text-sm">
											No hay accesorios asignados.
										</p>
										<p className="mt-1 text-neutral-500 text-xs">
											Busca un tipo de equipo para añadir el primero.
										</p>
									</div>
								) : (
									<ul className="divide-y divide-neutral-100">
										{field.state.value.map((accessory, index) => {
											const metadata = metadataByEquipmentType.get(
												accessory.equipmentTypeId,
											);
											return (
												<li
													key={accessory.equipmentTypeId}
													className="grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
												>
													<div className="min-w-0">
														<div className="flex flex-wrap items-center gap-2">
															<p className="break-words font-medium text-neutral-950 text-sm">
																{accessory.equipmentTypeName}
															</p>
															{metadata ? (
																<span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700 text-[11px]">
																	Sugerido
																</span>
															) : null}
														</div>
														{metadata ? (
															<p className="mt-1 text-neutral-500 text-xs">
																Recomendado: {metadata.recommendedQuantity} ·
																Disponible: {metadata.availableCount}
															</p>
														) : null}
													</div>
													<form.Field name={`accessories[${index}].quantity`}>
														{(quantityField) => {
															const invalid =
																quantityField.state.meta.isTouched &&
																!quantityField.state.meta.isValid;
															return (
																<Field data-invalid={invalid} className="gap-1">
																	<FieldLabel className="sr-only">
																		Cantidad de {accessory.equipmentTypeName}
																	</FieldLabel>
																	<div className="flex w-fit items-center overflow-hidden rounded-md border border-neutral-200">
																		<Button
																			type="button"
																			variant="ghost"
																			size="icon-sm"
																			className="rounded-none border-neutral-200 border-r"
																			disabled={
																				quantityField.state.value <= 1 ||
																				isPending
																			}
																			onClick={() => {
																				onChange();
																				quantityField.handleChange(
																					Math.max(
																						1,
																						quantityField.state.value - 1,
																					),
																				);
																			}}
																			aria-label={`Restar ${accessory.equipmentTypeName}`}
																		>
																			<Minus className="size-3.5" />
																		</Button>
																		<span className="min-w-10 text-center font-semibold text-sm tabular-nums">
																			{quantityField.state.value}
																		</span>
																		<Button
																			type="button"
																			variant="ghost"
																			size="icon-sm"
																			className="rounded-none border-neutral-200 border-l"
																			disabled={isPending}
																			onClick={() => {
																				onChange();
																				quantityField.handleChange(
																					quantityField.state.value + 1,
																				);
																			}}
																			aria-label={`Sumar ${accessory.equipmentTypeName}`}
																		>
																			<Plus className="size-3.5" />
																		</Button>
																	</div>
																	{invalid ? (
																		<FieldError
																			errors={quantityField.state.meta.errors}
																		/>
																	) : null}
																</Field>
															);
														}}
													</form.Field>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="text-neutral-500 hover:text-destructive"
														disabled={isPending}
														onClick={() => {
															onChange();
															removedEquipmentTypeIds.current.add(
																accessory.equipmentTypeId,
															);
															field.removeValue(index);
														}}
														aria-label={`Eliminar ${accessory.equipmentTypeName}`}
													>
														<Trash2 className="size-4" />
													</Button>
												</li>
											);
										})}
									</ul>
								)}
							</section>
						</div>
					)}
				</form.Field>
			</form>

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting] as const}
			>
				{([canSubmit, isSubmitting]) => (
					<div className="flex flex-col-reverse gap-2 border-neutral-200 border-t bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							disabled={isPending}
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							form={formId}
							disabled={!canSubmit || isSubmitting || isPending}
						>
							{isSubmitting || isPending
								? "Guardando..."
								: "Guardar accesorios"}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</>
	);
}

function EquipmentTypePicker({
	excludeIds,
	disabled,
	onSelect,
}: {
	excludeIds: string[];
	disabled: boolean;
	onSelect: (option: GetEquipmentTypesItemDto) => void;
}) {
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300).trim();
	const query = useEquipmentTypeOptions({
		search: debouncedSearch || undefined,
		limit: 10,
		excludeIds,
	});
	const options = query.data ?? [];
	const isDebouncing = search.trim() !== debouncedSearch;

	return (
		<Field>
			<FieldLabel>Añadir accesorio</FieldLabel>
			<Combobox.Root<GetEquipmentTypesItemDto>
				items={options}
				filteredItems={options}
				filter={null}
				inputValue={search}
				value={null}
				disabled={disabled}
				itemToStringLabel={(option) => option.name}
				isItemEqualToValue={(option, value) => option.id === value.id}
				onInputValueChange={setSearch}
				onValueChange={(option) => {
					if (!option) return;
					onSelect(option);
					setSearch("");
				}}
			>
				<div className="relative">
					<Combobox.Input
						type="search"
						placeholder="Buscar equipo"
						autoComplete="off"
						className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-9 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
					/>
					<Combobox.Trigger
						type="button"
						aria-label="Mostrar tipos de equipo"
						className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground"
					>
						<ChevronsUpDown className="size-4" />
					</Combobox.Trigger>
				</div>
				<Combobox.Portal>
					<Combobox.Positioner sideOffset={4} className="z-50 outline-none">
						<Combobox.Popup className="w-[var(--anchor-width)] max-w-[var(--available-width)] rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none">
							<Combobox.List className="max-h-60 overflow-y-auto outline-none">
								{isDebouncing || query.isFetching ? (
									<p className="flex items-center justify-center gap-2 px-3 py-8 text-muted-foreground text-sm">
										<Loader2 className="size-4 animate-spin" /> Buscando
										equipos...
									</p>
								) : query.isError ? (
									<div className="space-y-2 px-3 py-5 text-center">
										<p className="text-destructive text-sm">
											No pudimos buscar equipos.
										</p>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => query.refetch()}
										>
											Reintentar
										</Button>
									</div>
								) : options.length === 0 ? (
									<p className="px-3 py-8 text-center text-muted-foreground text-sm">
										No encontramos tipos de equipo disponibles.
									</p>
								) : (
									options.map((option, index) => (
										<Combobox.Item
											key={option.id}
											value={option}
											index={index}
											className="flex cursor-default items-center justify-between rounded-sm px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
										>
											<span>{option.name}</span>
											<Combobox.ItemIndicator>
												<Check className="size-4 text-primary" />
											</Combobox.ItemIndicator>
										</Combobox.Item>
									))
								)}
							</Combobox.List>
						</Combobox.Popup>
					</Combobox.Positioner>
				</Combobox.Portal>
			</Combobox.Root>
		</Field>
	);
}
