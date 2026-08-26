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
import { Plus, Trash2 } from "lucide-react";
import { withForm } from "@/shared/contexts/form.context";
import {
	createEmptyPricePlanTier,
	createPricePlanBaseFormDefaultValues,
} from "./create-price-plan.schema";

const BILLING_UNIT_ITEMS = [
	{ value: "HOUR", label: "Hora" },
	{ value: "DAY", label: "Día" },
	{ value: "WEEK", label: "Semana" },
] as const;

export const PricePlanFields = withForm({
	defaultValues: createPricePlanBaseFormDefaultValues(),
	render: function Render({ form }) {
		return (
			<>
				<FieldGroup className="grid gap-5 md:grid-cols-2">
					<form.Field name="name">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid} className="md:col-span-2">
									<FieldLabel htmlFor={field.name}>Nombre del plan</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="text"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={isInvalid}
										placeholder="Ej. Tarifa diaria estándar"
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="billingUnit">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel>Unidad de cobro</FieldLabel>
									<Select
										items={BILLING_UNIT_ITEMS}
										value={field.state.value}
										onValueChange={(value) => {
											if (
												value === "HOUR" ||
												value === "DAY" ||
												value === "WEEK"
											) {
												field.handleChange(value);
											}
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecciona una unidad" />
										</SelectTrigger>
										<SelectContent>
											{BILLING_UNIT_ITEMS.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="currency">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Moneda</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											field.handleChange(event.target.value.toUpperCase())
										}
										aria-invalid={isInvalid}
										placeholder="ARS"
										maxLength={3}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				</FieldGroup>

				<section className="space-y-4 border-t pt-6">
					<div>
						<p className="font-medium text-foreground text-sm">Tramos</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Define manualmente los rangos y el precio por unidad de cada
							tramo.
						</p>
					</div>

					<form.Field name="tiers" mode="array">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<div className="space-y-4">
									<div className="rounded-sm border">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Desde</TableHead>
													<TableHead>Hasta</TableHead>
													<TableHead>Precio por unidad</TableHead>
													<TableHead className="w-12" />
												</TableRow>
											</TableHeader>
											<TableBody>
												{field.state.value.map((tier, index) => (
													<TableRow key={`${index}-${tier.fromUnit}`}>
														<TableCell>
															<form.Field name={`tiers[${index}].fromUnit`}>
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
																				onChange={(event) =>
																					subField.handleChange(
																						event.target.valueAsNumber,
																					)
																				}
																				aria-invalid={subFieldInvalid}
																			/>
																			{subFieldInvalid && (
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
															<form.Field name={`tiers[${index}].toUnit`}>
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
																				value={subField.state.value ?? ""}
																				onBlur={subField.handleBlur}
																				onChange={(event) =>
																					subField.handleChange(
																						event.target.value === ""
																							? null
																							: event.target.valueAsNumber,
																					)
																				}
																				aria-invalid={subFieldInvalid}
																				placeholder="Sin límite"
																			/>
																			{subFieldInvalid && (
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
															<form.Field name={`tiers[${index}].pricePerUnit`}>
																{(subField) => {
																	const subFieldInvalid =
																		subField.state.meta.isTouched &&
																		!subField.state.meta.isValid;

																	return (
																		<Field data-invalid={subFieldInvalid}>
																			<Input
																				inputMode="decimal"
																				value={subField.state.value}
																				onBlur={subField.handleBlur}
																				onChange={(event) =>
																					subField.handleChange(
																						event.target.value,
																					)
																				}
																				aria-invalid={subFieldInvalid}
																				placeholder="0.00"
																			/>
																			{subFieldInvalid && (
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
																disabled={field.state.value.length <= 1}
																aria-label={`Eliminar tramo ${index + 1}`}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>

									<Button
										type="button"
										variant="outline"
										onClick={() => field.pushValue(createEmptyPricePlanTier())}
									>
										<Plus className="mr-2 h-4 w-4" />
										Agregar tramo
									</Button>

									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</div>
							);
						}}
					</form.Field>
				</section>
			</>
		);
	},
});
