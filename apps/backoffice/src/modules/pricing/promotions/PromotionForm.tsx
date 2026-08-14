import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Field,
	FieldDescription,
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
import { useForm } from "@tanstack/react-form";
import { Minus, Plus } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import {
	createEmptyExclusion,
	createEmptyScope,
	createPromotionFormDefaultValues,
	type PromotionExclusionFormValues,
	type PromotionExclusionType,
	type PromotionFormValues,
	type PromotionScopeFormValues,
	type PromotionScopeType,
	promotionFormSchema,
} from "./promotion-form.schema";

const activationItems = [
	{ value: "AUTOMATIC", label: "Automática" },
	{ value: "COUPON_REQUIRED", label: "Con cupón" },
] as const;

const effectTypeItems = [
	{ value: "PERCENTAGE_OFF", label: "Porcentaje" },
	{ value: "FIXED_AMOUNT_OFF", label: "Monto fijo" },
] as const;

const targetItems = [
	{ value: "ORDER", label: "Toda la orden" },
	{ value: "ELIGIBLE_LINES", label: "Solo líneas elegibles" },
] as const;

const scopeModeItems = [
	{ value: "ALL", label: "Todos los ítems" },
	{ value: "RENTABLE_ITEM", label: "Ítems rentables específicos" },
	{ value: "RENTAL_OFFER", label: "Ofertas específicas" },
	{ value: "CATEGORY", label: "Categorías específicas" },
] as const;

const exclusionTypeItems = [
	{ value: "RENTABLE_ITEM", label: "Ítem rentable" },
	{ value: "RENTAL_OFFER", label: "Oferta" },
	{ value: "CATEGORY", label: "Categoría" },
] as const;

type PromotionFormApi = ReturnType<typeof usePromotionForm>["form"];
type TextFieldName = "name" | "effectValue" | "minOrderSubtotal";
type NumberFieldName = "priority";
type DateFieldName = "validFrom" | "validUntil";
type OptionalIntegerFieldName = "minRentalUnits" | "maxRentalUnits";

interface PromotionFormProps {
	formId?: string;
	defaultValues?: PromotionFormValues;
	onCancel: () => void;
	onSubmit: (values: PromotionFormValues) => Promise<void>;
	isPending: boolean;
	submitLabel: string;
	pendingLabel: string;
}

function usePromotionForm({
	defaultValues,
	onSubmit,
}: Pick<PromotionFormProps, "defaultValues" | "onSubmit">) {
	const form = useForm({
		defaultValues: defaultValues ?? createPromotionFormDefaultValues(),
		validators: {
			onSubmit: promotionFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	return { form };
}

export function PromotionForm({
	formId: providedFormId,
	defaultValues,
	onCancel,
	onSubmit,
	isPending,
	submitLabel,
	pendingLabel,
}: PromotionFormProps) {
	const generatedFormId = useId();
	const formId = providedFormId ?? generatedFormId;
	const { form } = usePromotionForm({ defaultValues, onSubmit });

	return (
		<form
			id={formId}
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-8"
		>
			<div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
				<FieldGroup className="space-y-6">
					<Section
						title="Datos básicos"
						description="Definí el nombre, la activación, la vigencia y el comportamiento general."
					>
						<TextField
							form={form}
							name="name"
							label="Nombre"
							placeholder="Ej: 20% off por alquiler largo"
						/>

						<div className="grid gap-4 sm:grid-cols-2">
							<SelectField
								form={form}
								name="activation"
								label="Activación"
								items={activationItems}
							/>
							<NumberField
								form={form}
								name="priority"
								label="Prioridad"
								description="Mayor número = mayor prioridad."
								min={0}
							/>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<DateField form={form} name="validFrom" label="Vigente desde" />
							<DateField form={form} name="validUntil" label="Vigente hasta" />
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<BooleanField
								form={form}
								name="stackable"
								label="Acumulable"
								description="Permite combinar esta promoción con otras promociones acumulables."
							/>
							<BooleanField
								form={form}
								name="isActive"
								label="Activa"
								description="Solo las promociones activas se evalúan al calcular precios."
							/>
						</div>
					</Section>

					<Section
						title="Descuento"
						description="Definí cuánto descuenta la promoción y sobre qué parte del alquiler se aplica."
					>
						<div className="grid gap-4 sm:grid-cols-3">
							<SelectField
								form={form}
								name="effectType"
								label="Tipo de descuento"
								items={effectTypeItems}
							/>
							<TextField
								form={form}
								name="effectValue"
								label="Valor"
								placeholder="Ej: 20 para 20% / 5000 para $5000"
							/>
							<SelectField
								form={form}
								name="target"
								label="Aplicar descuento sobre"
								items={targetItems}
							/>
						</div>
						<div className="rounded-lg border bg-muted/30 px-4 py-3 text-muted-foreground text-sm">
							<p>
								<strong className="text-foreground">Toda la orden:</strong>{" "}
								calcula el descuento sobre el total del alquiler.
							</p>
							<p>
								<strong className="text-foreground">
									Solo líneas elegibles:
								</strong>{" "}
								calcula el descuento únicamente sobre los ítems incluidos en el
								alcance.
							</p>
						</div>
					</Section>

					<Section
						title="Condiciones para aplicar"
						description="La promoción solo se aplica si la orden cumple estas condiciones."
					>
						<div className="grid gap-4 sm:grid-cols-3">
							<TextField
								form={form}
								name="minOrderSubtotal"
								label="Subtotal mínimo"
								placeholder="Sin mínimo"
							/>
							<OptionalIntegerField
								form={form}
								name="minRentalUnits"
								label="Duración mínima facturada"
								placeholder="Sin mínimo"
							/>
							<OptionalIntegerField
								form={form}
								name="maxRentalUnits"
								label="Duración máxima facturada"
								placeholder="Sin máximo"
							/>
						</div>
						<p className="rounded-lg bg-muted/40 px-4 py-3 text-muted-foreground text-sm">
							La duración se mide en unidades facturadas según el plan de
							precio: horas, días o semanas. No representa cantidad de ítems.
						</p>
					</Section>

					<ScopeEditor form={form} />
					<ExclusionEditor form={form} />
				</FieldGroup>

				<PromotionSummary form={form} />
			</div>

			<div className="flex justify-end gap-3 border-t pt-6">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isPending}
				>
					Cancelar
				</Button>
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							form={formId}
							disabled={!canSubmit || isPending}
						>
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

function ScopeEditor({ form }: { form: PromotionFormApi }) {
	return (
		<Section
			title="Alcance"
			description="Definí qué ítems pueden recibir esta promoción."
		>
			<form.Field name="scopes" mode="array">
				{(field) => {
					const currentMode = getScopeMode(field.state.value);
					const addLabel = getAddScopeLabel(currentMode);

					return (
						<div className="space-y-4">
							<Field>
								<FieldLabel>Aplicar a</FieldLabel>
								<StaticSelect
									value={currentMode}
									onValueChange={(value) => {
										const nextMode = value as PromotionScopeType;
										form.setFieldValue("scopes", [createEmptyScope(nextMode)]);
										if (nextMode !== "ALL") {
											form.setFieldValue("target", "ELIGIBLE_LINES");
										}
									}}
									items={scopeModeItems}
								/>
							</Field>

							{currentMode === "ALL" ? (
								<p className="rounded-lg border bg-muted/30 px-4 py-4 text-muted-foreground text-sm">
									Esta promoción puede aplicarse a todos los ítems elegibles de
									la orden.
								</p>
							) : (
								<>
									<div className="flex justify-end">
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												field.pushValue(createEmptyScope(currentMode))
											}
										>
											<Plus className="h-4 w-4" />
											{addLabel}
										</Button>
									</div>
									{field.state.value.map((scope, index) => (
										<ScopeRow
											key={`${scope.type}-${index}`}
											form={form}
											field={field}
											scope={scope}
											index={index}
											canRemove={field.state.value.length > 1}
										/>
									))}
								</>
							)}

							{field.state.meta.isTouched && !field.state.meta.isValid ? (
								<FieldError errors={field.state.meta.errors} />
							) : null}
						</div>
					);
				}}
			</form.Field>
		</Section>
	);
}

function ScopeRow({
	form,
	field,
	scope,
	index,
	canRemove,
}: {
	form: PromotionFormApi;
	field: { removeValue: (index: number) => void };
	scope: PromotionScopeFormValues;
	index: number;
	canRemove: boolean;
}) {
	return (
		<div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
			<ScopeIdentifierField form={form} index={index} scope={scope} />
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => field.removeValue(index)}
				disabled={!canRemove}
			>
				<Minus className="h-4 w-4" />
				Quitar
			</Button>
		</div>
	);
}

function ScopeIdentifierField({
	form,
	index,
	scope,
}: {
	form: PromotionFormApi;
	index: number;
	scope: PromotionScopeFormValues;
}) {
	if (scope.type === "ALL") {
		return null;
	}

	const fieldName =
		scope.type === "RENTABLE_ITEM"
			? (`scopes[${index}].rentableItemId` as const)
			: scope.type === "RENTAL_OFFER"
				? (`scopes[${index}].rentalOfferId` as const)
				: (`scopes[${index}].categoryId` as const);

	return (
		<UuidField
			form={form}
			name={fieldName}
			label={getScopeUuidLabel(scope.type)}
		/>
	);
}

function ExclusionEditor({ form }: { form: PromotionFormApi }) {
	const [nextType, setNextType] =
		useState<PromotionExclusionType>("RENTABLE_ITEM");

	return (
		<Section
			title="Exclusiones"
			description="Opcionalmente excluí ítems, ofertas o categorías que no deben recibir el descuento."
		>
			<form.Field name="exclusions" mode="array">
				{(field) => (
					<div className="space-y-4">
						<div className="flex flex-col gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:items-end sm:justify-between">
							<div className="grid gap-2">
								<FieldLabel>Excluir por</FieldLabel>
								<StaticSelect
									value={nextType}
									onValueChange={(value) =>
										setNextType(value as PromotionExclusionType)
									}
									items={exclusionTypeItems}
								/>
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={() => field.pushValue(createEmptyExclusion(nextType))}
							>
								<Plus className="h-4 w-4" />
								Agregar exclusión
							</Button>
						</div>

						{field.state.value.length === 0 ? (
							<p className="rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
								No hay exclusiones. La promoción se aplicará a todo lo definido
								en el alcance.
							</p>
						) : null}

						{field.state.value.map((exclusion, index) => (
							<ExclusionRow
								key={`${exclusion.type}-${index}`}
								form={form}
								field={field}
								exclusion={exclusion}
								index={index}
							/>
						))}
					</div>
				)}
			</form.Field>
		</Section>
	);
}

function ExclusionRow({
	form,
	field,
	exclusion,
	index,
}: {
	form: PromotionFormApi;
	field: { removeValue: (index: number) => void };
	exclusion: PromotionExclusionFormValues;
	index: number;
}) {
	const fieldName =
		exclusion.type === "RENTABLE_ITEM"
			? (`exclusions[${index}].rentableItemId` as const)
			: exclusion.type === "RENTAL_OFFER"
				? (`exclusions[${index}].rentalOfferId` as const)
				: (`exclusions[${index}].categoryId` as const);

	return (
		<div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-[14rem_minmax(0,1fr)_auto] sm:items-end">
			<form.Field name={`exclusions[${index}].type`}>
				{(typeField) => (
					<Field>
						<FieldLabel>Excluir por</FieldLabel>
						<StaticSelect
							value={typeField.state.value}
							onValueChange={(value) =>
								form.setFieldValue(
									`exclusions[${index}]`,
									createEmptyExclusion(value as PromotionExclusionType),
								)
							}
							items={exclusionTypeItems}
						/>
					</Field>
				)}
			</form.Field>
			<UuidField form={form} name={fieldName} label="UUID" />
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => field.removeValue(index)}
			>
				<Minus className="h-4 w-4" />
				Quitar
			</Button>
		</div>
	);
}

function PromotionSummary({ form }: { form: PromotionFormApi }) {
	return (
		<aside className="xl:sticky xl:top-6">
			<form.Subscribe selector={(state) => state.values}>
				{(values) => (
					<section className="rounded-2xl border bg-muted/20 p-5 shadow-sm">
						<p className="font-semibold text-sm">Resumen</p>
						<p className="mt-3 text-muted-foreground text-sm leading-6">
							{buildPromotionSummary(values)}
						</p>
					</section>
				)}
			</form.Subscribe>
		</aside>
	);
}

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<section className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
			<div>
				<h2 className="font-semibold text-base">{title}</h2>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
			{children}
		</section>
	);
}

function TextField({
	form,
	name,
	label,
	placeholder,
}: {
	form: PromotionFormApi;
	name: TextFieldName;
	label: string;
	placeholder?: string;
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const isInvalid =
					field.state.meta.isTouched && !field.state.meta.isValid;
				return (
					<Field data-invalid={isInvalid}>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<Input
							id={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder={placeholder}
							aria-invalid={isInvalid}
						/>
						{isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
					</Field>
				);
			}}
		</form.Field>
	);
}

function UuidField({
	form,
	name,
	label,
}: {
	form: PromotionFormApi;
	name:
		| `scopes[${number}].rentableItemId`
		| `scopes[${number}].rentalOfferId`
		| `scopes[${number}].categoryId`
		| `exclusions[${number}].rentableItemId`
		| `exclusions[${number}].rentalOfferId`
		| `exclusions[${number}].categoryId`;
	label: string;
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const isInvalid =
					field.state.meta.isTouched && !field.state.meta.isValid;
				return (
					<Field data-invalid={isInvalid}>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<Input
							id={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="UUID"
							aria-invalid={isInvalid}
						/>
						{isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
					</Field>
				);
			}}
		</form.Field>
	);
}

function DateField({
	form,
	name,
	label,
}: {
	form: PromotionFormApi;
	name: DateFieldName;
	label: string;
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const isInvalid =
					field.state.meta.isTouched && !field.state.meta.isValid;
				return (
					<Field data-invalid={isInvalid}>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<Input
							id={field.name}
							type="date"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							aria-invalid={isInvalid}
						/>
						{isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
					</Field>
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
	min,
}: {
	form: PromotionFormApi;
	name: NumberFieldName;
	label: string;
	description?: string;
	min?: number;
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const isInvalid =
					field.state.meta.isTouched && !field.state.meta.isValid;
				return (
					<Field data-invalid={isInvalid}>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<Input
							id={field.name}
							type="number"
							min={min}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) =>
								field.handleChange(Number(event.target.value))
							}
							aria-invalid={isInvalid}
						/>
						{description ? (
							<FieldDescription>{description}</FieldDescription>
						) : null}
						{isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
					</Field>
				);
			}}
		</form.Field>
	);
}

function OptionalIntegerField({
	form,
	name,
	label,
	placeholder,
}: {
	form: PromotionFormApi;
	name: OptionalIntegerFieldName;
	label: string;
	placeholder: string;
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const isInvalid =
					field.state.meta.isTouched && !field.state.meta.isValid;
				return (
					<Field data-invalid={isInvalid}>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<Input
							id={field.name}
							type="number"
							min={1}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder={placeholder}
							aria-invalid={isInvalid}
						/>
						{isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
					</Field>
				);
			}}
		</form.Field>
	);
}

function BooleanField({
	form,
	name,
	label,
	description,
}: {
	form: PromotionFormApi;
	name: "stackable" | "isActive";
	label: string;
	description: string;
}) {
	return (
		<form.Field name={name}>
			{(field) => (
				<div className="flex items-start gap-3 rounded-lg border px-4 py-3">
					<Checkbox
						id={field.name}
						checked={field.state.value}
						onCheckedChange={(checked) => field.handleChange(checked === true)}
					/>
					<div>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<p className="text-muted-foreground text-xs">{description}</p>
					</div>
				</div>
			)}
		</form.Field>
	);
}

function SelectField<T extends string>({
	form,
	name,
	label,
	items,
}: {
	form: PromotionFormApi;
	name: "activation" | "effectType" | "target";
	label: string;
	items: readonly { value: T; label: string }[];
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const isInvalid =
					field.state.meta.isTouched && !field.state.meta.isValid;
				return (
					<Field data-invalid={isInvalid}>
						<FieldLabel>{label}</FieldLabel>
						<StaticSelect
							value={field.state.value}
							onValueChange={(value) => field.handleChange(value)}
							items={items}
						/>
						{isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
					</Field>
				);
			}}
		</form.Field>
	);
}

function StaticSelect<T extends string>({
	value,
	onValueChange,
	items,
}: {
	value: T;
	onValueChange: (value: T) => void;
	items: readonly { value: T; label: string }[];
}) {
	return (
		<Select
			value={value}
			onValueChange={(nextValue) => onValueChange(nextValue as T)}
			items={items}
		>
			<SelectTrigger>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{items.map((item) => (
					<SelectItem key={item.value} value={item.value}>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function getScopeMode(scopes: PromotionScopeFormValues[]): PromotionScopeType {
	return scopes[0]?.type ?? "ALL";
}

function getAddScopeLabel(scopeType: PromotionScopeType): string {
	switch (scopeType) {
		case "RENTABLE_ITEM":
			return "Agregar ítem rentable";
		case "RENTAL_OFFER":
			return "Agregar oferta";
		case "CATEGORY":
			return "Agregar categoría";
		case "ALL":
			return "Agregar alcance";
		default:
			return assertNever(scopeType);
	}
}

function getScopeUuidLabel(
	scopeType: Exclude<PromotionScopeType, "ALL">,
): string {
	switch (scopeType) {
		case "RENTABLE_ITEM":
			return "Ítem rentable";
		case "RENTAL_OFFER":
			return "Oferta";
		case "CATEGORY":
			return "Categoría";
		default:
			return assertNever(scopeType);
	}
}

function buildPromotionSummary(values: PromotionFormValues): string {
	const discount = formatDiscount(values);
	const target =
		values.target === "ORDER"
			? "sobre toda la orden"
			: "sobre las líneas elegibles";
	const conditions = formatConditions(values);
	const scope = formatScope(values.scopes);
	const exclusions =
		values.exclusions.length === 0
			? "no tiene exclusiones"
			: `tiene ${values.exclusions.length} exclusión${values.exclusions.length === 1 ? "" : "es"}`;
	const stackable = values.stackable ? "Es acumulable." : "No es acumulable.";

	return `Esta promoción aplica ${discount} de descuento ${target}${conditions}. ${scope} y ${exclusions}. ${stackable}`;
}

function formatDiscount(values: PromotionFormValues): string {
	const value = values.effectValue.trim() || "un valor pendiente";
	return values.effectType === "PERCENTAGE_OFF" ? `un ${value}%` : `$${value}`;
}

function formatConditions(values: PromotionFormValues): string {
	const conditions: string[] = [];

	if (values.minOrderSubtotal.trim()) {
		conditions.push(
			`el subtotal sea de $${values.minOrderSubtotal.trim()} o más`,
		);
	}

	if (values.minRentalUnits.trim()) {
		conditions.push(
			`la duración facturada sea de ${values.minRentalUnits.trim()} unidades o más`,
		);
	}

	if (values.maxRentalUnits.trim()) {
		conditions.push(
			`la duración facturada sea de hasta ${values.maxRentalUnits.trim()} unidades`,
		);
	}

	if (conditions.length === 0) {
		return "";
	}

	return ` cuando ${conditions.join(" y ")}`;
}

function formatScope(scopes: PromotionScopeFormValues[]): string {
	const firstScope = scopes[0];

	if (!firstScope || firstScope.type === "ALL") {
		return "Aplica a todos los ítems elegibles";
	}

	const label =
		firstScope.type === "RENTABLE_ITEM"
			? "ítems rentables específicos"
			: firstScope.type === "RENTAL_OFFER"
				? "ofertas específicas"
				: "categorías específicas";

	return `Aplica a ${label}`;
}

function assertNever(value: never): never {
	throw new Error(`Unhandled promotion form variant: ${value}`);
}
