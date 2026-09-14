import {
	type RescheduleConfirmedRentalPeriodBodyDto,
	RescheduleConfirmedRentalPeriodBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import {
	hydrateRentalPeriod,
	isRentalPeriodChronological,
	resolveRentalPeriod,
	type RentalPeriodValue,
	type ResolvedRentalPeriod,
} from "@/modules/rentals/shared/rental-period/rental-period";

const rescheduleRentalPeriodFormBaseSchema: z.ZodType<RentalPeriodValue> =
	z.object({
		startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
		startTime: z
			.number()
			.int()
			.min(0)
			.max(24 * 60 - 1),
		endDate: z.string().min(1, "La fecha de devolución es obligatoria"),
		endTime: z
			.number()
			.int()
			.min(0)
			.max(24 * 60 - 1),
	});

export type RescheduleRentalPeriodFormValues = RentalPeriodValue;

export type RescheduleRentalPeriodValidationContext = {
	operationalTimezone: string;
	currentOperationTime: Date;
};

export function createRescheduleRentalPeriodFormSchema({
	operationalTimezone,
	currentOperationTime,
}: RescheduleRentalPeriodValidationContext) {
	const currentOperationTimeMs = currentOperationTime.getTime();

	return rescheduleRentalPeriodFormBaseSchema.superRefine((value, ctx) => {
		const resolution = resolveRentalPeriod(value, operationalTimezone);
		if (resolution.kind === "nonexistent") {
			ctx.addIssue({
				code: "custom",
				path: [resolution.endpoint === "start" ? "startTime" : "endTime"],
				message: "El horario seleccionado no existe en esta sucursal",
			});
			return;
		}

		if (!isRentalPeriodChronological(resolution.period)) {
			ctx.addIssue({
				code: "custom",
				path: ["endDate"],
				message: "La devolución debe ser posterior al inicio",
			});
		}

		if (resolution.period.start.getTime() <= currentOperationTimeMs) {
			ctx.addIssue({
				code: "custom",
				path: ["startDate"],
				message: "El inicio debe ser posterior al momento actual",
			});
		}
	});
}

export function hydrateConfirmedRentalPeriod(
	persistedStartInstant: string | Date,
	persistedEndInstant: string | Date,
	operationalTimezone: string,
): RescheduleRentalPeriodFormValues {
	return hydrateRentalPeriod(
		persistedStartInstant,
		persistedEndInstant,
		operationalTimezone,
	);
}

export function toRescheduleConfirmedRentalPeriodBody(
	values: RescheduleRentalPeriodFormValues,
	operationalTimezone: string,
	expectedVersion: number,
): RescheduleConfirmedRentalPeriodBodyDto {
	const period = resolveRescheduleRentalPeriod(values, operationalTimezone);

	return RescheduleConfirmedRentalPeriodBodySchema.parse({
		expectedVersion,
		period: {
			start: period.start.toISOString(),
			end: period.end.toISOString(),
		},
	});
}

function resolveRescheduleRentalPeriod(
	values: RentalPeriodValue,
	operationalTimezone: string,
): ResolvedRentalPeriod {
	const resolution = resolveRentalPeriod(values, operationalTimezone);
	if (resolution.kind === "nonexistent") {
		throw new RangeError(
			"The selected local time does not exist in the branch timezone.",
		);
	}

	return resolution.period;
}
