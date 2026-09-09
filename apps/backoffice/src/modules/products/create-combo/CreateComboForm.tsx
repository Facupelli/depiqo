import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm, useSelector } from "@tanstack/react-form";
import { Loader2, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useEquipmentTypeOptions } from "@/modules/inventory/equipment-types/public";
import { CatalogImageUploader } from "@/shared/components/catalog-image-uploader";
import useDebounce from "@/shared/hooks/use-debounce";
import type { CreateComboSubmissionError } from "./create-combo.errors";
import {
	type CreateComboFormValues,
	createComboFormDefaultValues,
	createComboFormSchema,
} from "./create-combo.schema";

interface SelectOption {
	id: string;
	name: string;
}

interface CreateComboFormProps {
	formId: string;
	defaultValues?: CreateComboFormValues;
	categories: SelectOption[];
	branches: SelectOption[];
	isPending: boolean;
	submitError?: CreateComboSubmissionError | null;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (values: CreateComboFormValues) => Promise<void> | void;
	onCancel: () => void;
}

const NO_CATEGORY_VALUE = "sin-categoria";
const EQUIPMENT_SEARCH_LIMIT = 15;

function areStringArraysEqual(previous: string[], next: string[]) {
	return (
		previous.length === next.length &&
		previous.every((value, index) => value === next[index])
	);
}

export function CreateComboForm({
	formId,
	defaultValues = createComboFormDefaultValues(),
	categories,
	branches,
	isPending,
	submitError,
	submitLabel = "Crear combo",
	pendingLabel = "Creando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: CreateComboFormProps) {
	const equipmentSearchId = useId();
	const [equipmentSearch, setEquipmentSearch] = useState("");
	const debouncedEquipmentSearch = useDebounce(equipmentSearch, 300);
	const form = useForm({
		defaultValues,
		validators: { onSubmit: createComboFormSchema },
		onSubmit: async ({ value }) => onSubmit(value),
	});
	const selectedEquipmentTypeIds = useSelector(
		form.store,
		(state) =>
			state.values.requirements.map(
				(requirement) => requirement.equipmentTypeId,
			),
		{ compare: areStringArraysEqual },
	);
	const equipmentQuery = useEquipmentTypeOptions({
		search: debouncedEquipmentSearch.trim() || undefined,
		limit: EQUIPMENT_SEARCH_LIMIT,
		excludeIds: selectedEquipmentTypeIds,
	});
	const isEquipmentSearchDebouncing =
		equipmentSearch.trim() !== debouncedEquipmentSearch.trim();
	const categoryItems = [
		{ value: NO_CATEGORY_VALUE, label: "Sin categoría" },
		...categories.map((category) => ({
			value: category.id,
			label: category.name,
		})),
	];

	return (
		<>
			<form
				id={formId}
				noValidate
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-12"
			>
				<section className="space-y-5">
					<div>
						<h2 className="font-semibold text-lg">Información del combo</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							Configura cómo se presentará en el catálogo.
						</p>
					</div>
					<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
						<FieldGroup className="grid gap-5">
							<form.Field name="name">
								{(field) => {
									const invalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={invalid}>
											<FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={invalid}
												placeholder="Ej. Combo de producción audiovisual"
											/>
											{invalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="categoryId">
								{(field) => {
									const invalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={invalid}>
											<FieldLabel htmlFor={field.name}>Categoría</FieldLabel>
											<Select
												items={categoryItems}
												value={field.state.value || NO_CATEGORY_VALUE}
												onValueChange={(value) =>
													field.handleChange(
														value === NO_CATEGORY_VALUE || value == null
															? ""
															: value,
													)
												}
											>
												<SelectTrigger id={field.name} aria-invalid={invalid}>
													<SelectValue placeholder="Selecciona una categoría" />
												</SelectTrigger>
												<SelectContent>
													{categoryItems.map((item) => (
														<SelectItem key={item.value} value={item.value}>
															{item.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{invalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="description">
								{(field) => {
									const invalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={invalid}>
											<FieldLabel htmlFor={field.name}>
												Descripción{" "}
												<span className="text-muted-foreground text-xs">
													(opcional)
												</span>
											</FieldLabel>
											<Textarea
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={invalid}
												placeholder="Qué incluye este combo y para qué tipo de alquiler sirve."
												className="min-h-20 bg-white"
											/>
											{invalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
						</FieldGroup>
						<form.Field name="imageUrl">
							{(field) => {
								const invalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={invalid} className="self-start">
										<div>
											<FieldLabel>Imagen</FieldLabel>
											<p className="mt-1 text-muted-foreground text-sm">
												Usa una imagen que represente el combo completo.
											</p>
										</div>
										<CatalogImageUploader
											currentPath={field.state.value}
											onUploadComplete={(path) => field.handleChange(path)}
										/>
										{invalid && <FieldError errors={field.state.meta.errors} />}
									</Field>
								);
							}}
						</form.Field>
					</div>
				</section>

				<section className="space-y-5 border-t pt-8">
					<div>
						<h2 className="font-semibold text-lg">Equipos del combo</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							Agrega al menos un equipo y define cuántas unidades incluye.
						</p>
					</div>
					<form.Field name="requirements" mode="array">
						{(field) => {
							const invalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<div className="space-y-4">
									<div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-2">
										<Field>
											<FieldLabel htmlFor={equipmentSearchId}>
												Buscar equipo
											</FieldLabel>
											<Input
												id={equipmentSearchId}
												value={equipmentSearch}
												onChange={(event) =>
													setEquipmentSearch(event.target.value)
												}
												placeholder="Ej. cámara, trípode, micrófono"
											/>
										</Field>
										<Field>
											<FieldLabel>Resultados</FieldLabel>
											<div className="h-56 overflow-y-auto rounded-md border bg-background">
												{isEquipmentSearchDebouncing ||
												equipmentQuery.isFetching ? (
													<SearchState>
														<Loader2 className="size-3.5 animate-spin" />
														Buscando equipos...
													</SearchState>
												) : equipmentQuery.isError ? (
													<SearchState error>
														No pudimos buscar equipos. Intenta nuevamente.
													</SearchState>
												) : !equipmentQuery.data?.length ? (
													<SearchState>No encontramos equipos.</SearchState>
												) : (
													<ul className="divide-y">
														{equipmentQuery.data.map((equipmentType) => (
															<li
																key={equipmentType.id}
																className="flex min-h-12 items-center gap-3 px-3 py-2 hover:bg-muted/50"
															>
																<span className="min-w-0 flex-1 text-sm">
																	{equipmentType.name}
																</span>
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	onClick={() => {
																		if (
																			!field.state.value.some(
																				(item) =>
																					item.equipmentTypeId ===
																					equipmentType.id,
																			)
																		)
																			field.pushValue({
																				equipmentTypeId: equipmentType.id,
																				equipmentTypeName: equipmentType.name,
																				quantityPerItem: 1,
																			});
																	}}
																>
																	Añadir equipo
																</Button>
															</li>
														))}
													</ul>
												)}
											</div>
										</Field>
									</div>
									{field.state.value.length === 0 ? (
										<div className="rounded-xl border border-dashed p-6 text-sm">
											<p className="font-medium">
												Todavía no agregaste equipos.
											</p>
											<p className="mt-1 text-muted-foreground">
												Busca y agrega al menos un equipo para crear el combo.
											</p>
										</div>
									) : (
										<div className="space-y-3">
											{field.state.value.map((requirement, index) => (
												<div
													key={requirement.equipmentTypeId}
													className="grid gap-4 rounded-lg border p-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-start"
												>
													<p className="min-w-0 font-medium text-sm sm:pt-8">
														{requirement.equipmentTypeName}
													</p>
													<form.Field
														name={`requirements[${index}].quantityPerItem`}
													>
														{(quantityField) => {
															const quantityInvalid =
																quantityField.state.meta.isTouched &&
																!quantityField.state.meta.isValid;
															return (
																<Field data-invalid={quantityInvalid}>
																	<FieldLabel htmlFor={quantityField.name}>
																		Cantidad
																	</FieldLabel>
																	<Input
																		id={quantityField.name}
																		type="number"
																		min={1}
																		step={1}
																		value={quantityField.state.value}
																		onBlur={quantityField.handleBlur}
																		onChange={(event) => {
																			const nextValue =
																				event.target.valueAsNumber;
																			quantityField.handleChange(
																				Number.isNaN(nextValue) || nextValue < 1
																					? 1
																					: nextValue,
																			);
																		}}
																		aria-invalid={quantityInvalid}
																	/>
																	{quantityInvalid && (
																		<FieldError
																			errors={quantityField.state.meta.errors}
																		/>
																	)}
																</Field>
															);
														}}
													</form.Field>
													<Button
														type="button"
														variant="ghost"
														className="justify-self-start text-muted-foreground sm:mt-6"
														onClick={() => field.removeValue(index)}
													>
														<Trash2 className="size-4" />
														Quitar
													</Button>
												</div>
											))}
										</div>
									)}
									{invalid && <FieldError errors={field.state.meta.errors} />}
								</div>
							);
						}}
					</form.Field>
				</section>

				<section className="border-t pt-8">
					<form.Field name="branchIds" mode="array">
						{(field) => {
							const invalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<FieldSet data-invalid={invalid}>
									<FieldLegend
										variant="label"
										className="mb-0 font-semibold text-lg"
									>
										Disponible en
									</FieldLegend>
									<p className="text-muted-foreground text-sm">
										Selecciona las sucursales donde se ofrecerá este combo.
									</p>
									<FieldGroup
										data-slot="checkbox-group"
										className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
									>
										{branches.map((branch) => {
											const checkboxId = `${formId}-branch-${branch.id}`;
											const checked = field.state.value.includes(branch.id);
											return (
												<Field
													key={branch.id}
													orientation="horizontal"
													data-invalid={invalid}
													className="rounded-lg border p-3 text-sm"
												>
													<Checkbox
														id={checkboxId}
														name={field.name}
														checked={checked}
														aria-invalid={invalid}
														onCheckedChange={(nextChecked) => {
															if (nextChecked && !checked) {
																field.pushValue(branch.id);
															}
															if (!nextChecked) {
																const index = field.state.value.indexOf(
																	branch.id,
																);
																if (index >= 0) field.removeValue(index);
															}
														}}
													/>
													<FieldLabel
														htmlFor={checkboxId}
														className="font-normal"
													>
														{branch.name}
													</FieldLabel>
												</Field>
											);
										})}
									</FieldGroup>
									{invalid && <FieldError errors={field.state.meta.errors} />}
								</FieldSet>
							);
						}}
					</form.Field>
				</section>
			</form>

			<div className="sticky bottom-0 mt-10 flex flex-wrap justify-end gap-3 border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80">
				{submitError && (
					<p className="mr-auto self-center text-destructive text-sm">
						{submitError.message}
					</p>
				)}
				<Button type="button" variant="outline" onClick={onCancel}>
					{cancelLabel}
				</Button>
				<form.Subscribe
					selector={(state) => [
						state.canSubmit,
						state.isSubmitting,
						state.isDirty,
						state.values.requirements.length,
					]}
				>
					{([canSubmit, isSubmitting, isDirty, requirementCount]) => (
						<Button
							type="submit"
							form={formId}
							disabled={
								!canSubmit || !isDirty || requirementCount === 0 || isPending
							}
						>
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}

function SearchState({
	children,
	error = false,
}: {
	children: React.ReactNode;
	error?: boolean;
}) {
	return (
		<p
			className={`flex h-full items-center justify-center gap-2 px-4 text-center text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}
		>
			{children}
		</p>
	);
}
