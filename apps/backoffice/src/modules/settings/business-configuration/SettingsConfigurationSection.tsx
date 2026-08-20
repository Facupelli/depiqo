// biome-ignore-all lint/suspicious/noExplicitAny: TanStack Form field types vary across the independent settings forms.
import type { UpdateTenantConfigBodyDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
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
import type { ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
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

export function SettingsConfigurationSection({
	section,
}: {
	section: SettingsConfigurationSection;
}) {
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const { mutateAsync: updateConfig, isPending } = useUpdateTenantConfig();
	const defaultValues = defaultsFor(section, business.config);
	const form = useForm({
		defaultValues,
		validators: { onSubmit: schemas[section] as any },
		onSubmit: async ({ value }) => {
			await updateConfig(toDto(section, value));
			toast.success("Configuración guardada");
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
			className="space-y-6"
		>
			{section === "business" ? <BusinessFields form={form} /> : null}
			{section === "rental-policies" ? (
				<RentalPolicyFields form={form} />
			) : null}
			{section === "customer-communication" ? (
				<CommunicationFields form={form} />
			) : null}
			{section === "storefront" ? <StorefrontFields form={form} /> : null}
			<div className="flex justify-end">
				<form.Subscribe
					selector={(state) => [
						state.canSubmit,
						state.isDirty,
						state.isSubmitting,
					]}
				>
					{([canSubmit, isDirty, isSubmitting]) => (
						<Button
							type="submit"
							disabled={!canSubmit || !isDirty || isPending || isSubmitting}
						>
							{isPending || isSubmitting ? "Guardando..." : "Guardar cambios"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

function BusinessFields({ form }: { form: any }) {
	return (
		<>
			<TextRow
				form={form}
				name="currency"
				label="Moneda"
				description="Se usa para mostrar los precios en DEPIQO."
				transform={(value: string) => value.toUpperCase()}
			/>
			<SelectRow
				form={form}
				name="locale"
				label="Idioma"
				items={[
					{ value: "es-ES", label: "Español (España)" },
					{ value: "es-AR", label: "Español (Argentina)" },
					{ value: "en-US", label: "Inglés (Estados Unidos)" },
				]}
			/>
			<TextRow
				form={form}
				name="timezone"
				label="Zona horaria"
				description="Se usa para las fechas y horas de tus alquileres."
			/>
		</>
	);
}

function RentalPolicyFields({ form }: { form: any }) {
	return (
		<>
			<SelectRow
				form={form}
				name="bookingMode"
				label="Modo de reserva"
				items={[
					{ value: "instant-book", label: "Reserva inmediata" },
					{ value: "request-to-book", label: "Solicitud de reserva" },
				]}
			/>
			<SwitchRow
				form={form}
				name="weekendCountsAsOne"
				label="Sistema day/weekend"
				description="Sábado y domingo cuentan como una sola unidad de facturación."
			/>
			<SelectRow
				form={form}
				name="roundingRule"
				label="Comportamiento de cobro diario"
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
			/>
			<SwitchRow
				form={form}
				name="insuranceEnabled"
				label="Ofrecer seguro"
				description="Muestra el seguro de equipos durante la reserva."
			/>
			<NumberRow
				form={form}
				name="insuranceRatePercent"
				label="Porcentaje"
				suffix="%"
			/>
		</>
	);
}

function CommunicationFields({ form }: { form: any }) {
	return (
		<>
			<SelectRow
				form={form}
				name="orderCommunicationMode"
				label="Modo de comunicación"
				items={[
					{ value: "FORMAL", label: "Formal" },
					{ value: "WHATSAPP", label: "WhatsApp" },
				]}
			/>
			<TextRow
				form={form}
				name="whatsAppNumber"
				label="Número"
				description="Incluye el prefijo internacional."
			/>
		</>
	);
}

function StorefrontFields({ form }: { form: any }) {
	return (
		<>
			<NumberRow
				form={form}
				name="newArrivalsWindowDays"
				label={'Mostrar productos como "Nuevos" durante'}
				suffix="días"
			/>
			<SwitchRow
				form={form}
				name="showFloatingWhatsAppButton"
				label="Mostrar botón de WhatsApp"
				description="Muestra un acceso directo a WhatsApp en la tienda."
			/>
		</>
	);
}

function TextRow({ form, name, label, description, transform }: any) {
	return (
		<form.Field name={name}>
			{(field: any) => (
				<Row label={label} description={description}>
					<Field>
						<FieldLabel className="sr-only" htmlFor={name}>
							{label}
						</FieldLabel>
						<Input
							id={name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) =>
								field.handleChange(
									transform
										? transform(event.target.value)
										: event.target.value,
								)
							}
							className="w-56 text-right"
						/>
						<FieldError errors={field.state.meta.errors} />
					</Field>
				</Row>
			)}
		</form.Field>
	);
}

function NumberRow({ form, name, label, suffix }: any) {
	return (
		<form.Field name={name}>
			{(field: any) => (
				<Row label={label}>
					<div className="flex items-center gap-2">
						<Input
							type="number"
							min={0}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) =>
								field.handleChange(Number(event.target.value))
							}
							className="w-24 text-right"
						/>
						<span className="text-sm text-muted-foreground">{suffix}</span>
					</div>
				</Row>
			)}
		</form.Field>
	);
}

function SelectRow({ form, name, label, items }: any) {
	return (
		<form.Field name={name}>
			{(field: any) => (
				<Row label={label}>
					<Select
						value={field.state.value}
						onValueChange={field.handleChange}
						items={items}
					>
						<SelectTrigger className="w-64">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{items.map((item: { value: string; label: string }) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Row>
			)}
		</form.Field>
	);
}

function SwitchRow({ form, name, label, description }: any) {
	return (
		<form.Field name={name}>
			{(field: any) => (
				<Row label={label} description={description}>
					<Switch
						checked={field.state.value}
						onCheckedChange={field.handleChange}
						aria-label={label}
					/>
				</Row>
			)}
		</form.Field>
	);
}

function Row({
	label,
	description,
	children,
}: {
	label: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<div className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8">
			<div>
				<p className="text-sm font-semibold">{label}</p>
				{description ? (
					<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
				) : null}
			</div>
			{children}
		</div>
	);
}

function defaultsFor(section: SettingsConfigurationSection, config: any) {
	switch (section) {
		case "business":
			return {
				currency: config.pricing.currency,
				locale: config.pricing.locale,
				timezone: config.timezone,
			};
		case "rental-policies":
			return {
				bookingMode: config.bookingMode,
				weekendCountsAsOne: config.pricing.weekendCountsAsOne,
				roundingRule: config.pricing.roundingRule,
				insuranceEnabled: config.pricing.insuranceEnabled,
				insuranceRatePercent: config.pricing.insuranceRatePercent,
			};
		case "customer-communication":
			return {
				orderCommunicationMode: config.communication.orderCommunicationMode,
				whatsAppNumber: config.communication.whatsAppNumber ?? "",
			};
		case "storefront":
			return {
				newArrivalsWindowDays: config.newArrivalsWindowDays,
				showFloatingWhatsAppButton:
					config.communication.showFloatingWhatsAppButton,
			};
	}
}

function toDto(
	section: SettingsConfigurationSection,
	value: any,
): UpdateTenantConfigBodyDto {
	switch (section) {
		case "business":
			return {
				pricing: { currency: value.currency, locale: value.locale },
				timezone: value.timezone,
			};
		case "rental-policies":
			return {
				bookingMode: value.bookingMode,
				pricing: {
					weekendCountsAsOne: value.weekendCountsAsOne,
					roundingRule: value.roundingRule,
					insuranceEnabled: value.insuranceEnabled,
					insuranceRatePercent: value.insuranceRatePercent,
				},
			};
		case "customer-communication":
			return {
				communication: {
					orderCommunicationMode: value.orderCommunicationMode,
					whatsAppNumber: value.whatsAppNumber.trim() || undefined,
				},
			};
		case "storefront":
			return {
				newArrivalsWindowDays: value.newArrivalsWindowDays,
				communication: {
					showFloatingWhatsAppButton: value.showFloatingWhatsAppButton,
				},
			};
	}
}
