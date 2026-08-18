import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Switch } from "@repo/ui/components/switch";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { useUpdateTenantConfig } from "@/modules/settings/business-configuration/update-tenant-config.mutation";
import { ProblemDetailsError } from "@/shared/errors";
import {
	createTenantConfigFormDefaultValues,
	TENANT_CONFIG_VALUES,
	type TenantConfigFormValues,
	tenantConfigFormSchema,
	tenantConfigToFormValues,
	toUpdateTenantConfigDto,
} from "./insurance-settings.schema";

export type TenantConfigSection = "pricing" | "general" | "insurance";

export function InsuranceSettingsSection() {
	const section: TenantConfigSection = "insurance";
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const { mutateAsync: updateConfig, isPending } = useUpdateTenantConfig();
	const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
		null,
	);

	async function handleSubmit(values: TenantConfigFormValues) {
		const dto = toUpdateTenantConfigDto(values);

		try {
			setSubmitErrorMessage(null);
			await updateConfig(dto);
			toast.success("Configuración guardada");
		} catch (error) {
			const submitError = getSubmitError(error);

			if (submitError) {
				setSubmitErrorMessage(submitError.message);
				return;
			}

			throw error;
		}
	}

	return (
		<TenantConfigForm
			key={business.id}
			section={section}
			defaultValues={tenantConfigToFormValues(business.config)}
			onSubmit={handleSubmit}
			isPending={isPending}
			submitErrorMessage={submitErrorMessage}
		/>
	);
}

interface TenantConfigFormProps {
	section: TenantConfigSection;
	defaultValues?: TenantConfigFormValues;
	isPending: boolean;
	submitErrorMessage?: string | null;
	onSubmit: (values: TenantConfigFormValues) => Promise<void>;
}

export function TenantConfigForm({
	section,
	defaultValues,
	isPending,
	submitErrorMessage,
	onSubmit,
}: TenantConfigFormProps) {
	const form = useForm({
		defaultValues: defaultValues ?? createTenantConfigFormDefaultValues(),
		validators: {
			onSubmit: tenantConfigFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	function renderSectionFields() {
		switch (section) {
			case "pricing":
				return <PricingSettingsFields form={form} />;
			case "insurance":
				return <InsuranceSettingsFields form={form} />;
			case "general":
				return <GeneralSettingsFields form={form} />;
		}
	}

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-6"
		>
			{renderSectionFields()}

			{submitErrorMessage ? (
				<p className="text-sm text-destructive">{submitErrorMessage}</p>
			) : null}

			<div className="flex justify-end">
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isSubmitting]) => (
						<Button type="submit" disabled={!canSubmit || isPending}>
							{isSubmitting || isPending
								? "Guardando..."
								: "Guardar configuración"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

// biome-ignore lint/suspicious/noExplicitAny: TanStack Form generic type is intentionally kept local to this form helper boundary.
type TenantConfigSettingsFormApi = any;
// biome-ignore lint/suspicious/noExplicitAny: TanStack Form field inference is not portable outside the component.
type TenantConfigFormField = any;

function PricingSettingsFields({
	form,
}: {
	form: TenantConfigSettingsFormApi;
}) {
	return (
		<div className="rounded-xl border border-border bg-card divide-y divide-border">
			<form.Field name="weekendCountsAsOne">
				{(field: TenantConfigFormField) => (
					<div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
						<div>
							<p className="text-sm font-semibold text-foreground">
								Sistema day/weekend
							</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								Si Sabado y Domingo quedan ocupados, cuentan como una sola
								unidad de facturación en alquileres diarios.
							</p>
						</div>
						<div className="pt-1">
							<Switch
								checked={field.state.value}
								onCheckedChange={field.handleChange}
								aria-label="Toggle weekend billing"
							/>
						</div>
					</div>
				)}
			</form.Field>

			<form.Field name="roundingRule">
				{(field: TenantConfigFormField) => (
					<div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
						<div>
							<div className="flex items-center gap-2">
								<p className="text-sm font-semibold text-foreground">
									Comportamiento de cobro diario
								</p>
								<Popover>
									<PopoverTrigger
										render={
											<button
												type="button"
												aria-label="Más información sobre el comportamiento de cobro diario"
												className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
											>
												<CircleHelp className="h-3.5 w-3.5" />
											</button>
										}
									/>
									<PopoverContent
										align="start"
										sideOffset={8}
										className="w-80 gap-2"
									>
										<PopoverHeader className="gap-2">
											<PopoverTitle>Cómo funciona cada opción</PopoverTitle>
											<PopoverDescription className="space-y-3 text-xs leading-5">
												<p>
													<span className="font-medium text-foreground">
														No cobrar la fracción restante:
													</span>{" "}
													solo cobra días completos de 24 horas.
												</p>
												<p>
													<span className="font-medium text-foreground">
														Cobrar desde media jornada extra:
													</span>{" "}
													suma la siguiente unidad recién cuando se supera la
													mitad del próximo día.
												</p>
												<p>
													<span className="font-medium text-foreground">
														Cobrar cualquier fracción extra:
													</span>{" "}
													cualquier tiempo adicional después de un día completo
													suma una nueva unidad.
												</p>
											</PopoverDescription>
										</PopoverHeader>
									</PopoverContent>
								</Popover>
							</div>
							<p className="text-xs text-muted-foreground mt-0.5">
								Define cómo se cobra el tiempo adicional una vez cumplida cada
								jornada de 24 horas.
							</p>
						</div>
						<Select
							value={field.state.value}
							onValueChange={field.handleChange}
							items={[
								{
									value: TENANT_CONFIG_VALUES.roundingRule.ignorePartialDay,
									label: "No cobrar la fracción restante",
								},
								{
									value: TENANT_CONFIG_VALUES.roundingRule.billOverHalfDay,
									label: "Cobrar desde media jornada extra",
								},
								{
									value: TENANT_CONFIG_VALUES.roundingRule.billAnyPartialDay,
									label: "Cobrar cualquier fracción extra",
								},
							]}
						>
							<SelectTrigger className="w-[20rem] max-w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem
									value={TENANT_CONFIG_VALUES.roundingRule.ignorePartialDay}
								>
									No cobrar la fracción restante
								</SelectItem>
								<SelectItem
									value={TENANT_CONFIG_VALUES.roundingRule.billOverHalfDay}
								>
									Cobrar desde media jornada extra
								</SelectItem>
								<SelectItem
									value={TENANT_CONFIG_VALUES.roundingRule.billAnyPartialDay}
								>
									Cobrar cualquier fracción extra
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}
			</form.Field>

			<TextField
				form={form}
				name="currency"
				label="Default currency"
				description="ISO 4217 code (e.g. USD, ARS, EUR)."
				inputClassName="w-24 text-right uppercase"
				maxLength={3}
				transform={(value) => value.toUpperCase()}
				placeholder="ARS"
			/>

			<form.Field name="locale">
				{(field: TenantConfigFormField) => (
					<div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
						<div>
							<p className="text-sm font-semibold text-foreground">Locale</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								Como se muestra el precio en la aplicación.
							</p>
						</div>
						<Select
							value={field.state.value}
							onValueChange={(value) => value && field.handleChange(value)}
						>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="es-AR">Español (AR)</SelectItem>
								<SelectItem value="es-ES">Español (ES)</SelectItem>
								<SelectItem value="en-US">Inglés (US)</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}
			</form.Field>
		</div>
	);
}

function InsuranceSettingsFields({
	form,
}: {
	form: TenantConfigSettingsFormApi;
}) {
	return (
		<div className="rounded-xl border border-border bg-card divide-y divide-border">
			<form.Field name="insuranceEnabled">
				{(field: TenantConfigFormField) => (
					<SwitchRow
						title="Habilitar seguro de equipos"
						description="Muestra la opción de seguro en la tienda y permite aplicarlo a los pedidos."
						checked={field.state.value}
						onCheckedChange={field.handleChange}
						ariaLabel="Habilitar seguro de equipos"
					/>
				)}
			</form.Field>

			<form.Subscribe
				selector={(state: { values: TenantConfigFormValues }) =>
					state.values.insuranceEnabled
				}
			>
				{(insuranceEnabled: boolean) => (
					<form.Field name="insuranceRatePercent">
						{(field: TenantConfigFormField) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
									<div>
										<p className="text-sm font-semibold text-foreground">
											Porcentaje del seguro
										</p>
										<p className="mt-0.5 text-xs text-muted-foreground">
											Porcentaje aplicado sobre el subtotal antes de descuentos.
											Debe estar entre 0 y 100.
										</p>
									</div>
									<Field data-invalid={isInvalid} className="items-end pt-1">
										<FieldLabel htmlFor={field.name} className="sr-only">
											Porcentaje del seguro
										</FieldLabel>
										<div className="flex items-center gap-2">
											<Input
												id={field.name}
												type="number"
												min={0}
												max={100}
												step={0.1}
												value={field.state.value}
												onChange={(event) =>
													field.handleChange(Number(event.target.value))
												}
												onBlur={field.handleBlur}
												disabled={!insuranceEnabled}
												className="w-24 text-right"
											/>
											<span className="text-sm text-muted-foreground">%</span>
										</div>
										{isInvalid ? (
											<FieldError errors={field.state.meta.errors} />
										) : null}
									</Field>
								</div>
							);
						}}
					</form.Field>
				)}
			</form.Subscribe>
		</div>
	);
}

function GeneralSettingsFields({
	form,
}: {
	form: TenantConfigSettingsFormApi;
}) {
	return (
		<div className="rounded-xl border border-border bg-card divide-y divide-border">
			<form.Field name="bookingMode">
				{(field: TenantConfigFormField) => (
					<SelectRow
						label="Modo de reserva"
						description="Elegí si las reservas se confirman automáticamente o si primero deben ser revisadas por tu equipo."
						value={field.state.value}
						onValueChange={field.handleChange}
						options={[
							{
								value: TENANT_CONFIG_VALUES.bookingMode.instantBook,
								label: "Reserva inmediata",
							},
							{
								value: TENANT_CONFIG_VALUES.bookingMode.requestToBook,
								label: "Solicitud de reserva",
							},
						]}
					/>
				)}
			</form.Field>

			<form.Field name="orderCommunicationMode">
				{(field: TenantConfigFormField) => (
					<SelectRow
						label="Modo de comunicación de pedidos"
						description="Define cómo continúa la comunicación con el cliente después de crear un pedido."
						value={field.state.value}
						onValueChange={field.handleChange}
						options={[
							{
								value: TENANT_CONFIG_VALUES.orderCommunicationMode.formal,
								label: "Formal",
							},
							{
								value: TENANT_CONFIG_VALUES.orderCommunicationMode.whatsApp,
								label: "WhatsApp",
							},
						]}
					/>
				)}
			</form.Field>

			<form.Subscribe
				selector={(state: { values: TenantConfigFormValues }) => ({
					whatsAppNumber: state.values.whatsAppNumber,
				})}
			>
				{({ whatsAppNumber }: { whatsAppNumber: string }) => {
					const hasWhatsAppNumber = Boolean(whatsAppNumber.trim());
					return (
						<>
							<TextField
								form={form}
								name="whatsAppNumber"
								label="Número de WhatsApp"
								description="Ingresá el número en formato internacional, sin espacios ni símbolos. Ejemplo: 5491123456789."
								inputClassName="w-56 text-right"
								placeholder="5491123456789"
							/>
							<form.Field name="showFloatingWhatsAppButton">
								{(field: TenantConfigFormField) => (
									<SwitchRow
										title="Mostrar botón flotante de WhatsApp"
										description={
											hasWhatsAppNumber
												? "Muestra un acceso rápido a WhatsApp en la tienda. Esta opción es independiente del modo de comunicación de pedidos."
												: "Primero configurá un número de WhatsApp para poder habilitar este botón."
										}
										checked={field.state.value}
										onCheckedChange={field.handleChange}
										disabled={!hasWhatsAppNumber}
										ariaLabel="Mostrar botón flotante de WhatsApp"
									/>
								)}
							</form.Field>
						</>
					);
				}}
			</form.Subscribe>

			<TextField
				form={form}
				name="timezone"
				label="Timezone"
				description="IANA timezone identifier (e.g. America/Argentina/Buenos_Aires)."
				inputClassName="w-56 text-right"
				placeholder="UTC"
			/>
			<NumberField
				form={form}
				name="newArrivalsWindowDays"
				label="New arrivals window"
				description='Days a product is shown as "new" after being added.'
				suffix="days"
				min={1}
				step={1}
			/>
		</div>
	);
}

function TextField({
	form,
	name,
	label,
	description,
	inputClassName,
	maxLength,
	transform,
	placeholder,
}: {
	form: TenantConfigSettingsFormApi;
	name: keyof TenantConfigFormValues;
	label: string;
	description: string;
	inputClassName?: string;
	maxLength?: number;
	transform?: (value: string) => string;
	placeholder?: string;
}) {
	return (
		<form.Field name={name}>
			{(field: TenantConfigFormField) => {
				const isInvalid =
					field.state.meta.isTouched && !field.state.meta.isValid;
				return (
					<div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
						<div>
							<p className="text-sm font-semibold text-foreground">{label}</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								{description}
							</p>
						</div>
						<Field data-invalid={isInvalid} className="items-end pt-1">
							<FieldLabel htmlFor={field.name} className="sr-only">
								{label}
							</FieldLabel>
							<Input
								id={field.name}
								value={String(field.state.value)}
								onChange={(event) =>
									field.handleChange(
										transform
											? transform(event.target.value)
											: event.target.value,
									)
								}
								onBlur={field.handleBlur}
								maxLength={maxLength}
								className={inputClassName}
								placeholder={placeholder}
							/>
							{isInvalid ? (
								<FieldError errors={field.state.meta.errors} />
							) : null}
						</Field>
					</div>
				);
			}}
		</form.Field>
	);
}

function NumberField({
	form,
	name,
	label,
	description,
	suffix,
	min,
	step,
}: {
	form: TenantConfigSettingsFormApi;
	name: keyof TenantConfigFormValues;
	label: string;
	description: string;
	suffix: string;
	min: number;
	step: number;
}) {
	return (
		<form.Field name={name}>
			{(field: TenantConfigFormField) => {
				const isInvalid =
					field.state.meta.isTouched && !field.state.meta.isValid;
				return (
					<div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
						<div>
							<p className="text-sm font-semibold text-foreground">{label}</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								{description}
							</p>
						</div>
						<Field data-invalid={isInvalid} className="items-end pt-1">
							<div className="flex items-center gap-2">
								<Input
									id={field.name}
									type="number"
									min={min}
									step={step}
									value={Number(field.state.value)}
									onChange={(event) =>
										field.handleChange(Number(event.target.value))
									}
									onBlur={field.handleBlur}
									className="w-24 text-right"
								/>
								<span className="text-sm text-muted-foreground">{suffix}</span>
							</div>
							{isInvalid ? (
								<FieldError errors={field.state.meta.errors} />
							) : null}
						</Field>
					</div>
				);
			}}
		</form.Field>
	);
}

function SelectRow({
	label,
	description,
	value,
	onValueChange,
	options,
}: {
	label: string;
	description: string;
	value: string;
	onValueChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
}) {
	return (
		<div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
			<div>
				<p className="text-sm font-semibold text-foreground">{label}</p>
				<p className="text-xs text-muted-foreground mt-0.5">{description}</p>
			</div>
			<Select
				value={value}
				onValueChange={(nextValue) => {
					if (nextValue) {
						onValueChange(nextValue);
					}
				}}
				items={options}
			>
				<SelectTrigger className="w-52">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function SwitchRow({
	title,
	description,
	checked,
	onCheckedChange,
	disabled,
	ariaLabel,
}: {
	title: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
	ariaLabel: string;
}) {
	return (
		<div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
			<div>
				<p className="text-sm font-semibold text-foreground">{title}</p>
				<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
			</div>
			<div className="pt-1">
				<Switch
					checked={checked}
					onCheckedChange={onCheckedChange}
					disabled={disabled}
					aria-label={ariaLabel}
				/>
			</div>
		</div>
	);
}

function getSubmitError(error: unknown) {
	if (error instanceof ProblemDetailsError) {
		return {
			message:
				error.problemDetails.detail ?? "No se pudo guardar la configuración.",
		};
	}

	return null;
}
