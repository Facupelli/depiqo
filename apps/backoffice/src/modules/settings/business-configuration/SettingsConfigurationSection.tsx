import type { UpdateTenantConfigBodyDto } from "@repo/api-contracts";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { formOptions } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import {
	SettingsRow,
	useSettingsForm,
	withSettingsForm,
} from "./settings-form";
import { useUpdateTenantConfig } from "./update-tenant-config.mutation";

export type SettingsConfigurationSection =
	| "business"
	| "rental-policies"
	| "customer-communication"
	| "storefront";

const schemas = {
	business: z.object({
		currency: z.string().regex(/^[A-Z]{3}$/, "Usa un código ISO de 3 letras"),
		locale: z.string().min(1),
		timezone: z.string().min(1),
	}),
	"rental-policies": z.object({
		bookingMode: z.enum(["instant-book", "request-to-book"]),
		weekendCountsAsOne: z.boolean(),
		roundingRule: z.enum([
			"IGNORE_PARTIAL_DAY",
			"BILL_OVER_HALF_DAY",
			"BILL_ANY_PARTIAL_DAY",
		]),
		insuranceEnabled: z.boolean(),
		insuranceRatePercent: z.number().min(0).max(100),
	}),
	"customer-communication": z.object({
		orderCommunicationMode: z.enum(["FORMAL", "WHATSAPP"]),
		whatsAppNumber: z.string(),
	}),
	storefront: z.object({
		newArrivalsWindowDays: z.number().int().positive(),
		showFloatingWhatsAppButton: z.boolean(),
	}),
};

type BusinessConfigurationValues = z.infer<typeof schemas.business>;
type RentalPoliciesConfigurationValues = z.infer<
	(typeof schemas)["rental-policies"]
>;
type CustomerCommunicationConfigurationValues = z.infer<
	(typeof schemas)["customer-communication"]
>;
type StorefrontConfigurationValues = z.infer<typeof schemas.storefront>;

const businessFormDefaults: BusinessConfigurationValues = {
	currency: "",
	locale: "",
	timezone: "",
};
const rentalPoliciesFormDefaults: RentalPoliciesConfigurationValues = {
	bookingMode: "instant-book",
	weekendCountsAsOne: false,
	roundingRule: "IGNORE_PARTIAL_DAY",
	insuranceEnabled: false,
	insuranceRatePercent: 0,
};
const customerCommunicationFormDefaults: CustomerCommunicationConfigurationValues =
	{
		orderCommunicationMode: "FORMAL",
		whatsAppNumber: "",
	};
const storefrontFormDefaults: StorefrontConfigurationValues = {
	newArrivalsWindowDays: 1,
	showFloatingWhatsAppButton: false,
};

const businessFormOptions = formOptions({
	defaultValues: businessFormDefaults,
	validators: { onSubmit: schemas.business },
});
const rentalPoliciesFormOptions = formOptions({
	defaultValues: rentalPoliciesFormDefaults,
	validators: { onSubmit: schemas["rental-policies"] },
});
const customerCommunicationFormOptions = formOptions({
	defaultValues: customerCommunicationFormDefaults,
	validators: { onSubmit: schemas["customer-communication"] },
});
const storefrontFormOptions = formOptions({
	defaultValues: storefrontFormDefaults,
	validators: { onSubmit: schemas.storefront },
});

export function SettingsConfigurationSection({
	section,
}: {
	section: SettingsConfigurationSection;
}) {
	switch (section) {
		case "business":
			return <BusinessConfigurationForm />;
		case "rental-policies":
			return <RentalPoliciesConfigurationForm />;
		case "customer-communication":
			return <CustomerCommunicationConfigurationForm />;
		case "storefront":
			return <StorefrontConfigurationForm />;
	}
}

function BusinessConfigurationForm() {
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const { mutateAsync: updateConfig, isPending } = useUpdateTenantConfig();
	const form = useSettingsForm({
		...businessFormOptions,
		defaultValues: {
			currency: business.config.pricing.currency,
			locale: business.config.pricing.locale,
			timezone: business.config.timezone,
		},
		onSubmit: async ({ value }) => {
			await updateConfig(toBusinessDto(value));
			toast.success("Configuración guardada");
		},
	});
	return (
		<form.AppForm>
			<form.SettingsForm isPending={isPending} framed>
				<BusinessFields form={form} />
			</form.SettingsForm>
		</form.AppForm>
	);
}

function RentalPoliciesConfigurationForm() {
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const { mutateAsync: updateConfig, isPending } = useUpdateTenantConfig();
	const form = useSettingsForm({
		...rentalPoliciesFormOptions,
		defaultValues: {
			bookingMode: business.config.bookingMode,
			weekendCountsAsOne: business.config.pricing.weekendCountsAsOne,
			roundingRule: business.config.pricing.roundingRule,
			insuranceEnabled: business.config.pricing.insuranceEnabled,
			insuranceRatePercent: business.config.pricing.insuranceRatePercent,
		},
		onSubmit: async ({ value }) => {
			await updateConfig(toRentalPoliciesDto(value));
			toast.success("Configuración guardada");
		},
	});
	return (
		<form.AppForm>
			<form.SettingsForm isPending={isPending}>
				<RentalPolicyFields form={form} />
			</form.SettingsForm>
		</form.AppForm>
	);
}

function CustomerCommunicationConfigurationForm() {
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const { mutateAsync: updateConfig, isPending } = useUpdateTenantConfig();
	const form = useSettingsForm({
		...customerCommunicationFormOptions,
		defaultValues: {
			orderCommunicationMode:
				business.config.communication.orderCommunicationMode,
			whatsAppNumber: business.config.communication.whatsAppNumber ?? "",
		},
		onSubmit: async ({ value }) => {
			await updateConfig(toCustomerCommunicationDto(value));
			toast.success("Configuración guardada");
		},
	});
	return (
		<form.AppForm>
			<form.SettingsForm isPending={isPending}>
				<CommunicationFields form={form} />
			</form.SettingsForm>
		</form.AppForm>
	);
}

function StorefrontConfigurationForm() {
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const { mutateAsync: updateConfig, isPending } = useUpdateTenantConfig();
	const form = useSettingsForm({
		...storefrontFormOptions,
		defaultValues: {
			newArrivalsWindowDays: business.config.newArrivalsWindowDays,
			showFloatingWhatsAppButton:
				business.config.communication.showFloatingWhatsAppButton,
		},
		onSubmit: async ({ value }) => {
			await updateConfig(toStorefrontDto(value));
			toast.success("Configuración guardada");
		},
	});
	return (
		<form.AppForm>
			<form.SettingsForm isPending={isPending}>
				<StorefrontFields form={form} />
			</form.SettingsForm>
		</form.AppForm>
	);
}

const BusinessFields = withSettingsForm({
	...businessFormOptions,
	render: ({ form }) => (
		<>
			<form.AppField name="currency">
				{(field) => (
					<field.SettingsTextField
						label="Moneda"
						description="Se usa para mostrar los precios en DEPIQO."
						transform={(value) => value.toUpperCase()}
						align="start"
					/>
				)}
			</form.AppField>
			<form.AppField name="locale">
				{(field) => (
					<SettingsRow label="Idioma" align="start">
						<Field
							data-invalid={
								field.state.meta.isTouched && !field.state.meta.isValid
							}
						>
							<FieldLabel className="sr-only" htmlFor={field.name}>
								Idioma
							</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={(value) => {
									if (value !== null) field.handleChange(value);
								}}
								items={[
									{ value: "es-ES", label: "Español (España)" },
									{ value: "es-AR", label: "Español (Argentina)" },
									{ value: "en-US", label: "Inglés (Estados Unidos)" },
								]}
							>
								<SelectTrigger
									id={field.name}
									aria-invalid={
										field.state.meta.isTouched && !field.state.meta.isValid
									}
									className="w-64"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="es-ES">Español (España)</SelectItem>
									<SelectItem value="es-AR">Español (Argentina)</SelectItem>
									<SelectItem value="en-US">Inglés (Estados Unidos)</SelectItem>
								</SelectContent>
							</Select>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					</SettingsRow>
				)}
			</form.AppField>
			<form.AppField name="timezone">
				{(field) => (
					<field.SettingsTextField
						label="Zona horaria"
						description="Se usa para las fechas y horas de tus alquileres."
						align="start"
					/>
				)}
			</form.AppField>
		</>
	),
});

function SettingsFieldset({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<section className="space-y-3">
			<div>
				<h3 className="text-lg font-semibold">{title}</h3>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
			<div className="divide-y overflow-hidden rounded-xl border bg-card">
				{children}
			</div>
		</section>
	);
}

const RentalPolicyFields = withSettingsForm({
	...rentalPoliciesFormOptions,
	render: ({ form }) => (
		<>
			<SettingsFieldset
				title="Reservas"
				description="Cómo se crean y confirman los alquileres."
			>
				<form.AppField name="bookingMode">
					{(field) => (
						<SettingsRow
							label="Modo de reserva"
							description="Define si una reserva se confirma inmediatamente o requiere revisión."
						>
							<Field
								data-invalid={
									field.state.meta.isTouched && !field.state.meta.isValid
								}
							>
								<FieldLabel className="sr-only" htmlFor={field.name}>
									Modo de reserva
								</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={(value) => {
										if (
											value === "instant-book" ||
											value === "request-to-book"
										) {
											field.handleChange(value);
										}
									}}
									items={[
										{ value: "instant-book", label: "Reserva inmediata" },
										{ value: "request-to-book", label: "Solicitud de reserva" },
									]}
								>
									<SelectTrigger
										id={field.name}
										aria-invalid={
											field.state.meta.isTouched && !field.state.meta.isValid
										}
										className="w-64"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="instant-book">
											Reserva inmediata
										</SelectItem>
										<SelectItem value="request-to-book">
											Solicitud de reserva
										</SelectItem>
									</SelectContent>
								</Select>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						</SettingsRow>
					)}
				</form.AppField>
			</SettingsFieldset>
			<SettingsFieldset
				title="Facturación del alquiler"
				description="Cómo se calcula el tiempo facturable."
			>
				<form.AppField name="weekendCountsAsOne">
					{(field) => (
						<field.SettingsSwitchField
							label="Fin de semana como una sola unidad"
							description="Sábado y domingo cuentan juntos como una unidad de facturación."
						/>
					)}
				</form.AppField>
				<form.AppField name="roundingRule">
					{(field) => (
						<SettingsRow
							label="Comportamiento de cobro diario"
							description="Define cuándo comienza a cobrarse una jornada adicional."
						>
							<Field
								data-invalid={
									field.state.meta.isTouched && !field.state.meta.isValid
								}
							>
								<FieldLabel className="sr-only" htmlFor={field.name}>
									Comportamiento de cobro diario
								</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={(value) => {
										if (
											value === "IGNORE_PARTIAL_DAY" ||
											value === "BILL_OVER_HALF_DAY" ||
											value === "BILL_ANY_PARTIAL_DAY"
										) {
											field.handleChange(value);
										}
									}}
									items={[
										{
											value: "IGNORE_PARTIAL_DAY",
											label: "No cobrar la fracción restante",
										},
										{
											value: "BILL_OVER_HALF_DAY",
											label: "Cobrar desde media jornada extra",
										},
										{
											value: "BILL_ANY_PARTIAL_DAY",
											label: "Cobrar cualquier fracción extra",
										},
									]}
								>
									<SelectTrigger
										id={field.name}
										aria-invalid={
											field.state.meta.isTouched && !field.state.meta.isValid
										}
										className="w-64"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="IGNORE_PARTIAL_DAY">
											No cobrar la fracción restante
										</SelectItem>
										<SelectItem value="BILL_OVER_HALF_DAY">
											Cobrar desde media jornada extra
										</SelectItem>
										<SelectItem value="BILL_ANY_PARTIAL_DAY">
											Cobrar cualquier fracción extra
										</SelectItem>
									</SelectContent>
								</Select>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						</SettingsRow>
					)}
				</form.AppField>
			</SettingsFieldset>
			<SettingsFieldset
				title="Seguro"
				description="Configura si ofreces seguro en los alquileres."
			>
				<form.AppField name="insuranceEnabled">
					{(field) => (
						<field.SettingsSwitchField
							label="Ofrecer seguro de equipos"
							description="Permite añadir seguro durante la reserva."
						/>
					)}
				</form.AppField>
				<form.AppField name="insuranceRatePercent">
					{(field) => (
						<form.Subscribe selector={(state) => state.values.insuranceEnabled}>
							{(insuranceEnabled) => (
								<field.SettingsNumberField
									label="Porcentaje del seguro"
									suffix="%"
									disabled={!insuranceEnabled}
								/>
							)}
						</form.Subscribe>
					)}
				</form.AppField>
			</SettingsFieldset>
		</>
	),
});

const CommunicationFields = withSettingsForm({
	...customerCommunicationFormOptions,
	render: ({ form }) => (
		<>
			<form.AppField name="orderCommunicationMode">
				{(field) => (
					<SettingsRow label="Modo de comunicación">
						<Field
							data-invalid={
								field.state.meta.isTouched && !field.state.meta.isValid
							}
						>
							<FieldLabel className="sr-only" htmlFor={field.name}>
								Modo de comunicación
							</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={(value) => {
									if (value === "FORMAL" || value === "WHATSAPP") {
										field.handleChange(value);
									}
								}}
								items={[
									{ value: "FORMAL", label: "Formal" },
									{ value: "WHATSAPP", label: "WhatsApp" },
								]}
							>
								<SelectTrigger
									id={field.name}
									aria-invalid={
										field.state.meta.isTouched && !field.state.meta.isValid
									}
									className="w-64"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="FORMAL">Formal</SelectItem>
									<SelectItem value="WHATSAPP">WhatsApp</SelectItem>
								</SelectContent>
							</Select>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					</SettingsRow>
				)}
			</form.AppField>
			<form.AppField name="whatsAppNumber">
				{(field) => (
					<field.SettingsTextField
						label="Número"
						description="Incluye el prefijo internacional."
					/>
				)}
			</form.AppField>
		</>
	),
});

const StorefrontFields = withSettingsForm({
	...storefrontFormOptions,
	render: ({ form }) => (
		<>
			<form.AppField name="newArrivalsWindowDays">
				{(field) => (
					<field.SettingsNumberField
						label={'Mostrar productos como "Nuevos" durante'}
						suffix="días"
					/>
				)}
			</form.AppField>
			<form.AppField name="showFloatingWhatsAppButton">
				{(field) => (
					<field.SettingsSwitchField
						label="Mostrar botón de WhatsApp"
						description="Muestra un acceso directo a WhatsApp en la tienda."
					/>
				)}
			</form.AppField>
		</>
	),
});

function toBusinessDto(
	value: BusinessConfigurationValues,
): UpdateTenantConfigBodyDto {
	return {
		pricing: { currency: value.currency, locale: value.locale },
		timezone: value.timezone,
	};
}
function toRentalPoliciesDto(
	value: RentalPoliciesConfigurationValues,
): UpdateTenantConfigBodyDto {
	return {
		bookingMode: value.bookingMode,
		pricing: {
			weekendCountsAsOne: value.weekendCountsAsOne,
			roundingRule: value.roundingRule,
			insuranceEnabled: value.insuranceEnabled,
			insuranceRatePercent: value.insuranceRatePercent,
		},
	};
}
function toCustomerCommunicationDto(
	value: CustomerCommunicationConfigurationValues,
): UpdateTenantConfigBodyDto {
	return {
		communication: {
			orderCommunicationMode: value.orderCommunicationMode,
			whatsAppNumber: value.whatsAppNumber.trim() || undefined,
		},
	};
}
function toStorefrontDto(
	value: StorefrontConfigurationValues,
): UpdateTenantConfigBodyDto {
	return {
		newArrivalsWindowDays: value.newArrivalsWindowDays,
		communication: {
			showFloatingWhatsAppButton: value.showFloatingWhatsAppButton,
		},
	};
}
