import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Switch } from "@repo/ui/components/switch";
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
	transform,
}: {
	label: string;
	description?: string;
	transform?: (value: string) => string;
}) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<SettingsRow label={label} description={description}>
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
					className="w-56 text-right"
				/>
				<FieldError errors={field.state.meta.errors} />
			</Field>
		</SettingsRow>
	);
}

function SettingsNumberField({
	label,
	suffix,
}: {
	label: string;
	suffix: string;
}) {
	const field = useFieldContext<number>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<SettingsRow label={label}>
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
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={(event) => field.handleChange(Number(event.target.value))}
						aria-invalid={isInvalid}
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
}: {
	label: string;
	description?: string;
}) {
	const field = useFieldContext<boolean>();
	return (
		<SettingsRow label={label} description={description}>
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
}: {
	isPending: boolean;
	children: ReactNode;
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
			{children}
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

export function SettingsRow({
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

export const { useAppForm: useSettingsForm, withForm: withSettingsForm } =
	createFormHook({
		fieldContext,
		formContext,
		fieldComponents: {
			SettingsTextField,
			SettingsNumberField,
			SettingsSwitchField,
		},
		formComponents: { SettingsForm },
	});
