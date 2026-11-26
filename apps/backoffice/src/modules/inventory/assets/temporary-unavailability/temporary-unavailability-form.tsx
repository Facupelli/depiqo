import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useId } from "react";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import type { UnavailabilityChange } from "./temporary-unavailability.api";
import {
	type PeriodEditor,
	periodFormDefaults,
	periodFormSchema,
} from "./temporary-unavailability.schema";

export function TemporaryUnavailabilityForm({
	editor,
	timezone,
	pending,
	onBack,
	onSave,
}: {
	editor: PeriodEditor;
	timezone: string;
	pending: boolean;
	onBack: () => void;
	onSave: (change: UnavailabilityChange) => Promise<void>;
}) {
	const id = useId();
	const schema = periodFormSchema(editor, timezone);
	const form = useForm({
		defaultValues: periodFormDefaults(editor, timezone),
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			await onSave(schema.parse(value));
		},
	});

	function dateField(name: "startsAt" | "endsAt", label: string) {
		return (
			<form.Field name={name}>
				{(field) => (
					<Field data-invalid={!field.state.meta.isValid}>
						<FieldLabel htmlFor={`${id}-${name}`}>{label}</FieldLabel>
						<Input
							id={`${id}-${name}`}
							type="datetime-local"
							value={field.state.value}
							aria-invalid={!field.state.meta.isValid}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
						/>
						<FieldError errors={field.state.meta.errors} />
					</Field>
				)}
			</form.Field>
		);
	}

	return (
		<form
			noValidate
			className="space-y-5"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				if (!pending) void form.handleSubmit();
			}}
		>
			<fieldset disabled={pending}>
				<FieldGroup className="gap-4">
					{editor.kind === "schedule" && (
						<form.Field name="startNow">
							{(field) => (
								<Field orientation="horizontal">
									<Checkbox
										id={`${id}-start-now`}
										aria-labelledby={`${id}-start-now-label`}
										disabled={pending}
										checked={field.state.value}
										onCheckedChange={field.handleChange}
									/>
									<FieldLabel
										id={`${id}-start-now-label`}
										htmlFor={`${id}-start-now`}
									>
										Iniciar ahora
									</FieldLabel>
								</Field>
							)}
						</form.Field>
					)}
					{editor.kind === "change-end" ? (
						<div className="space-y-1 text-sm">
							<p className="break-words">{editor.period.reason}</p>
							<p className="text-muted-foreground">
								Inicio:{" "}
								{formatTimestampInTimezone(
									editor.period.startsAt,
									timezone,
									"DD/MM/YYYY HH:mm Z",
								)}
							</p>
						</div>
					) : (
						<form.Subscribe selector={(state) => state.values.startNow}>
							{(startNow) => !startNow && dateField("startsAt", "Inicio")}
						</form.Subscribe>
					)}
					{dateField("endsAt", "Fin previsto")}
					{editor.kind !== "change-end" && (
						<form.Field name="reason">
							{(field) => (
								<Field data-invalid={!field.state.meta.isValid}>
									<FieldLabel htmlFor={`${id}-reason`}>Motivo</FieldLabel>
									<Textarea
										id={`${id}-reason`}
										value={field.state.value}
										maxLength={500}
										aria-invalid={!field.state.meta.isValid}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										placeholder="Ej. Mantenimiento preventivo"
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>
					)}
				</FieldGroup>
			</fieldset>
			<div className="flex justify-end gap-2 border-t pt-4">
				<Button
					type="button"
					variant="outline"
					disabled={pending}
					onClick={onBack}
				>
					Volver
				</Button>
				<form.Subscribe
					selector={(state) => [
						state.canSubmit,
						state.isSubmitting,
						state.values.startNow,
					]}
				>
					{([canSubmit, submitting, startNow]) => (
						<Button
							type="submit"
							disabled={!canSubmit || submitting || pending}
						>
							{pending || submitting
								? "Guardando..."
								: editor.kind === "schedule"
									? startNow
										? "Iniciar bloqueo"
										: "Programar bloqueo"
									: "Guardar cambios"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
