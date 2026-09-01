import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { createFormHook } from "@tanstack/react-form";
import type { ReactNode } from "react";
import {
	fieldContext,
	formContext,
	useFieldContext,
	useFormContext,
} from "./settings-form-context";

function SettingsTextField({
	label,
	description,
	placeholder,
	transform,
	align,
	maxLength,
}: {
	label: string;
	description?: string;
	placeholder?: string;
	transform?: (value: string) => string;
	align?: SettingsRowAlign;
	maxLength?: number;
}) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<SettingsRow label={label} description={description} align={align}>
			<Field data-invalid={isInvalid}>
				<FieldLabel className="sr-only" htmlFor={field.name}>
					{label}
				</FieldLabel>
				<Input
					id={field.name}
					name={field.name}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(event) =>
						field.handleChange(
							transform ? transform(event.target.value) : event.target.value,
						)
					}
					aria-invalid={isInvalid}
					placeholder={placeholder}
					maxLength={maxLength}
					className={align === "start" ? "w-64" : "w-56 text-right"}
				/>
				<FieldError errors={field.state.meta.errors} />
			</Field>
		</SettingsRow>
	);
}

function SettingsTextareaField({
	label,
	description,
	placeholder,
	align,
	maxLength,
}: {
	label: string;
	description?: string;
	placeholder?: string;
	align?: SettingsRowAlign;
	maxLength?: number;
}) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<SettingsRow label={label} description={description} align={align}>
			<Field data-invalid={isInvalid}>
				<FieldLabel className="sr-only" htmlFor={field.name}>
					{label}
				</FieldLabel>
				<Textarea
					id={field.name}
					name={field.name}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(event) => field.handleChange(event.target.value)}
					aria-invalid={isInvalid}
					placeholder={placeholder}
					maxLength={maxLength}
					className="w-72"
				/>
				<FieldError errors={field.state.meta.errors} />
			</Field>
		</SettingsRow>
	);
}

function SettingsNumberField({
	label,
	description,
	suffix,
	align,
	disabled,
	step,
}: {
	label: string;
	description?: string;
	suffix: string;
	align?: SettingsRowAlign;
	disabled?: boolean;
	step?: number;
}) {
	const field = useFieldContext<number>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<SettingsRow label={label} description={description} align={align}>
			<Field data-invalid={isInvalid}>
				<FieldLabel className="sr-only" htmlFor={field.name}>
					{label}
				</FieldLabel>
				<div className="flex items-center gap-2">
					<Input
						id={field.name}
						name={field.name}
						type="number"
						min={0}
						step={step}
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={(event) => field.handleChange(Number(event.target.value))}
						aria-invalid={isInvalid}
						disabled={disabled}
						className="w-24 text-right"
					/>
					<span className="text-sm text-muted-foreground">{suffix}</span>
				</div>
				<FieldError errors={field.state.meta.errors} />
			</Field>
		</SettingsRow>
	);
}

function SettingsSwitchField({
	label,
	description,
	align,
}: {
	label: string;
	description?: string;
	align?: SettingsRowAlign;
}) {
	const field = useFieldContext<boolean>();
	return (
		<SettingsRow label={label} description={description} align={align}>
			<Switch
				name={field.name}
				checked={field.state.value}
				onCheckedChange={field.handleChange}
				aria-label={label}
			/>
		</SettingsRow>
	);
}

function SettingsForm({
	isPending,
	children,
	framed = false,
}: {
	isPending: boolean;
	children: ReactNode;
	framed?: boolean;
}) {
	const form = useFormContext();
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
			className="space-y-6"
		>
			{framed ? (
				<div className="divide-y overflow-hidden rounded-xl border bg-card">
					{children}
				</div>
			) : (
				children
			)}
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

export type SettingsRowAlign = "end" | "start";

export function SettingsRow({
	label,
	description,
	children,
	align = "end",
}: {
	label: string;
	description?: string;
	children: ReactNode;
	align?: SettingsRowAlign;
}) {
	return (
		<div
			className={
				align === "start"
					? "grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] sm:items-center sm:gap-8"
					: "grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8"
			}
		>
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

export const { useAppForm: useSettingsForm, withForm: withSettingsForm } =
	createFormHook({
		fieldContext,
		formContext,
		fieldComponents: {
			SettingsTextField,
			SettingsTextareaField,
			SettingsNumberField,
			SettingsSwitchField,
		},
		formComponents: { SettingsForm },
	});
