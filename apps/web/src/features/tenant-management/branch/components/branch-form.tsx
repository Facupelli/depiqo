import { useForm, useStore } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
	type BranchFormValues,
	type BranchScheduleWindowFormValues,
	branchFormDefaults,
	type branchFormSchema,
	daysOfWeek,
	getSupportedTimezones,
	slotIntervalOptions,
} from "./branch-form.schema";

// biome-ignore lint/suspicious/noExplicitAny: TanStack Form generic type is intentionally kept local to this form helper boundary.
type BranchFormApi = any;
// biome-ignore lint/suspicious/noExplicitAny: TanStack Form field inference is not portable outside the component.
type BranchFormField = any;
type BranchFormStoreState = { values: BranchFormValues };
interface BranchFormProps {
	formId: string;
	defaultValues?: BranchFormValues;
	validator: typeof branchFormSchema;
	submitLabel: string;
	isPending: boolean;
	requireDirty?: boolean;
	onSubmit: (values: BranchFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function BranchForm({
	formId,
	defaultValues = branchFormDefaults,
	validator,
	submitLabel,
	isPending,
	requireDirty = true,
	onSubmit,
	onCancel,
}: BranchFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: validator,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const supportedTimezones = getSupportedTimezones().filter(
		(timezone) =>
			timezone.startsWith("Europe/") || timezone.startsWith("America/"),
	);
	const supportsDelivery = useStore(
		form.store,
		(state) => state.values.supportsDelivery,
	);
	const scheduleEnabled = useStore(
		form.store,
		(state) => state.values.scheduleEnabled,
	);
	const useSameScheduleForPickupAndReturn = useStore(
		form.store,
		(state) => state.values.useSameScheduleForPickupAndReturn,
	);
	const pickupSchedule = useStore(
		form.store,
		(state) => state.values.pickupSchedule,
	);
	const returnSchedule = useStore(
		form.store,
		(state) => state.values.returnSchedule,
	);

	return (
		<>
			<form
				id={formId}
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
			>
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<StepBadge>1</StepBadge>
								Datos de la sucursal
							</CardTitle>
						</CardHeader>
						<CardContent>
							<FieldGroup className="grid gap-4 md:grid-cols-3">
								<form.Field name="name">
									{(field: BranchFormField) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;

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
													placeholder="Ej. Sucursal central"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>

								<form.Field name="address">
									{(field: BranchFormField) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;

										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>Dirección</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(event) =>
														field.handleChange(event.target.value)
													}
													aria-invalid={isInvalid}
													placeholder="Ej. Av. Corrientes 1234"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>

								<form.Field name="timezone">
									{(field: BranchFormField) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;

										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>
													Zona horaria
												</FieldLabel>
												<NativeSelect
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(event) =>
														field.handleChange(event.target.value)
													}
													aria-invalid={isInvalid}
													className="w-full"
												>
													<NativeSelectOption value="">
														Usar zona horaria del tenant
													</NativeSelectOption>
													{supportedTimezones.map((timezone) => (
														<NativeSelectOption key={timezone} value={timezone}>
															{timezone}
														</NativeSelectOption>
													))}
												</NativeSelect>
												<FieldDescription>
													Opcional. Si se define, sobrescribe la zona horaria
													global.
												</FieldDescription>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							</FieldGroup>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<StepBadge>2</StepBadge>
								Entrega a domicilio
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-5">
							<form.Field name="supportsDelivery">
								{(field: BranchFormField) => (
									<Field orientation="horizontal">
										<Switch
											id={field.name}
											checked={field.state.value}
											onCheckedChange={(checked) =>
												field.handleChange(checked === true)
											}
										/>
										<div>
											<FieldLabel htmlFor={field.name}>
												Habilitar envíos
											</FieldLabel>
											<FieldDescription>
												Si está apagado, no se enviarán defaults de entrega.
											</FieldDescription>
										</div>
									</Field>
								)}
							</form.Field>

							{supportsDelivery && (
								<div className="grid gap-4 sm:grid-cols-2">
									<DeliveryTextField
										form={form}
										name="deliveryDefaultCountry"
										label="País"
										placeholder="Argentina"
									/>
									<DeliveryTextField
										form={form}
										name="deliveryDefaultStateRegion"
										label="Provincia / región"
										placeholder="Buenos Aires"
									/>
									<DeliveryTextField
										form={form}
										name="deliveryDefaultCity"
										label="Ciudad"
										placeholder="CABA"
									/>
									<DeliveryTextField
										form={form}
										name="deliveryDefaultPostalCode"
										label="Código postal"
										placeholder="1425"
									/>
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<StepBadge>3</StepBadge>
								Horarios iniciales
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-5">
							<form.Field name="scheduleEnabled">
								{(field: BranchFormField) => (
									<Field orientation="horizontal">
										<Switch
											id={field.name}
											checked={field.state.value}
											onCheckedChange={(checked) =>
												field.handleChange(checked === true)
											}
										/>
										<div>
											<FieldLabel htmlFor={field.name}>
												Configurar ahora
											</FieldLabel>
											<FieldDescription>
												Puedes crear la sucursal sin horarios y agregarlos
												luego.
											</FieldDescription>
										</div>
									</Field>
								)}
							</form.Field>

							{scheduleEnabled && (
								<>
									<ScheduleWindowFields
										form={form}
										prefix="pickupSchedule"
										title="Retiros"
									/>

									<form.Field name="useSameScheduleForPickupAndReturn">
										{(field: BranchFormField) => (
											<Field
												orientation="horizontal"
												className="rounded-lg border p-3"
											>
												<Switch
													id={field.name}
													checked={field.state.value}
													onCheckedChange={(checked) =>
														field.handleChange(checked === true)
													}
												/>
												<div>
													<FieldLabel htmlFor={field.name}>
														Usar el mismo horario para devoluciones
													</FieldLabel>
													<FieldDescription>
														Apágalo si las devoluciones tienen otra ventana.
													</FieldDescription>
												</div>
											</Field>
										)}
									</form.Field>

									{!useSameScheduleForPickupAndReturn && (
										<ScheduleWindowFields
											form={form}
											prefix="returnSchedule"
											title="Devoluciones"
										/>
									)}
								</>
							)}
						</CardContent>
					</Card>
				</div>

				<aside className="xl:sticky xl:top-6 xl:self-start">
					<ProcessSummary
						scheduleEnabled={scheduleEnabled}
						useSameScheduleForPickupAndReturn={
							useSameScheduleForPickupAndReturn
						}
						pickupSchedule={pickupSchedule}
						returnSchedule={returnSchedule}
					/>
				</aside>
			</form>

			<div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t bg-background/95 py-4 backdrop-blur">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isPending}
				>
					Cancelar
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
							disabled={
								!canSubmit ||
								(requireDirty && !isDirty) ||
								isSubmitting ||
								isPending
							}
						>
							{(isSubmitting || isPending) && (
								<Loader2 className="mr-2 size-4 animate-spin" />
							)}
							{submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}

function StepBadge({ children }: { children: ReactNode }) {
	return (
		<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
			{children}
		</span>
	);
}

function DeliveryTextField({
	form,
	name,
	label,
	placeholder,
}: {
	form: BranchFormApi;
	name:
		| "deliveryDefaultCountry"
		| "deliveryDefaultStateRegion"
		| "deliveryDefaultCity"
		| "deliveryDefaultPostalCode";
	label: string;
	placeholder: string;
}) {
	return (
		<form.Field name={name}>
			{(field: BranchFormField) => {
				const isInvalid =
					field.state.meta.isTouched && !field.state.meta.isValid;

				return (
					<Field data-invalid={isInvalid}>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<Input
							id={field.name}
							name={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							aria-invalid={isInvalid}
							placeholder={placeholder}
						/>
						{isInvalid && <FieldError errors={field.state.meta.errors} />}
					</Field>
				);
			}}
		</form.Field>
	);
}

function ScheduleWindowFields({
	form,
	prefix,
	title,
}: {
	form: BranchFormApi;
	prefix: "pickupSchedule" | "returnSchedule";
	title: string;
}) {
	const window = useStore(
		form.store,
		(state) => (state as BranchFormStoreState).values[prefix],
	);
	const isFixedHour = window.openTime === window.closeTime;

	return (
		<div className="space-y-4 rounded-xl border p-4">
			<p className="font-medium">{title}</p>

			<form.Field name={`${prefix}.daysOfWeek`}>
				{(field: BranchFormField) => {
					const isInvalid =
						field.state.meta.isTouched && !field.state.meta.isValid;

					function toggleDay(day: number) {
						const current = field.state.value;
						const next = current.includes(day)
							? current.filter((value: number) => value !== day)
							: [...current, day].sort((a, b) => a - b);
						field.handleChange(next);
					}

					return (
						<Field data-invalid={isInvalid}>
							<FieldLabel>Días</FieldLabel>
							<div className="grid grid-cols-7 gap-1.5">
								{daysOfWeek.map((day) => {
									const selected = field.state.value.includes(day.value);

									return (
										<button
											key={day.value}
											type="button"
											onClick={() => toggleDay(day.value)}
											aria-pressed={selected}
											className={cn(
												"rounded-md border py-2 text-xs font-medium transition-colors",
												selected
													? "border-foreground bg-foreground text-background"
													: "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
											)}
										>
											{day.label}
										</button>
									);
								})}
							</div>
							{isInvalid && <FieldError errors={field.state.meta.errors} />}
						</Field>
					);
				}}
			</form.Field>

			<div className="grid grid-cols-2 gap-3">
				<form.Field name={`${prefix}.openTime`}>
					{(field: BranchFormField) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;

						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Desde</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="time"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => {
										field.handleChange(event.target.value);
										if (
											event.target.value ===
											form.getFieldValue(`${prefix}.closeTime`)
										) {
											form.setFieldValue(`${prefix}.slotIntervalMinutes`, null);
										}
									}}
									aria-invalid={isInvalid}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>

				<form.Field name={`${prefix}.closeTime`}>
					{(field: BranchFormField) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;

						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Hasta</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="time"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => {
										field.handleChange(event.target.value);
										if (
											event.target.value ===
											form.getFieldValue(`${prefix}.openTime`)
										) {
											form.setFieldValue(`${prefix}.slotIntervalMinutes`, null);
										}
									}}
									aria-invalid={isInvalid}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
			</div>

			{!isFixedHour && (
				<form.Field name={`${prefix}.slotIntervalMinutes`}>
					{(field: BranchFormField) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;

						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel>Intervalo</FieldLabel>
								<div className="grid grid-cols-3 gap-2">
									{slotIntervalOptions.map((minutes) => (
										<button
											key={minutes}
											type="button"
											onClick={() => field.handleChange(minutes)}
											className={cn(
												"rounded-md border py-2 text-sm font-medium transition-colors",
												field.state.value === minutes
													? "border-foreground bg-foreground text-background"
													: "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
											)}
										>
											{minutes} min
										</button>
									))}
								</div>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
			)}
		</div>
	);
}

function ProcessSummary({
	scheduleEnabled,
	useSameScheduleForPickupAndReturn,
	pickupSchedule,
	returnSchedule,
}: {
	scheduleEnabled: boolean;
	useSameScheduleForPickupAndReturn: boolean;
	pickupSchedule: BranchScheduleWindowFormValues;
	returnSchedule: BranchScheduleWindowFormValues;
}) {
	const effectiveReturn = useSameScheduleForPickupAndReturn
		? pickupSchedule
		: returnSchedule;

	return (
		<Card size="sm" className="border-foreground/10 bg-muted/20">
			<CardHeader>
				<CardTitle>Resumen</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="rounded-lg border bg-background p-3">
					<p className="text-sm font-medium">Horarios iniciales</p>
					{!scheduleEnabled ? (
						<p className="mt-1 text-sm text-muted-foreground">
							Sin horarios iniciales.
						</p>
					) : (
						<div className="mt-3 space-y-2">
							<PreviewLine label="Retiros" schedule={pickupSchedule} />
							<PreviewLine label="Devoluciones" schedule={effectiveReturn} />
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function PreviewLine({
	label,
	schedule,
}: {
	label: string;
	schedule: BranchScheduleWindowFormValues;
}) {
	return (
		<div className="rounded-lg border p-3">
			<p className="text-sm font-medium">{label}</p>
			<p className="text-sm text-muted-foreground">
				{schedule.daysOfWeek.length} días · {schedule.openTime}–
				{schedule.closeTime}
				{schedule.slotIntervalMinutes !== null
					? ` · cada ${schedule.slotIntervalMinutes} min`
					: " · hora fija"}
			</p>
		</div>
	);
}
