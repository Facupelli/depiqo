import type { GetEquipmentTypesItemDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { useForm } from "@tanstack/react-form";
import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import useDebounce from "@/shared/hooks/use-debounce";
import { useEquipmentTypeOptions } from "../equipment-type-options.queries";
import {
	type AddAccessorySuggestionsFormValues,
	addAccessorySuggestionsFormDefaultValues,
	addAccessorySuggestionsFormSchema,
	createAccessorySuggestionItem,
} from "./add-accessory-suggestions.schema";

interface AddAccessorySuggestionsFormProps {
	formId: string;
	equipmentTypeId: string;
	existingAccessoryEquipmentTypeIds: string[];
	defaultValues?: AddAccessorySuggestionsFormValues;
	isPending: boolean;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (values: AddAccessorySuggestionsFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function AddAccessorySuggestionsForm({
	formId,
	equipmentTypeId,
	existingAccessoryEquipmentTypeIds,
	defaultValues = addAccessorySuggestionsFormDefaultValues(),
	isPending,
	submitLabel = "Agregar accesorios",
	pendingLabel = "Agregando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: AddAccessorySuggestionsFormProps) {
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);
	const normalizedSearch = debouncedSearch.trim();
	const { data: equipmentTypes = [], isFetching } = useEquipmentTypeOptions({
		limit: 10,
		...(normalizedSearch ? { search: normalizedSearch } : {}),
	});

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: addAccessorySuggestionsFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	return (
		<>
			<form
				id={formId}
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-5"
			>
				<form.Subscribe selector={(state) => state.values.accessories}>
					{(accessories) => {
						const selectedIds = new Set(
							accessories.map(
								(accessory) => accessory.accessoryEquipmentTypeId,
							),
						);
						const excludedIds = new Set([
							equipmentTypeId,
							...existingAccessoryEquipmentTypeIds,
							...selectedIds,
						]);
						const availableEquipmentTypes = equipmentTypes.filter(
							(equipmentType) => !excludedIds.has(equipmentType.id),
						);

						return (
							<EquipmentTypeSearchPicker
								search={search}
								isFetching={isFetching}
								equipmentTypes={availableEquipmentTypes}
								onSearchChange={setSearch}
								onSelect={(equipmentType) => {
									form.pushFieldValue(
										"accessories",
										createAccessorySuggestionItem(
											equipmentType.id,
											equipmentType.name,
										),
									);
									setSearch("");
								}}
							/>
						);
					}}
				</form.Subscribe>

				<form.Field name="accessories" mode="array">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;

						return (
							<Field data-invalid={isInvalid}>
								<div className="overflow-hidden rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Tipo de equipo accesorio</TableHead>
												<TableHead className="w-36">Cantidad</TableHead>
												<TableHead className="w-12" />
											</TableRow>
										</TableHeader>
										<TableBody>
											{field.state.value.length === 0 ? (
												<TableRow>
													<TableCell
														colSpan={3}
														className="h-24 text-center text-muted-foreground"
													>
														Selecciona al menos un accesorio por defecto.
													</TableCell>
												</TableRow>
											) : null}
											{field.state.value.map((accessory, index) => (
												<TableRow key={accessory.accessoryEquipmentTypeId}>
													<TableCell>
														<p className="font-medium text-sm">
															{accessory.accessoryEquipmentTypeName}
														</p>
														<p className="text-muted-foreground text-xs">
															{accessory.accessoryEquipmentTypeId}
														</p>
													</TableCell>
													<TableCell>
														<form.Field name={`accessories[${index}].quantity`}>
															{(subField) => {
																const quantityIsInvalid =
																	subField.state.meta.isTouched &&
																	!subField.state.meta.isValid;

																return (
																	<Field data-invalid={quantityIsInvalid}>
																		<FieldLabel className="sr-only">
																			Cantidad
																		</FieldLabel>
																		<Input
																			type="number"
																			min={1}
																			step={1}
																			value={subField.state.value}
																			onBlur={subField.handleBlur}
																			onChange={(event) =>
																				subField.handleChange(
																					Number(event.target.value),
																				)
																			}
																			aria-invalid={quantityIsInvalid}
																		/>
																		{quantityIsInvalid && (
																			<FieldError
																				errors={subField.state.meta.errors}
																			/>
																		)}
																	</Field>
																);
															}}
														</form.Field>
													</TableCell>
													<TableCell>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															onClick={() => field.removeValue(index)}
															aria-label={`Eliminar ${accessory.accessoryEquipmentTypeName}`}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
			</form>

			<div className="flex justify-end gap-3 border-t pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					{cancelLabel}
				</Button>
				<form.Subscribe
					selector={(state) => [
						state.canSubmit,
						state.isSubmitting,
						state.values.accessories.length,
					]}
				>
					{([canSubmit, isSubmitting, accessoryCount]) => (
						<Button
							type="submit"
							form={formId}
							disabled={!canSubmit || accessoryCount === 0 || isPending}
						>
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}

function EquipmentTypeSearchPicker({
	search,
	equipmentTypes,
	isFetching,
	onSearchChange,
	onSelect,
}: {
	search: string;
	equipmentTypes: GetEquipmentTypesItemDto[];
	isFetching: boolean;
	onSearchChange: (value: string) => void;
	onSelect: (equipmentType: GetEquipmentTypesItemDto) => void;
}) {
	return (
		<section className="space-y-2 rounded-md border bg-muted/20 p-3">
			<Field>
				<FieldLabel>Buscar tipo de equipo</FieldLabel>
				<div className="relative">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Buscar por nombre"
						value={search}
						className="pl-9"
						onChange={(event) => onSearchChange(event.target.value)}
					/>
				</div>
			</Field>
			<div className="max-h-52 overflow-y-auto rounded-md border bg-background">
				{equipmentTypes.length === 0 ? (
					<p className="px-3 py-6 text-center text-muted-foreground text-sm">
						{isFetching
							? "Buscando tipos de equipo..."
							: "No hay tipos de equipo disponibles para agregar."}
					</p>
				) : (
					<ul className="divide-y">
						{equipmentTypes.map((equipmentType) => (
							<li key={equipmentType.id}>
								<button
									type="button"
									className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-muted"
									onClick={() => onSelect(equipmentType)}
								>
									<span>
										<span className="font-medium text-sm">
											{equipmentType.name}
										</span>
									</span>
									<span className="inline-flex items-center text-primary text-sm">
										<Plus className="mr-1 h-4 w-4" />
										Agregar
									</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
