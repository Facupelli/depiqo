import { Button } from "@repo/ui/components/button";
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
import { Plus, Trash2 } from "lucide-react";
import {
	type CreateEquipmentTypeFormValues,
	createEmptyEquipmentTypeAsset,
	createEquipmentTypeFormDefaultValues,
	createEquipmentTypeFormSchema,
} from "./create-equipment-type.schema";

interface SelectOption {
	id: string;
	name: string;
}

interface SelectItemOption {
	value: string;
	label: string;
}

const TENANT_OWNER_VALUE = "tenant-owned";

interface CreateEquipmentTypeFormProps {
	formId: string;
	defaultValues?: CreateEquipmentTypeFormValues;
	branches: SelectOption[];
	owners?: SelectOption[];
	categories?: SelectOption[];
	isPending: boolean;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (values: CreateEquipmentTypeFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function CreateEquipmentTypeForm({
	formId,
	defaultValues = createEquipmentTypeFormDefaultValues(),
	branches,
	owners = [],
	categories = [],
	isPending,
	submitLabel = "Crear equipo",
	pendingLabel = "Creando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: CreateEquipmentTypeFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: createEquipmentTypeFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const branchItems: SelectItemOption[] = branches.map((branch) => ({
		value: branch.id,
		label: branch.name,
	}));
	const ownerItems: SelectItemOption[] = owners.map((owner) => ({
		value: owner.id,
		label: owner.name,
	}));
	const categoryItems: SelectItemOption[] = categories.map((category) => ({
		value: category.id,
		label: category.name,
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
				className="space-y-8"
			>
				<section className="space-y-5">
					<FieldGroup className="grid gap-5">
						<form.Field name="categoryId">
							{(field) => (
								<Field>
									<FieldLabel>
										Categoría{" "}
										<span className="text-muted-foreground text-xs">
											(opcional)
										</span>
									</FieldLabel>
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
										<SelectTrigger>
											<SelectValue placeholder="Sin categoría" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NO_CATEGORY_VALUE}>
												Sin categoría
											</SelectItem>
											{categoryItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							)}
						</form.Field>

						<form.Field name="name">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>
											Nombre del equipo
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
											placeholder="Ej. Cámara Sony FX3"
										/>
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
											placeholder="Información corta para identificar el tipo de equipo."
											className="min-h-20"
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>
					</FieldGroup>
				</section>

				<section className="space-y-5 border-t pt-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<p className="font-medium text-foreground text-sm">
								Activos iniciales
							</p>
							<p className="mt-1 max-w-2xl text-muted-foreground text-sm">
								Puedes crear el tipo de equipo ahora y cargar las unidades
								físicas más tarde. Si agregas activos, indica al menos su
								sucursal.
							</p>
						</div>
						<form.Field name="assets" mode="array">
							{(field) => (
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										field.pushValue(createEmptyEquipmentTypeAsset())
									}
								>
									<Plus className="mr-2 h-4 w-4" />
									Agregar activo
								</Button>
							)}
						</form.Field>
					</div>

					<form.Field name="assets" mode="array">
						{(field) =>
							field.state.value.length === 0 ? (
								<div className="rounded-xl border border-dashed p-6 text-sm">
									<p className="font-medium text-foreground">
										No agregaste activos todavía.
									</p>
									<p className="mt-1 text-muted-foreground">
										Podrás cargar unidades físicas después de crear el equipo.
									</p>
								</div>
							) : (
								<div className="overflow-hidden rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="min-w-52">Sucursal</TableHead>
												<TableHead className="min-w-52">Propietario</TableHead>
												<TableHead className="min-w-44">
													Número de serie
												</TableHead>
												<TableHead className="min-w-56">Notas</TableHead>
												<TableHead className="w-12" />
											</TableRow>
										</TableHeader>
										<TableBody>
											{field.state.value.map((asset, index) => (
												<TableRow
													key={`${asset.branchId}-${asset.serialNumber}-${index}`}
												>
													<TableCell>
														<form.Field name={`assets[${index}].branchId`}>
															{(subField) => {
																const isInvalid =
																	subField.state.meta.isTouched &&
																	!subField.state.meta.isValid;

																return (
																	<Field data-invalid={isInvalid}>
																		<FieldLabel className="sr-only">
																			Sucursal
																		</FieldLabel>
																		<Select
																			items={branchItems}
																			value={subField.state.value}
																			onValueChange={(value) => {
																				subField.handleChange(value ?? "");
																			}}
																		>
																			<SelectTrigger aria-invalid={isInvalid}>
																				<SelectValue placeholder="Selecciona una sucursal" />
																			</SelectTrigger>
																			<SelectContent>
																				{branchItems.map((item) => (
																					<SelectItem
																						key={item.value}
																						value={item.value}
																					>
																						{item.label}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																		{isInvalid && (
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
														<form.Field name={`assets[${index}].ownerId`}>
															{(subField) => (
																<Select
																	items={ownerItems}
																	value={
																		subField.state.value || TENANT_OWNER_VALUE
																	}
																	onValueChange={(value) => {
																		subField.handleChange(
																			value === TENANT_OWNER_VALUE ||
																				value == null
																				? ""
																				: value,
																		);
																	}}
																>
																	<SelectTrigger>
																		<SelectValue placeholder="Selecciona propietario" />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value={TENANT_OWNER_VALUE}>
																			Propiedad del tenant
																		</SelectItem>
																		{ownerItems.map((item) => (
																			<SelectItem
																				key={item.value}
																				value={item.value}
																			>
																				{item.label}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															)}
														</form.Field>
													</TableCell>

													<TableCell>
														<form.Field name={`assets[${index}].serialNumber`}>
															{(subField) => (
																<Input
																	type="text"
																	value={subField.state.value}
																	onBlur={subField.handleBlur}
																	onChange={(event) =>
																		subField.handleChange(event.target.value)
																	}
																	placeholder="Opcional"
																/>
															)}
														</form.Field>
													</TableCell>

													<TableCell>
														<form.Field name={`assets[${index}].notes`}>
															{(subField) => (
																<Input
																	type="text"
																	value={subField.state.value}
																	onBlur={subField.handleBlur}
																	onChange={(event) =>
																		subField.handleChange(event.target.value)
																	}
																	placeholder="Opcional"
																/>
															)}
														</form.Field>
													</TableCell>

													<TableCell>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															onClick={() => field.removeValue(index)}
															aria-label={`Eliminar activo ${index + 1}`}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)
						}
					</form.Field>
				</section>
			</form>

			<div className="sticky bottom-0 mt-8 flex justify-end gap-3 border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isPending}
				>
					{cancelLabel}
				</Button>
				<form.Subscribe
					selector={(state) => [
						state.canSubmit,
						state.isSubmitting,
						state.isDirty,
					]}
				>
					{([canSubmit, isSubmitting, isDirty]) => (
						<Button
							type="submit"
							form={formId}
							disabled={!canSubmit || !isDirty || isSubmitting || isPending}
						>
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
