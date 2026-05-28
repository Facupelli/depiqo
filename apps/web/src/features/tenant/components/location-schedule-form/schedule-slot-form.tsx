import { useForm, useStore } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
	DAYS_OF_WEEK,
	SLOT_INTERVAL_OPTIONS,
} from "../../locations/constants/location-schedule.constants";
import {
	type ScheduleSlotFormValues,
	scheduleSlotFormSchema,
} from "../../locations/schemas/location-schedule-form.schema";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScheduleSlotFormProps {
	defaultValues: ScheduleSlotFormValues;
	/** Edit mode — day chips are locked to the single existing day. */
	isEditMode: boolean;
	onSubmit: (values: ScheduleSlotFormValues) => Promise<void>;
	onCancel: () => void;
	isPending: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScheduleSlotForm({
	defaultValues,
	isEditMode,
	onSubmit,
	onCancel,
	isPending,
}: ScheduleSlotFormProps) {
	const form = useForm({
		defaultValues,
		validators: { onSubmit: scheduleSlotFormSchema },
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const isFixedHour = useStore(
		form.store,
		(s) => s.values.openTime === s.values.closeTime,
	);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="space-y-5"
		>
			<FieldGroup className="space-y-5">
				{/* ----------------------------------------------------------------
            Slot Type — Pickup | Return
        ----------------------------------------------------------------- */}
				<form.Field name="type">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel>Slot Type</FieldLabel>
								<div className="flex rounded-lg border border-border bg-muted p-1">
									{(["PICKUP", "RETURN"] as const).map((type) => (
										<button
											key={type}
											type="button"
											disabled={isEditMode}
											onClick={() => field.handleChange(type)}
											className={cn(
												"flex-1 rounded-md py-1.5 text-sm font-medium transition-all",
												field.state.value === type
													? "bg-background text-foreground shadow-sm"
													: "text-muted-foreground hover:text-foreground",
												isEditMode && "cursor-not-allowed opacity-60",
											)}
										>
											{type.charAt(0) + type.slice(1).toLowerCase()}
										</button>
									))}
								</div>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				{/* ----------------------------------------------------------------
            Mode — Weekly | Specific date
        ----------------------------------------------------------------- */}
				<form.Field name="mode">
					{(modeField) => (
						<>
							<Field>
								<FieldLabel>Applicable To</FieldLabel>
								<div className="flex rounded-lg border border-border bg-muted p-1">
									{(
										[
											{ value: "weekly", label: "Weekly recurrence" },
											{ value: "specific", label: "Specific date" },
										] as const
									).map((opt) => (
										<button
											key={opt.value}
											type="button"
											disabled={isEditMode}
											onClick={() => modeField.handleChange(opt.value)}
											className={cn(
												"flex-1 rounded-md py-1.5 text-sm font-medium transition-all",
												modeField.state.value === opt.value
													? "bg-background text-foreground shadow-sm"
													: "text-muted-foreground hover:text-foreground",
												isEditMode && "cursor-not-allowed opacity-60",
											)}
										>
											{opt.label}
										</button>
									))}
								</div>
							</Field>

							{modeField.state.value === "weekly" ? (
								/* ------------------------------------------------------------
                   Day chips — multi-select in create mode, locked in edit mode.
                   Edit mode only ever has one day (the record being edited), so
                   locking prevents accidentally changing which day the record
                   belongs to. The user should create a new slot instead.
                ------------------------------------------------------------ */
								<form.Field name="daysOfWeek">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;

										function toggle(day: number) {
											if (isEditMode) return;
											const current = field.state.value;
											const next = current.includes(day)
												? current.filter((d) => d !== day)
												: [...current, day];
											field.handleChange(next);
										}

										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel>{isEditMode ? "Day" : "Days"}</FieldLabel>
												<div className="flex gap-1.5">
													{DAYS_OF_WEEK.map((d) => {
														const isSelected = field.state.value.includes(
															d.value,
														);
														return (
															<button
																key={d.value}
																type="button"
																onClick={() => toggle(d.value)}
																disabled={isEditMode && !isSelected}
																aria-pressed={isSelected}
																className={cn(
																	"flex-1 rounded-md border py-1.5 text-xs font-medium transition-all",
																	isSelected
																		? "border-foreground bg-foreground text-background"
																		: "border-border bg-transparent text-muted-foreground",
																	!isEditMode &&
																		"hover:border-foreground/40 hover:text-foreground",
																	isEditMode && !isSelected && "opacity-30",
																)}
															>
																{d.label}
															</button>
														);
													})}
												</div>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							) : (
								/* Specific date picker */
								<form.Field name="specificDate">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel>Date</FieldLabel>
												<Input
													type="date"
													name={field.name}
													value={field.state.value ?? ""}
													disabled={isEditMode}
													onBlur={field.handleBlur}
													onChange={(e) =>
														field.handleChange(e.target.value || null)
													}
													aria-invalid={isInvalid}
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							)}
						</>
					)}
				</form.Field>
				{/* ----------------------------------------------------------------
            Open Time / Close Time
        ----------------------------------------------------------------- */}
				<div className="grid grid-cols-2 gap-4">
					<form.Field name="openTime">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel>Open Time</FieldLabel>
									<Input
										type="time"
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => {
											field.handleChange(e.target.value);
											if (e.target.value === form.getFieldValue("closeTime")) {
												form.setFieldValue("slotIntervalMinutes", null);
											}
										}}
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="closeTime">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel>Close Time</FieldLabel>
									<Input
										type="time"
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => {
											field.handleChange(e.target.value);
											if (e.target.value === form.getFieldValue("openTime")) {
												form.setFieldValue("slotIntervalMinutes", null);
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
				{/* ----------------------------------------------------------------
            Slot Interval
        ----------------------------------------------------------------- */}
				{!isFixedHour && (
					<form.Field name="slotIntervalMinutes">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel>Slot Interval</FieldLabel>
									<div className="flex gap-2">
										{SLOT_INTERVAL_OPTIONS.map((mins) => (
											<button
												key={mins}
												type="button"
												onClick={() => field.handleChange(mins)}
												className={cn(
													"flex-1 rounded-lg border py-2 text-sm font-medium transition-all",
													field.state.value === mins
														? "border-foreground bg-foreground text-background"
														: "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
												)}
											>
												{mins} min
											</button>
										))}
									</div>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				)}
			</FieldGroup>

			{/* ----------------------------------------------------------------
          Actions
      ----------------------------------------------------------------- */}
			<div className="flex items-center justify-end gap-3 pt-2">
				<Button
					type="button"
					variant="ghost"
					onClick={onCancel}
					disabled={isPending}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={isPending}>
					{isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
					Save Schedule Slot
				</Button>
			</div>
		</form>
	);
}
