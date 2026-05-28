import type { LocationScheduleResponseDto } from "@repo/schemas";
import type { ScheduleSlotType } from "@repo/types";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ProblemDetailsError } from "@/shared/errors";
import {
	useBulkCreateLocationSchedules,
	useUpdateLocationSchedule,
} from "../../locations/location-schedules.queries";
import {
	getScheduleSlotDefaults,
	type ScheduleSlotFormValues,
	scheduleToFormValues,
	toAddScheduleDtos,
} from "../../locations/schemas/location-schedule-form.schema";
import { ScheduleSlotForm } from "./schedule-slot-form";

// ---------------------------------------------------------------------------
// Modal state discriminated union
// The parent controls this — it encodes intent (create vs edit) and enough
// context to derive the correct form defaults without passing raw data down.
// ---------------------------------------------------------------------------

export type ScheduleSlotModalState =
	| { open: false }
	| {
			open: true;
			mode: "create";
			slotType: ScheduleSlotType;
			/** Present for weekly-cycle additions; absent for override additions. */
			dayOfWeek?: number;
	  }
	| {
			open: true;
			mode: "edit";
			schedule: LocationScheduleResponseDto;
	  };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScheduleSlotModalProps {
	state: ScheduleSlotModalState;
	locationId: string;
	onClose: () => void;
}

export function ScheduleSlotModal({
	state,
	locationId,
	onClose,
}: ScheduleSlotModalProps) {
	const bulkCreate = useBulkCreateLocationSchedules();
	const update = useUpdateLocationSchedule();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const isPending = bulkCreate.isPending || update.isPending;

	const defaultValues: ScheduleSlotFormValues = (() => {
		if (!state.open) {
			return getScheduleSlotDefaults({ type: "PICKUP", mode: "weekly" });
		}
		if (state.mode === "edit") {
			return scheduleToFormValues(state.schedule);
		}
		return getScheduleSlotDefaults({
			type: state.slotType,
			mode: state.dayOfWeek !== undefined ? "weekly" : "specific",
			daysOfWeek: state.dayOfWeek !== undefined ? [state.dayOfWeek] : [],
		});
	})();

	const isEditMode = state.open && state.mode === "edit";
	const title = isEditMode ? "Edit Schedule Slot" : "Add Schedule Slot";

	function handleClose() {
		setErrorMessage(null);
		onClose();
	}

	async function handleSubmit(values: ScheduleSlotFormValues) {
		const dtos = toAddScheduleDtos(values);
		setErrorMessage(null);

		try {
			if (state.open && state.mode === "edit") {
				// Edit always produces exactly one DTO — the single record being updated
				await update.mutateAsync({
					locationId,
					scheduleId: state.schedule.id,
					dto: dtos[0],
				});
			} else {
				await bulkCreate.mutateAsync({ items: dtos, locationId });
			}

			handleClose();
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				setErrorMessage(
					error.problemDetails.detail ??
						error.problemDetails.title ??
						"No se pudo guardar la franja horaria.",
				);
				return;
			}

			setErrorMessage("Ocurrió un error al guardar la franja horaria.");
		}
	}

	return (
		<Dialog open={state.open} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Define availability for this location.
					</DialogDescription>
				</DialogHeader>

				{errorMessage && (
					<Alert variant="destructive">
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
				)}

				{state.open && (
					<ScheduleSlotForm
						key={
							isEditMode && state.open ? (state as any).schedule.id : "create"
						}
						defaultValues={defaultValues}
						isEditMode={isEditMode}
						onSubmit={handleSubmit}
						onCancel={handleClose}
						isPending={isPending}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
