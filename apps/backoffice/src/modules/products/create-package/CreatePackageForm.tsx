import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { Trash2 } from "lucide-react";
import { useId } from "react";
import { CatalogImageUploader } from "@/shared/components/catalog-image-uploader";
import {
	type CreatePackageFormValues,
	createPackageFormDefaultValues,
	createPackageFormSchema,
	type PackageEquipmentTypeOption,
} from "./create-package.schema";

interface SelectOption {
	id: string;
	name: string;
}

interface SelectItemOption {
	value: string;
	label: string;
}

interface CreatePackageFormProps {
	formId: string;
	defaultValues?: CreatePackageFormValues;
	categories: SelectOption[];
	branches: SelectOption[];
	equipmentTypes: PackageEquipmentTypeOption[];
	equipmentSearch: string;
	isPending: boolean;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onEquipmentSearchChange: (search: string) => void;
	onSubmit: (values: CreatePackageFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function CreatePackageForm({
	formId,
	defaultValues = createPackageFormDefaultValues(),
	categories,
	branches,
	equipmentTypes,
	equipmentSearch,
	isPending,
	submitLabel = "Crear paquete",
	pendingLabel = "Creando...",
	cancelLabel = "Cancelar",
	onEquipmentSearchChange,
	onSubmit,
	onCancel,
}: CreatePackageFormProps) {
	const equipmentSearchId = useId();
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: createPackageFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const categoryItems: SelectItemOption[] = [
		{ value: "sin-categoria", label: "Sin categoría" },
		...categories.map((category) => ({
			value: category.id,
			label: category.name,
		})),
	];
	const branchItems: SelectItemOption[] = branches.map((branch) => ({
		value: branch.id,
		label: branch.name,
	}));
	return (
		<>
			<form
				id={formId}
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-12"
			>
				<section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
					<div className="space-y-6">
						<FieldGroup className="grid gap-5">
							<form.Field name="name">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												Nombre del paquete
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												type="text"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={isInvalid}
												placeholder="Ej. Paquete de producción audiovisual"
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>

							<form.Field name="categoryId">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Categoría</FieldLabel>
											<Select
												items={categoryItems}
												value={field.state.value || "sin-categoria"}
												onValueChange={(value) =>
													field.handleChange(
														value === "sin-categoria" || value == null
															? ""
															: value,
													)
												}
											>
												<SelectTrigger>
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
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>

							<form.Field name="description">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												Descripción breve{" "}
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
												aria-invalid={isInvalid}
												placeholder="Qué incluye este paquete y para qué tipo de alquiler sirve."
												className="min-h-16 bg-white"
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
						</FieldGroup>
					</div>

					<form.Field name="imageUrl">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid} className="self-start">
									<div>
										<FieldLabel>Imagen del paquete</FieldLabel>
										<p className="mt-1 text-muted-foreground text-sm">
											Usa una imagen que represente el conjunto completo.
										</p>
									</div>
									<CatalogImageUploader
										currentPath={field.state.value}
										onUploadComplete={(path) => field.handleChange(path)}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				</section>

				<section className="space-y-5 border-t pt-8">
					<div>
						<p className="font-medium text-foreground text-sm">
							Sucursales disponibles
						</p>
						<p className="mt-1 max-w-2xl text-muted-foreground text-sm">
							Selecciona las sucursales donde este paquete estará disponible
							para alquilar.
						</p>
					</div>
					<form.Field name="branchIds">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
										{branchItems.map((branch) => {
											const isChecked = field.state.value.includes(
												branch.value,
											);
											return (
												<div
													key={branch.value}
													className="rounded-lg border p-3 text-sm"
												>
													<div className="flex items-center gap-3">
														<Checkbox
															checked={isChecked}
															onCheckedChange={(checked) => {
																field.handleChange(
																	checked
																		? [...field.state.value, branch.value]
																		: field.state.value.filter(
																				(id) => id !== branch.value,
																			),
																);
															}}
														/>
														<span>{branch.label}</span>
													</div>
												</div>
											);
										})}
									</div>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				</section>

				<section className="space-y-5 border-t pt-8">
					<div>
						<p className="font-medium text-foreground text-sm">
							Equipo requerido
						</p>
						<p className="mt-1 max-w-2xl text-muted-foreground text-sm">
							Busca el equipo requerido para este paquete. Si necesitas más
							unidades del mismo equipo, aumenta la cantidad.
						</p>
					</div>

					<form.Subscribe selector={(state) => state.values.branchIds}>
						{(selectedBranchIds) => (
							<form.Field name="requirements" mode="array">
								{(field) => {
									const selectedIds = new Set(
										field.state.value.map(
											(requirement) => requirement.equipmentTypeId,
										),
									);
									const availableEquipmentTypes = equipmentTypes.filter(
										(equipmentType) => !selectedIds.has(equipmentType.id),
									);
									const availableEquipmentItems = availableEquipmentTypes.map(
										(equipmentType) => ({
											value: equipmentType.id,
											label: equipmentType.name,
										}),
									);
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<div className="space-y-4">
											<div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
												<Field>
													<FieldLabel htmlFor={equipmentSearchId}>
														Buscar equipo
													</FieldLabel>
													<Input
														id={equipmentSearchId}
														disabled={selectedBranchIds.length === 0}
														value={equipmentSearch}
														onChange={(event) =>
															onEquipmentSearchChange(event.target.value)
														}
														placeholder="Ej. cámara, trípode, micrófono"
													/>
												</Field>
												<Field>
													<FieldLabel>Resultados</FieldLabel>
													<Select
														items={availableEquipmentItems}
														disabled={selectedBranchIds.length === 0}
														value=""
														onValueChange={(value) => {
															if (!value || selectedIds.has(value)) return;
															const equipmentType =
																availableEquipmentTypes.find(
																	(item) => item.id === value,
																);

															if (!equipmentType) return;

															field.pushValue({
																equipmentTypeId: value,
																equipmentTypeName: equipmentType.name,
																quantityPerItem: 1,
															});
														}}
													>
														<SelectTrigger>
															<SelectValue
																placeholder={
																	selectedBranchIds.length === 0
																		? "Selecciona una sucursal primero"
																		: "Agregar equipo al paquete"
																}
															/>
														</SelectTrigger>
														<SelectContent>
															{availableEquipmentTypes.map((equipmentType) => (
																<SelectItem
																	key={equipmentType.id}
																	value={equipmentType.id}
																>
																	{equipmentType.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</Field>
											</div>

											{field.state.value.length === 0 ? (
												<div className="rounded-xl border border-dashed p-6 text-sm">
													<p className="font-medium text-foreground">
														Todavía no agregaste equipos.
													</p>
													<p className="mt-1 text-muted-foreground">
														Busca y agrega al menos un equipo requerido para
														crear el paquete.
													</p>
												</div>
											) : (
												<div className="rounded-sm border">
													<Table>
														<TableHeader>
															<TableRow>
																<TableHead>Equipo</TableHead>
																<TableHead className="w-40">Cantidad</TableHead>
																<TableHead className="w-12" />
															</TableRow>
														</TableHeader>
														<TableBody>
															{field.state.value.map((requirement, index) => (
																<TableRow key={requirement.equipmentTypeId}>
																	<TableCell>
																		{requirement.equipmentTypeName}
																	</TableCell>
																	<TableCell>
																		<form.Field
																			name={`requirements[${index}].quantityPerItem`}
																		>
																			{(subField) => {
																				const subFieldInvalid =
																					subField.state.meta.isTouched &&
																					!subField.state.meta.isValid;

																				return (
																					<Field data-invalid={subFieldInvalid}>
																						<Input
																							type="number"
																							min={1}
																							step={1}
																							value={subField.state.value}
																							onBlur={subField.handleBlur}
																							onChange={(event) => {
																								const nextValue =
																									event.target.valueAsNumber;
																								subField.handleChange(
																									Number.isNaN(nextValue)
																										? 1
																										: Math.max(1, nextValue),
																								);
																							}}
																							aria-invalid={subFieldInvalid}
																							aria-label={`Cantidad de ${requirement.equipmentTypeName}`}
																						/>
																						{subFieldInvalid && (
																							<FieldError
																								errors={
																									subField.state.meta.errors
																								}
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
																			aria-label={`Eliminar equipo ${index + 1}`}
																		>
																			<Trash2 className="h-4 w-4" />
																		</Button>
																	</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</div>
											)}
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</div>
									);
								}}
							</form.Field>
						)}
					</form.Subscribe>
				</section>
			</form>

			<div className="sticky bottom-0 mt-10 flex justify-end gap-4 border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80">
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
