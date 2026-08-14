import {
	type GetBranchDetailResponseDto,
	type GetBranchDetailScheduleDto,
	type UpdateBranchBodyDto,
	UpdateBranchBodySchema,
} from "@repo/api-contracts";
import { emptyToNull } from "@/shared/utils/form.utils";
import {
	type BranchFormValues,
	type BranchScheduleWindowFormValues,
	branchFormDefaults,
	branchFormSchema,
	minutesToTimeString,
	timeStringToMinutes,
} from "../branch-form.schema";

export const updateBranchFormSchema = branchFormSchema;
export type UpdateBranchFormValues = BranchFormValues;

export function toUpdateBranchFormDefaults(
	branch: GetBranchDetailResponseDto,
): UpdateBranchFormValues {
	const pickupSchedule = toScheduleWindowDefaults(branch.schedules, "PICKUP");
	const returnSchedule = toScheduleWindowDefaults(branch.schedules, "RETURN");
	const hasPickupSchedules = pickupSchedule.enabled;
	const hasReturnSchedules = returnSchedule.enabled;

	return {
		...branchFormDefaults,
		name: branch.name,
		address: branch.address ?? "",
		timezone: branch.timezone ?? "",
		supportsDelivery: branch.supportsDelivery,
		deliveryDefaultCountry: branch.deliveryDefaultCountry ?? "",
		deliveryDefaultStateRegion: branch.deliveryDefaultStateRegion ?? "",
		deliveryDefaultCity: branch.deliveryDefaultCity ?? "",
		deliveryDefaultPostalCode: branch.deliveryDefaultPostalCode ?? "",
		scheduleEnabled: hasPickupSchedules || hasReturnSchedules,
		useSameScheduleForPickupAndReturn: schedulesAreEquivalent(
			pickupSchedule,
			returnSchedule,
		),
		pickupSchedule,
		returnSchedule,
	};
}

export function toUpdateBranchBodyDto(
	values: UpdateBranchFormValues,
): UpdateBranchBodyDto {
	const parsedValues = updateBranchFormSchema.parse(values);
	const body: UpdateBranchBodyDto = {
		name: parsedValues.name.trim(),
		address: emptyToNull(parsedValues.address),
		timezone: emptyToNull(parsedValues.timezone),
		supportsDelivery: parsedValues.supportsDelivery,
	};

	if (parsedValues.supportsDelivery) {
		body.deliveryDefaultCountry = emptyToNull(
			parsedValues.deliveryDefaultCountry,
		);
		body.deliveryDefaultStateRegion = emptyToNull(
			parsedValues.deliveryDefaultStateRegion,
		);
		body.deliveryDefaultCity = emptyToNull(parsedValues.deliveryDefaultCity);
		body.deliveryDefaultPostalCode = emptyToNull(
			parsedValues.deliveryDefaultPostalCode,
		);
	}

	body.schedules = parsedValues.scheduleEnabled
		? toUpdateBranchScheduleDtos(parsedValues)
		: [];

	return UpdateBranchBodySchema.parse(body);
}

function toUpdateBranchScheduleDtos(values: UpdateBranchFormValues) {
	const pickupSchedules = windowToScheduleDtos("PICKUP", values.pickupSchedule);
	const returnWindow = values.useSameScheduleForPickupAndReturn
		? values.pickupSchedule
		: values.returnSchedule;
	const returnSchedules = windowToScheduleDtos("RETURN", returnWindow);

	return [...pickupSchedules, ...returnSchedules];
}

function windowToScheduleDtos(
	type: "PICKUP" | "RETURN",
	window: BranchScheduleWindowFormValues,
) {
	if (!window.enabled) {
		return [];
	}

	return window.daysOfWeek.map((dayOfWeek) => ({
		type,
		dayOfWeek,
		specificDate: null,
		openTime: timeStringToMinutes(window.openTime),
		closeTime: timeStringToMinutes(window.closeTime),
		slotIntervalMinutes: window.slotIntervalMinutes,
	}));
}

function toScheduleWindowDefaults(
	schedules: GetBranchDetailScheduleDto[],
	type: "PICKUP" | "RETURN",
): BranchScheduleWindowFormValues {
	const weeklySchedules = schedules
		.filter((schedule) => schedule.type === type && schedule.dayOfWeek !== null)
		.sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0));

	if (weeklySchedules.length === 0) {
		return {
			...branchFormDefaults.pickupSchedule,
			enabled: false,
			daysOfWeek: [],
		};
	}

	const [firstSchedule] = weeklySchedules;

	return {
		enabled: true,
		daysOfWeek: weeklySchedules.map((schedule) => schedule.dayOfWeek ?? 0),
		openTime: minutesToTimeString(firstSchedule.openTime),
		closeTime: minutesToTimeString(firstSchedule.closeTime),
		slotIntervalMinutes: firstSchedule.slotIntervalMinutes,
	};
}

function schedulesAreEquivalent(
	pickupSchedule: BranchScheduleWindowFormValues,
	returnSchedule: BranchScheduleWindowFormValues,
): boolean {
	return (
		pickupSchedule.enabled === returnSchedule.enabled &&
		pickupSchedule.openTime === returnSchedule.openTime &&
		pickupSchedule.closeTime === returnSchedule.closeTime &&
		pickupSchedule.slotIntervalMinutes === returnSchedule.slotIntervalMinutes &&
		pickupSchedule.daysOfWeek.join(",") === returnSchedule.daysOfWeek.join(",")
	);
}
