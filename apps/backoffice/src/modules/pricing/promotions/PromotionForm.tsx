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
import { ChevronDown, Minus, Plus } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { useCategories } from "@/modules/settings/categories/public";
import { PromotionTargetSelector } from "./PromotionTargetSelector";
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

type PromotionFormApi = ReturnType<typeof usePromotionForm>["form"];
type ConditionName = "minOrderSubtotal" | "minRentalUnits" | "maxRentalUnits";

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
		validators: { onSubmit: promotionFormSchema },
		onSubmit: async ({ value }) => onSubmit(value),
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
						title="Nombre"
						description="Usalo para reconocer esta promoción al administrarla."
					>
						<TextField
							form={form}
							name="name"
							label="Nombre de la promoción"
							placeholder="Ej: 20% por alquiler largo"
						/>
					</Section>
					<DiscountSection form={form} />
					<ActivationSection form={form} />
					<ProductEligibilitySection form={form} />
					<ConditionsSection form={form} defaultValues={defaultValues} />
					<ValiditySection form={form} />
					<AdvancedSection form={form} />
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

function DiscountSection({ form }: { form: PromotionFormApi }) {
	return (
		<Section
			title="Descuento"
			description="Definí qué descuento ofrecés y qué parte de la reserva lo recibe."
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<form.Field name="effectType">
					{(field) => (
						<ChoiceCards
							label="Tipo de descuento"
							value={field.state.value}
							onValueChange={field.handleChange}
							items={[
								{
									value: "PERCENTAGE_OFF",
									label: "Porcentaje",
									description: "Descuenta una proporción del importe.",
								},
								{
									value: "FIXED_AMOUNT_OFF",
									label: "Monto fijo",
									description: "Descuenta un importe determinado.",
								},
							]}
						/>
					)}
				</form.Field>
				<TextField
					form={form}
					name="effectValue"
					label="Valor del descuento"
					placeholder="Ej: 10"
				/>
			</div>
			<form.Field name="target">
				{(field) => (
					<ChoiceCards
						label="¿Qué recibe el descuento?"
						value={field.state.value}
						onValueChange={field.handleChange}
						items={[
							{
								value: "ORDER",
								label: "Toda la reserva",
								description:
									"Se descuenta el total de la reserva cuando cumple los requisitos.",
							},
							{
								value: "ELIGIBLE_LINES",
								label: "Productos específicos",
								description: "Solo se descuentan los productos que elijas.",
							},
						]}
					/>
				)}
			</form.Field>
		</Section>
	);
}

function ActivationSection({ form }: { form: PromotionFormApi }) {
	return (
		<Section
			title="Activación"
			description="Elegí cómo puede usar el cliente esta promoción."
		>
			<form.Field name="activation">
				{(field) => (
					<ChoiceCards
						value={field.state.value}
						onValueChange={field.handleChange}
						items={[
							{
								value: "AUTOMATIC",
								label: "Automáticamente",
								description: "Se aplica al cumplir los requisitos.",
							},
							{
								value: "COUPON_REQUIRED",
								label: "Con cupón",
								description: "El cliente debe ingresar un cupón válido.",
							},
						]}
					/>
				)}
			</form.Field>
		</Section>
	);
}

function ProductEligibilitySection({ form }: { form: PromotionFormApi }) {
	return (
		<form.Subscribe selector={(state) => state.values.target}>
			{(target) => (
				<Section
					title="Productos"
					description={
						target === "ORDER"
							? "Definí si la reserva debe contener productos determinados para obtener el descuento."
							: "Elegí los productos que reciben el descuento."
					}
				>
					<ScopeEditor form={form} target={target} />
					<ExclusionEditor form={form} />
				</Section>
			)}
		</form.Subscribe>
	);
}

function ScopeEditor({
	form,
	target,
}: {
	form: PromotionFormApi;
	target: "ORDER" | "ELIGIBLE_LINES";
}) {
	return (
		<form.Field name="scopes" mode="array">
			{(field) => {
				const scopeType = getScopeType(field.state.value);
				return (
					<div className="space-y-4">
						<Field>
							<FieldLabel>
								{target === "ORDER"
									? "¿La reserva debe incluir algún producto específico?"
									: "¿Qué productos reciben el descuento?"}
							</FieldLabel>
							<StaticSelect
								value={scopeType}
								onValueChange={(nextType) =>
									form.setFieldValue("scopes", [createEmptyScope(nextType)])
								}
								items={[
									{
										value: "ALL",
										label:
											target === "ORDER"
												? "No, cualquier reserva"
												: "Todos los productos",
									},
									{ value: "RENTABLE_ITEM", label: "Productos" },
									{ value: "CATEGORY", label: "Categorías" },
									{ value: "RENTAL_OFFER", label: "Ofertas en sucursal" },
								]}
							/>
						</Field>
						{scopeType === "ALL" ? (
							<p className="rounded-lg border bg-muted/30 px-4 py-3 text-muted-foreground text-sm">
								{target === "ORDER"
									? "No hay requisitos de productos: la promoción puede aplicar a cualquier reserva."
									: "El descuento alcanza todos los productos de la reserva."}
							</p>
						) : (
							<>
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
								<Button
									type="button"
									variant="outline"
									onClick={() => field.pushValue(createEmptyScope(scopeType))}
								>
									<Plus className="size-4" />
									Agregar {scopeLabel(scopeType).toLowerCase()}
								</Button>
							</>
						)}
						{field.state.meta.isTouched && !field.state.meta.isValid ? (
							<FieldError errors={field.state.meta.errors} />
						) : null}
					</div>
				);
			}}
		</form.Field>
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
	if (scope.type === "ALL") return null;
	const name = scopeFieldName(scope.type, index);
	return (
		<div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
			<form.Field name={name}>
				{(valueField) => (
					<Field>
						<FieldLabel>{scopeLabel(scope.type)}</FieldLabel>
						<PromotionTargetSelector
							type={scope.type}
							value={valueField.state.value}
							onValueChange={valueField.handleChange}
						/>
						{valueField.state.meta.isTouched &&
						!valueField.state.meta.isValid ? (
							<FieldError errors={valueField.state.meta.errors} />
						) : null}
					</Field>
				)}
			</form.Field>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => field.removeValue(index)}
				disabled={!canRemove}
			>
				<Minus className="size-4" />
				Quitar
			</Button>
		</div>
	);
}

function ExclusionEditor({ form }: { form: PromotionFormApi }) {
	return (
		<form.Field name="exclusions" mode="array">
			{(field) => (
				<div className="space-y-3">
					{field.state.value.map((exclusion, index) => (
						<ExclusionRow
							key={`${exclusion.type}-${index}`}
							form={form}
							field={field}
							exclusion={exclusion}
							index={index}
						/>
					))}
					{field.state.value.length === 0 ? (
						<Button
							type="button"
							variant="outline"
							onClick={() =>
								field.pushValue(createEmptyExclusion("RENTABLE_ITEM"))
							}
						>
							<Plus className="size-4" />
							Agregar exclusión
						</Button>
					) : (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() =>
								field.pushValue(createEmptyExclusion("RENTABLE_ITEM"))
							}
						>
							<Plus className="size-4" />
							Agregar otra exclusión
						</Button>
					)}
				</div>
			)}
		</form.Field>
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
	const name = exclusionFieldName(exclusion.type, index);
	return (
		<div className="grid gap-3 rounded-xl border border-dashed bg-white p-4 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
			<form.Field name={`exclusions[${index}].type`}>
				{(typeField) => (
					<Field>
						<FieldLabel>Excluir</FieldLabel>
						<StaticSelect
							value={typeField.state.value}
							onValueChange={(type) =>
								form.setFieldValue(
									`exclusions[${index}]`,
									createEmptyExclusion(type),
								)
							}
							items={[
								{ value: "RENTABLE_ITEM", label: "Producto" },
								{ value: "CATEGORY", label: "Categoría" },
								{ value: "RENTAL_OFFER", label: "Oferta en sucursal" },
							]}
						/>
					</Field>
				)}
			</form.Field>
			<form.Field name={name}>
				{(valueField) => (
					<Field>
						<FieldLabel>Selección</FieldLabel>
						<PromotionTargetSelector
							type={exclusion.type}
							value={valueField.state.value}
							onValueChange={valueField.handleChange}
						/>
						{valueField.state.meta.isTouched &&
						!valueField.state.meta.isValid ? (
							<FieldError errors={valueField.state.meta.errors} />
						) : null}
					</Field>
				)}
			</form.Field>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => field.removeValue(index)}
			>
				<Minus className="size-4" />
				Quitar
			</Button>
		</div>
	);
}

function ConditionsSection({
	form,
	defaultValues,
}: {
	form: PromotionFormApi;
	defaultValues?: PromotionFormValues;
}) {
	const [conditions, setConditions] = useState<ConditionName[]>(() =>
		(["minOrderSubtotal", "minRentalUnits", "maxRentalUnits"] as const).filter(
			(name) => Boolean(defaultValues?.[name]),
		),
	);
	const addable = (
		["minOrderSubtotal", "minRentalUnits", "maxRentalUnits"] as const
	).filter((name) => !conditions.includes(name));
	return (
		<Section
			title="Condiciones"
			description="Agregá solo los requisitos que deba cumplir la reserva."
		>
			<div className="space-y-4">
				{conditions.map((name) => (
					<ConditionRow
						key={name}
						form={form}
						name={name}
						onRemove={() => {
							form.setFieldValue(name, "");
							setConditions((current) =>
								current.filter((condition) => condition !== name),
							);
						}}
					/>
				))}
			</div>
			{addable.length > 0 ? (
				<StaticSelect
					value=""
					onValueChange={(value) => {
						if (value)
							setConditions((current) => [...current, value as ConditionName]);
					}}
					items={[
						{ value: "", label: "Agregar condición" },
						...addable.map((name) => ({
							value: name,
							label: conditionLabel(name),
						})),
					]}
				/>
			) : null}
		</Section>
	);
}

function ConditionRow({
	form,
	name,
	onRemove,
}: {
	form: PromotionFormApi;
	name: ConditionName;
	onRemove: () => void;
}) {
	const units =
		name === "minOrderSubtotal"
			? null
			: "La duración se mide en unidades facturadas, como horas, días o semanas.";
	return (
		<div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
			<form.Field name={name}>
				{(field) => {
					const invalid =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<Field data-invalid={invalid}>
							<FieldLabel>{conditionLabel(name)}</FieldLabel>
							<Input
								id={field.name}
								type="number"
								min={name === "minOrderSubtotal" ? undefined : 1}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								placeholder={
									name === "minOrderSubtotal" ? "Ej: 100000" : "Ej: 3"
								}
								aria-invalid={invalid}
								className="bg-white"
							/>
							{units ? <FieldDescription>{units}</FieldDescription> : null}
							{invalid ? <FieldError errors={field.state.meta.errors} /> : null}
						</Field>
					);
				}}
			</form.Field>
			<Button type="button" variant="ghost" size="sm" onClick={onRemove}>
				<Minus className="size-4" />
				Quitar
			</Button>
		</div>
	);
}

function ValiditySection({ form }: { form: PromotionFormApi }) {
	return (
		<Section
			title="Vigencia"
			description="Dejala sin fechas para que esté vigente sin límite de tiempo."
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<DateField form={form} name="validFrom" label="Desde" />
				<DateField form={form} name="validUntil" label="Hasta" />
			</div>
		</Section>
	);
}

function AdvancedSection({ form }: { form: PromotionFormApi }) {
	return (
		<details className="group border-t pt-6">
			<summary className="flex cursor-pointer list-none items-center justify-between">
				<span>
					<span className="block font-semibold text-base">
						Configuración avanzada
					</span>
					<span className="block text-muted-foreground text-sm">
						Combinación, prioridad y estado de la promoción.
					</span>
				</span>
				<ChevronDown className="size-4 transition-transform group-open:rotate-180" />
			</summary>
			<div className="mt-4 space-y-4">
				<BooleanField
					form={form}
					name="stackable"
					label="Permitir combinar con otras promociones"
					description="Si esta promoción se aplica y no se combina, no se aplicarán promociones posteriores de menor prioridad."
				/>
				<NumberField
					form={form}
					name="priority"
					label="Prioridad"
					description="Las promociones con mayor número se consideran primero."
					min={0}
				/>
				<BooleanField
					form={form}
					name="isActive"
					label="Promoción activa"
					description="Desactivala para guardarla sin que se aplique."
				/>
			</div>
		</details>
	);
}

function PromotionSummary({ form }: { form: PromotionFormApi }) {
	const { data: categories = [] } = useCategories();
	const categoryNameById = new Map(
		categories.map((category) => [category.id, category.name]),
	);

	return (
		<aside className="xl:sticky xl:top-6">
			<form.Subscribe selector={(state) => state.values}>
				{(values) => (
					<section className="rounded-2xl border bg-white p-5 shadow-sm">
						<p className="font-semibold text-sm">Así se aplicará</p>
						<p className="mt-3 text-muted-foreground text-sm leading-6">
							{buildPromotionSummary(values, categoryNameById)}
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

function ChoiceCards<T extends string>({
	label,
	value,
	onValueChange,
	items,
}: {
	label?: string;
	value: T;
	onValueChange: (value: T) => void;
	items: readonly { value: T; label: string; description: string }[];
}) {
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<div className="grid gap-3 sm:grid-cols-2">
				{items.map((item) => (
					<button
						type="button"
						key={item.value}
						onClick={() => onValueChange(item.value)}
						className={`rounded-xl border bg-white p-4 text-left transition-colors hover:border-foreground/40 ${value === item.value ? "border-primary bg-primary/5 ring-1 ring-primary" : ""}`}
					>
						<span className="block font-medium text-sm">{item.label}</span>
						<span className="mt-1 block text-muted-foreground text-xs leading-5">
							{item.description}
						</span>
					</button>
				))}
			</div>
		</Field>
	);
}
function TextField({
	form,
	name,
	label,
	placeholder,
}: {
	form: PromotionFormApi;
	name: "name" | "effectValue";
	label: string;
	placeholder?: string;
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
				return (
					<Field data-invalid={invalid}>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<Input
							id={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder={placeholder}
							aria-invalid={invalid}
							className="bg-white"
						/>
						{invalid ? <FieldError errors={field.state.meta.errors} /> : null}
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
	name: "validFrom" | "validUntil";
	label: string;
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
				return (
					<Field data-invalid={invalid}>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<Input
							id={field.name}
							type="date"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							aria-invalid={invalid}
							className="bg-white"
						/>
						{invalid ? <FieldError errors={field.state.meta.errors} /> : null}
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
	name: "priority";
	label: string;
	description: string;
	min: number;
}) {
	return (
		<form.Field name={name}>
			{(field) => (
				<Field>
					<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
					<Input
						id={field.name}
						type="number"
						min={min}
						value={field.state.value}
						onChange={(event) => field.handleChange(Number(event.target.value))}
						className="bg-white"
					/>
					<FieldDescription>{description}</FieldDescription>
				</Field>
			)}
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
				<div className="flex items-start gap-3 rounded-lg border bg-white px-4 py-3">
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
			onValueChange={(next) => onValueChange(next as T)}
			items={items}
		>
			<SelectTrigger className="bg-white">
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

function getScopeType(scopes: PromotionScopeFormValues[]): PromotionScopeType {
	return scopes[0]?.type ?? "ALL";
}
function scopeLabel(type: Exclude<PromotionScopeType, "ALL">): string {
	return {
		RENTABLE_ITEM: "Producto",
		CATEGORY: "Categoría",
		RENTAL_OFFER: "Oferta en sucursal",
	}[type];
}
function conditionLabel(name: ConditionName): string {
	return {
		minOrderSubtotal: "Subtotal mínimo",
		minRentalUnits: "Duración mínima facturada",
		maxRentalUnits: "Duración máxima facturada",
	}[name];
}
function scopeFieldName(
	type: Exclude<PromotionScopeType, "ALL">,
	index: number,
) {
	return type === "RENTABLE_ITEM"
		? (`scopes[${index}].rentableItemId` as const)
		: type === "CATEGORY"
			? (`scopes[${index}].categoryId` as const)
			: (`scopes[${index}].rentalOfferId` as const);
}
function exclusionFieldName(type: PromotionExclusionType, index: number) {
	return type === "RENTABLE_ITEM"
		? (`exclusions[${index}].rentableItemId` as const)
		: type === "CATEGORY"
			? (`exclusions[${index}].categoryId` as const)
			: (`exclusions[${index}].rentalOfferId` as const);
}
function buildPromotionSummary(
	values: PromotionFormValues,
	categoryNameById: Map<string, string>,
): string {
	const value = values.effectValue.trim() || "un valor pendiente";
	const discount =
		values.effectType === "PERCENTAGE_OFF" ? `${value}%` : `$${value}`;
	const target =
		values.target === "ORDER"
			? "en toda la reserva"
			: "en los productos seleccionados";
	const activation =
		values.activation === "AUTOMATIC"
			? "Se aplica automáticamente"
			: "Se activa con cupón";
	const firstScope = values.scopes[0];
	const scopeDescription =
		firstScope?.type === "CATEGORY"
			? `la categoría ${categoryNameById.get(firstScope.categoryId) ?? "seleccionada"}`
			: firstScope?.type === "RENTABLE_ITEM"
				? "los productos elegidos"
				: firstScope?.type === "RENTAL_OFFER"
					? "las ofertas en sucursal elegidas"
					: "";
	const scope =
		firstScope?.type === "ALL"
			? ""
			: values.target === "ORDER"
				? ` cuando la reserva incluye ${scopeDescription}`
				: ` para ${scopeDescription}`;
	const conditions = [
		values.minOrderSubtotal.trim()
			? `requiere un subtotal mínimo de $${values.minOrderSubtotal.trim()}`
			: "",
		values.minRentalUnits.trim()
			? `requiere al menos ${values.minRentalUnits.trim()} unidades facturadas`
			: "",
		values.maxRentalUnits.trim()
			? `requiere hasta ${values.maxRentalUnits.trim()} unidades facturadas`
			: "",
	].filter(Boolean);
	const exclusions = values.exclusions.length
		? ` Excluye ${values.exclusions.length} selección${values.exclusions.length === 1 ? "" : "es"}.`
		: "";
	const validity =
		values.validFrom || values.validUntil
			? ` Vigente${values.validFrom ? ` desde el ${values.validFrom}` : ""}${values.validUntil ? ` hasta el ${values.validUntil}` : ""}.`
			: "";
	const stackability = values.stackable
		? " Puede combinarse con promociones posteriores."
		: " No se combina con promociones posteriores.";
	return `${discount} de descuento ${target}.${scope} ${activation}.${conditions.length ? ` ${conditions.join(" y ")}.` : ""}${exclusions}${validity}${stackability}`
		.replace(/\s+/g, " ")
		.trim();
}
