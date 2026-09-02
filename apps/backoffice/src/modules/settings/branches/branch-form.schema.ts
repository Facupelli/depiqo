import { z } from "zod";

const timeStringSchema = z
	.string()
	.regex(/^\d{2}:\d{2}$/, "Ingresa un horario válido");

export const branchScheduleWindowFormSchema = z
	.object({
		enabled: z.boolean(),
		daysOfWeek: z.array(z.number().int().min(0).max(6)),
		openTime: timeStringSchema,
		closeTime: timeStringSchema,
		slotIntervalMinutes: z.number().int().positive().nullable(),
	})
	.refine((value) => !value.enabled || value.daysOfWeek.length > 0, {
		message: "Selecciona al menos un día.",
		path: ["daysOfWeek"],
	})
	.refine(
		(value) =>
			!value.enabled ||
			timeStringToMinutes(value.openTime) <=
				timeStringToMinutes(value.closeTime),
		{
			message: "La hora inicial debe ser anterior o igual a la final.",
			path: ["openTime"],
		},
	)
	.refine(
		(value) => {
			if (!value.enabled) return true;
			const isFixedHour = value.openTime === value.closeTime;
			const hasInterval = value.slotIntervalMinutes !== null;
			return isFixedHour !== hasInterval;
		},
		{
			message:
				"Los horarios de hora fija no llevan intervalo. Las ventanas horarias requieren intervalo.",
			path: ["slotIntervalMinutes"],
		},
	);

export const branchFormSchema = z.object({
	name: z.string().trim().min(1, "El nombre es obligatorio."),
	address: z.string(),
	addressLocationId: z.string().nullable(),
	timezone: z.string(),
	scheduleEnabled: z.boolean(),
	useSameScheduleForPickupAndReturn: z.boolean(),
	pickupSchedule: branchScheduleWindowFormSchema,
	returnSchedule: branchScheduleWindowFormSchema,
});

export type BranchScheduleWindowFormValues = z.infer<
	typeof branchScheduleWindowFormSchema
>;
export type BranchFormValues = z.infer<typeof branchFormSchema>;

export const weekdayDefaults = [1, 2, 3, 4, 5];

export const branchFormDefaults: BranchFormValues = {
	name: "",
	address: "",
	addressLocationId: null,
	timezone: "",
	scheduleEnabled: true,
	useSameScheduleForPickupAndReturn: true,
	pickupSchedule: {
		enabled: true,
		daysOfWeek: weekdayDefaults,
		openTime: "08:00",
		closeTime: "18:00",
		slotIntervalMinutes: 30,
	},
	returnSchedule: {
		enabled: true,
		daysOfWeek: weekdayDefaults,
		openTime: "08:00",
		closeTime: "18:00",
		slotIntervalMinutes: 30,
	},
};

export const slotIntervalOptions = [15, 30, 60] as const;

export const daysOfWeek = [
	{ value: 1, label: "L" },
	{ value: 2, label: "M" },
	{ value: 3, label: "X" },
	{ value: 4, label: "J" },
	{ value: 5, label: "V" },
	{ value: 6, label: "S" },
	{ value: 0, label: "D" },
] as const;

export function timeStringToMinutes(time: string): number {
	const [hours, minutes] = time.split(":").map(Number);
	return hours * 60 + minutes;
}

export function minutesToTimeString(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;
}

export function getSupportedTimezones(): string[] {
	const supported = Intl.supportedValuesOf?.("timeZone") ?? [];
	return ["UTC", ...supported.filter((timezone) => timezone !== "UTC")];
}
