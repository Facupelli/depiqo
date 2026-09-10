import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Field,
	FieldDescription,
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
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { CatalogImageUploader } from "@/shared/components/catalog-image-uploader";
import { withForm } from "@/shared/contexts/form.context";
import { createEquipmentFormDefaultValues } from "./create-equipment.schema";
import { WizardStepHeading } from "./wizard-step-heading";

interface SelectOption {
	value: string;
	label: string;
}

const noCategoryValue = "no-category";

export const StandaloneRentalStep = withForm({
	defaultValues: createEquipmentFormDefaultValues(),
	props: {
		categoryItems: [] as SelectOption[],
		branchItems: [] as SelectOption[],
		onEnabledChange: (_checked: boolean) => {},
	},
	render: function Render({
		form,
		categoryItems,
		branchItems,
		onEnabledChange,
	}) {
		return (
			<section className="space-y-6 lg:space-y-8">
				<WizardStepHeading
					title="Alquiler individual"
					description="Define si este equipo también se alquilará de forma individual."
				/>
				<form.Field name="standaloneRental.enabled">
					{(field) => (
						<Field className="flex-row items-center justify-between rounded-xl border p-4">
							<div>
								<FieldLabel htmlFor={field.name}>
									Configurar este equipo para alquiler individual
								</FieldLabel>
								<FieldDescription>
									La configuración de precios se realiza por separado.
								</FieldDescription>
							</div>
							<Switch
								id={field.name}
								name={field.name}
								checked={field.state.value}
								onCheckedChange={(checked) => {
									onEnabledChange(checked);
									field.handleChange(checked);
								}}
								aria-invalid={false}
							/>
						</Field>
					)}
				</form.Field>
				<form.Subscribe
					selector={(state) => state.values.standaloneRental.enabled}
				>
					{(enabled) =>
						enabled ? (
							<div className="space-y-6 border-t pt-6 lg:space-y-8 lg:pt-8">
								<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
									<FieldGroup className="grid gap-5">
										<form.Field name="standaloneRental.name">
											{(field) => {
												const isInvalid =
													field.state.meta.isTouched &&
													!field.state.meta.isValid;
												return (
													<Field data-invalid={isInvalid}>
														<FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
														<Input
															id={field.name}
															name={field.name}
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(event) =>
																field.handleChange(event.target.value)
															}
															aria-invalid={isInvalid}
														/>
														{isInvalid && (
															<FieldError errors={field.state.meta.errors} />
														)}
													</Field>
												);
											}}
										</form.Field>
										<form.Field name="standaloneRental.categoryId">
											{(field) => (
												<Field>
													<FieldLabel htmlFor={field.name}>
														Categoría{" "}
														<span className="text-muted-foreground text-xs">
															(opcional)
														</span>
													</FieldLabel>
													<Select
														items={[
															{
																value: noCategoryValue,
																label: "Sin categoría",
															},
															...categoryItems,
														]}
														value={field.state.value || noCategoryValue}
														onValueChange={(value) =>
															field.handleChange(
																value === noCategoryValue || value == null
																	? ""
																	: value,
															)
														}
													>
														<SelectTrigger
															id={field.name}
															name={field.name}
															aria-invalid={false}
														>
															<SelectValue placeholder="Sin categoría" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value={noCategoryValue}>
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
										<form.Field name="standaloneRental.description">
											{(field) => (
												<Field>
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
														aria-invalid={false}
														className="min-h-24"
													/>
												</Field>
											)}
										</form.Field>
									</FieldGroup>
									<form.Field name="standaloneRental.imageUrl">
										{(field) => (
											<Field className="self-start">
												<FieldLabel>Imagen</FieldLabel>
												<CatalogImageUploader
													inputId={field.name}
													inputName={field.name}
													currentPath={field.state.value}
													onUploadComplete={field.handleChange}
												/>
											</Field>
										)}
									</form.Field>
								</div>
								<form.Field name="standaloneRental.branchIds" mode="array">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<FieldSet data-invalid={isInvalid}>
												<FieldLegend>Disponible en</FieldLegend>
												<FieldDescription>
													Selecciona al menos una sucursal comercial.
												</FieldDescription>
												<FieldGroup
													data-slot="checkbox-group"
													className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
												>
													{branchItems.map((branch) => {
														const selectedIndex = field.state.value.indexOf(
															branch.value,
														);
														const checkboxId = `${field.name}-${branch.value}`;
														return (
															<Field
																key={branch.value}
																orientation="horizontal"
																className="rounded-lg border p-3"
															>
																<Checkbox
																	id={checkboxId}
																	name={field.name}
																	checked={selectedIndex !== -1}
																	onCheckedChange={(checked) => {
																		if (checked && selectedIndex === -1)
																			field.pushValue(branch.value);
																		if (!checked && selectedIndex !== -1)
																			field.removeValue(selectedIndex);
																	}}
																	aria-invalid={isInvalid}
																/>
																<FieldLabel htmlFor={checkboxId}>
																	{branch.label}
																</FieldLabel>
															</Field>
														);
													})}
												</FieldGroup>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</FieldSet>
										);
									}}
								</form.Field>
							</div>
						) : null
					}
				</form.Subscribe>
			</section>
		);
	},
});
