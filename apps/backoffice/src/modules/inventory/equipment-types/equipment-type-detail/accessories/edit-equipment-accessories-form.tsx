import type { GetEquipmentTypesItemDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { Plus, Search, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useEquipmentTypeOptions } from "@/modules/inventory/equipment-types/equipment-type-options.queries";
import useDebounce from "@/shared/hooks/use-debounce";
import {
	createEquipmentAccessoryFormItem,
	type EditEquipmentAccessoriesFormValues,
	editEquipmentAccessoriesFormSchema,
} from "./edit-equipment-accessories.schema";

type Props = {
	formId: string;
	equipmentTypeId: string;
	defaultValues: EditEquipmentAccessoriesFormValues;
	isPending: boolean;
	onSubmit: (values: EditEquipmentAccessoriesFormValues) => Promise<void>;
	onCancel: () => void;
};

export function EditEquipmentAccessoriesForm({
	formId,
	equipmentTypeId,
	defaultValues,
	isPending,
	onSubmit,
	onCancel,
}: Props) {
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300).trim();
	const form = useForm({
		defaultValues,
		validators: { onSubmit: editEquipmentAccessoriesFormSchema },
		onSubmit: async ({ value }) => onSubmit(value),
	});

	return (
		<div className="space-y-6 rounded-lg border bg-background p-4 @2xl/equipment-accessories:p-6">
			<form
				id={formId}
				className="space-y-6"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.Subscribe selector={(state) => state.values.accessories}>
					{(accessories) => (
						<EquipmentTypePickerOptions
							search={search}
							debouncedSearch={debouncedSearch}
							excludeIds={[
								equipmentTypeId,
								...accessories.map((item) => item.accessoryEquipmentTypeId),
							]}
							onSearchChange={setSearch}
							onSelect={(option) => {
								form.pushFieldValue(
									"accessories",
									createEquipmentAccessoryFormItem(option.id, option.name),
								);
								setSearch("");
							}}
						/>
					)}
				</form.Subscribe>

				<form.Field name="accessories" mode="array">
					{(field) => (
						<Field>
							<div className="overflow-hidden rounded-md border">
								<div className="hidden grid-cols-[minmax(0,1fr)_11rem_7rem] gap-4 border-b bg-muted/40 px-4 py-2.5 font-medium text-muted-foreground text-xs @2xl/equipment-accessories:grid">
									<span>Accesorio</span>
									<span>Cantidad sugerida</span>
									<span>Acción</span>
								</div>
								{field.state.value.length === 0 ? (
									<p className="px-4 py-10 text-center text-muted-foreground text-sm">
										No hay accesorios en la configuración. Puedes añadir uno o
										guardar la lista vacía.
									</p>
								) : (
									<ul className="divide-y">
										{field.state.value.map((accessory, index) => (
											<li
												key={accessory.accessoryEquipmentTypeId}
												className="grid gap-3 px-4 py-3 @2xl/equipment-accessories:grid-cols-[minmax(0,1fr)_11rem_7rem] @2xl/equipment-accessories:items-center @2xl/equipment-accessories:gap-4"
											>
												<p className="min-w-0 truncate font-medium text-sm">
													{accessory.name}
												</p>
												<form.Field name={`accessories[${index}].quantity`}>
													{(quantityField) => {
														const isInvalid =
															quantityField.state.meta.isTouched &&
															!quantityField.state.meta.isValid;
														return (
															<Field data-invalid={isInvalid}>
																<FieldLabel
																	htmlFor={quantityField.name}
																	className="@2xl/equipment-accessories:sr-only"
																>
																	Cantidad sugerida
																</FieldLabel>
																<Input
																	id={quantityField.name}
																	name={quantityField.name}
																	type="number"
																	min={1}
																	step={1}
																	value={quantityField.state.value}
																	onBlur={quantityField.handleBlur}
																	onChange={(event) =>
																		quantityField.handleChange(
																			Number(event.target.value),
																		)
																	}
																	aria-invalid={isInvalid}
																/>
																{isInvalid ? (
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
													className="w-fit px-2 text-muted-foreground hover:text-destructive"
													onClick={() => field.removeValue(index)}
													aria-label={`Eliminar ${accessory.name}`}
												>
													<Trash2 className="size-4" />
													Eliminar
												</Button>
											</li>
										))}
									</ul>
								)}
							</div>
						</Field>
					)}
				</form.Field>
			</form>

			<div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							form={formId}
							disabled={!canSubmit || isPending}
						>
							{isSubmitting || isPending ? "Guardando..." : "Guardar cambios"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</div>
	);
}

function EquipmentTypePickerOptions({
	search,
	debouncedSearch,
	excludeIds,
	onSearchChange,
	onSelect,
}: {
	search: string;
	debouncedSearch: string;
	excludeIds: string[];
	onSearchChange: (value: string) => void;
	onSelect: (option: GetEquipmentTypesItemDto) => void;
}) {
	const optionsQuery = useEquipmentTypeOptions({
		limit: 10,
		excludeIds,
		...(debouncedSearch ? { search: debouncedSearch } : {}),
	});

	return (
		<EquipmentTypePicker
			search={search}
			options={optionsQuery.data ?? []}
			isPending={optionsQuery.isPending}
			isFetching={optionsQuery.isFetching}
			isError={optionsQuery.isError}
			onRetry={() => optionsQuery.refetch()}
			onSearchChange={onSearchChange}
			onSelect={onSelect}
		/>
	);
}

function EquipmentTypePicker({
	search,
	options,
	isPending,
	isFetching,
	isError,
	onRetry,
	onSearchChange,
	onSelect,
}: {
	search: string;
	options: GetEquipmentTypesItemDto[];
	isPending: boolean;
	isFetching: boolean;
	isError: boolean;
	onRetry: () => void;
	onSearchChange: (value: string) => void;
	onSelect: (option: GetEquipmentTypesItemDto) => void;
}) {
	const searchInputId = useId();

	return (
		<section className="space-y-3 rounded-md border bg-muted/20 p-4">
			<Field>
				<FieldLabel htmlFor={searchInputId}>Añadir accesorio</FieldLabel>
				<div className="relative">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
					<Input
						id={searchInputId}
						name="accessorySearch"
						type="search"
						autoComplete="off"
						placeholder="Buscar por nombre"
						value={search}
						className="pl-9"
						onChange={(event) => onSearchChange(event.target.value)}
					/>
				</div>
			</Field>
			{isError ? (
				<div
					role="alert"
					className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-sm"
				>
					<span>No pudimos cargar los tipos de equipo.</span>
					<Button type="button" variant="ghost" size="sm" onClick={onRetry}>
						Reintentar
					</Button>
				</div>
			) : null}
			{options.length > 0 || !isError ? (
				<div className="space-y-2">
					<p className="font-medium text-muted-foreground text-xs">
						Resultados
					</p>
					<div className="max-h-48 overflow-y-auto rounded-md border bg-background">
						{options.length === 0 ? (
							<p className="px-3 py-6 text-center text-muted-foreground text-sm">
								{isPending || isFetching
									? "Buscando tipos de equipo..."
									: "No hay tipos de equipo disponibles para añadir."}
							</p>
						) : (
							<ul className="divide-y">
								{options.map((option) => (
									<li key={option.id}>
										<button
											type="button"
											className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-muted"
											onClick={() => onSelect(option)}
										>
											<span className="truncate font-medium text-sm">
												{option.name}
											</span>
											<span className="inline-flex shrink-0 items-center text-primary text-sm">
												<Plus className="mr-1 size-4" />
												Añadir
											</span>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			) : null}
		</section>
	);
}
