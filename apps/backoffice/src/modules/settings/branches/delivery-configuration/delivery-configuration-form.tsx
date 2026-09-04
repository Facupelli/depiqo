import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Switch } from "@repo/ui/components/switch";
import { useForm } from "@tanstack/react-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	createEmptyDistancePriceBand,
	type DeliveryConfigurationFormValues,
	deliveryConfigurationFormSchema,
} from "./delivery-configuration.schema";

// biome-ignore lint/suspicious/noExplicitAny: TanStack Form field inference is intentionally local to the form rendering boundary.
type DeliveryFormField = any;
// biome-ignore lint/suspicious/noExplicitAny: TanStack Form generic type is intentionally local to the form rendering boundary.
type DeliveryFormApi = any;

type DeliveryConfigurationFormProps = {
	defaultValues: DeliveryConfigurationFormValues;
	isPending: boolean;
	submitErrorMessage: string | null;
	onSubmit: (values: DeliveryConfigurationFormValues) => Promise<boolean>;
};

const weekdays = [
	{ value: 1, label: "L" },
	{ value: 2, label: "M" },
	{ value: 3, label: "X" },
	{ value: 4, label: "J" },
	{ value: 5, label: "V" },
	{ value: 6, label: "S" },
	{ value: 0, label: "D" },
];

export function DeliveryConfigurationForm({
	defaultValues,
	isPending,
	submitErrorMessage,
	onSubmit,
}: DeliveryConfigurationFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onChange: deliveryConfigurationFormSchema,
			onSubmit: deliveryConfigurationFormSchema,
		},
		onSubmit: async ({ value }) => {
			const wasSaved = await onSubmit(value);
			if (wasSaved) form.reset(value);
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-6"
		>
			<Card>
				<CardHeader>
					<CardTitle>Estado y moneda</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-6 md:grid-cols-2">
					<form.Field name="enabled">
						{(field: DeliveryFormField) => (
							<Field orientation="horizontal" className="rounded-lg border p-4">
								<div className="flex-1 space-y-1">
									<FieldLabel htmlFor={field.name}>
										Delivery habilitado
									</FieldLabel>
									<FieldDescription>
										Permite cotizar entregas y recogidas desde esta sucursal.
									</FieldDescription>
								</div>
								<Switch
									id={field.name}
									checked={field.state.value}
									onCheckedChange={(checked) =>
										field.handleChange(checked === true)
									}
								/>
							</Field>
						)}
					</form.Field>
					<form.Field name="currency">
						{(field: DeliveryFormField) => (
							<TextField
								field={field}
								label="Moneda"
								maxLength={3}
								placeholder="EUR"
								transform="uppercase"
							/>
						)}
					</form.Field>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Cobertura y precios</CardTitle>
				</CardHeader>
				<CardContent className="space-y-5">
					<p className="text-sm text-muted-foreground">
						Cada importe corresponde a un traslado. Delivery y Collection se
						cobran de forma independiente, al igual que el recargo por horario
						especial.
					</p>
					<form.Field name="distancePriceBands" mode="array">
						{(field: DeliveryFormField) => (
							<div className="space-y-4">
								<div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 px-1 text-sm font-medium text-muted-foreground sm:grid">
									<span>Hasta</span>
									<span>Precio</span>
									<span className="w-9" />
								</div>
								{field.state.value.map(
									(band: { rowId: string }, index: number) => (
										<div
											key={band.rowId}
											className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:border-0 sm:p-0"
										>
											<form.Field
												name={`distancePriceBands[${index}].maxDistanceKm`}
											>
												{(distanceField: DeliveryFormField) => (
													<TextField
														field={distanceField}
														label="Hasta"
														mobileLabel
														suffix="km"
														inputMode="decimal"
														placeholder="5"
													/>
												)}
											</form.Field>
											<form.Field name={`distancePriceBands[${index}].price`}>
												{(priceField: DeliveryFormField) => (
													<TextField
														field={priceField}
														label="Precio"
														mobileLabel
														inputMode="decimal"
														placeholder="20"
													/>
												)}
											</form.Field>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="self-end"
												aria-label={`Eliminar tramo ${index + 1}`}
												onClick={() => field.removeValue(index)}
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
									),
								)}
								{field.state.meta.isTouched && !field.state.meta.isValid ? (
									<FieldError errors={field.state.meta.errors} />
								) : null}
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										field.pushValue(createEmptyDistancePriceBand())
									}
								>
									<Plus className="mr-2 size-4" />
									Agregar tramo
								</Button>
							</div>
						)}
					</form.Field>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Horarios</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<p className="text-sm text-muted-foreground">
						Los mismos días y horarios se aplican a Delivery y Collection.
					</p>
					<form.Field name="eligibleWeekdays">
						{(field: DeliveryFormField) => (
							<Field
								data-invalid={
									field.state.meta.isTouched && !field.state.meta.isValid
								}
							>
								<FieldLabel>Días habilitados</FieldLabel>
								<div className="grid grid-cols-7 gap-2">
									{weekdays.map((day) => {
										const selected = field.state.value.includes(day.value);
										return (
											<button
												key={day.value}
												type="button"
												aria-pressed={selected}
												onClick={() =>
													field.handleChange(
														selected
															? field.state.value.filter(
																	(value: number) => value !== day.value,
																)
															: [...field.state.value, day.value],
													)
												}
												className={cn(
													"rounded-md border py-2 text-sm font-medium transition-colors",
													selected
														? "border-primary bg-primary text-primary-foreground"
														: "text-muted-foreground hover:border-primary/50 hover:text-foreground",
												)}
											>
												{day.label}
											</button>
										);
									})}
								</div>
								{field.state.meta.isTouched && !field.state.meta.isValid ? (
									<FieldError errors={field.state.meta.errors} />
								) : null}
							</Field>
						)}
					</form.Field>
					<TimeWindow
						title="Horario habilitado"
						form={form}
						startName="eligibilityStartTime"
						endName="eligibilityEndTime"
					/>
					<TimeWindow
						title="Horario normal"
						form={form}
						startName="normalServiceStartTime"
						endName="normalServiceEndTime"
					/>
					<form.Field name="specialHoursSurcharge">
						{(field: DeliveryFormField) => (
							<TextField
								field={field}
								label="Recargo por horario especial"
								inputMode="decimal"
								placeholder="0"
							/>
						)}
					</form.Field>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Reserva de transporte</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Tiempo reservado antes y después del alquiler para realizar el
						traslado del equipo.
					</p>
					<form.Field name="transportReservationMinutes">
						{(field: DeliveryFormField) => (
							<TextField
								field={field}
								label="Tiempo reservado"
								suffix="minutos"
								inputMode="numeric"
								placeholder="0"
							/>
						)}
					</form.Field>
				</CardContent>
			</Card>

			{submitErrorMessage ? (
				<p className="text-sm text-destructive">{submitErrorMessage}</p>
			) : null}
			<div className="sticky bottom-0 flex justify-end border-t bg-background/95 py-4 backdrop-blur">
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
							disabled={!canSubmit || !isDirty || isSubmitting || isPending}
						>
							{isSubmitting || isPending ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : null}
							Guardar cambios
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

function TextField({
	field,
	label,
	suffix,
	mobileLabel = false,
	transform,
	...inputProps
}: {
	field: DeliveryFormField;
	label: string;
	suffix?: string;
	mobileLabel?: boolean;
	transform?: "uppercase";
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "onBlur">) {
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<Field data-invalid={isInvalid} className="gap-2">
			<FieldLabel
				htmlFor={field.name}
				className={mobileLabel ? "sm:sr-only" : undefined}
			>
				{label}
			</FieldLabel>
			<div className="relative">
				<Input
					{...inputProps}
					id={field.name}
					name={field.name}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(event) =>
						field.handleChange(
							transform === "uppercase"
								? event.target.value.toUpperCase()
								: event.target.value,
						)
					}
					aria-invalid={isInvalid}
					className={suffix ? "pr-16" : undefined}
				/>
				{suffix ? (
					<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
						{suffix}
					</span>
				) : null}
			</div>
			{isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
		</Field>
	);
}

function TimeWindow({
	title,
	form,
	startName,
	endName,
}: {
	title: string;
	form: DeliveryFormApi;
	startName: "eligibilityStartTime" | "normalServiceStartTime";
	endName: "eligibilityEndTime" | "normalServiceEndTime";
}) {
	return (
		<div className="space-y-3 rounded-lg border p-4">
			<p className="font-medium">{title}</p>
			<div className="grid gap-4 sm:grid-cols-2">
				<form.Field name={startName}>
					{(field: DeliveryFormField) => (
						<TextField field={field} label="Desde" type="time" />
					)}
				</form.Field>
				<form.Field name={endName}>
					{(field: DeliveryFormField) => (
						<TextField field={field} label="Hasta" type="time" />
					)}
				</form.Field>
			</div>
		</div>
	);
}
