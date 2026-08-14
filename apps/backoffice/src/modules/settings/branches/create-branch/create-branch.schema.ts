import {
	type CreateBranchBodyDto,
	CreateBranchBodySchema,
	type CreateBranchScheduleBodyDto,
	CreateBranchScheduleBodySchema,
} from "@repo/api-contracts";
import { emptyToNull } from "@/shared/utils/form.utils";
import {
	type BranchFormValues,
	type BranchScheduleWindowFormValues,
	branchFormDefaults,
	branchFormSchema,
	timeStringToMinutes,
} from "../branch-form.schema";

export const createBranchFormSchema = branchFormSchema;
export const createBranchFormDefaults = branchFormDefaults;
export type CreateBranchFormValues = BranchFormValues;

export function toCreateBranchBodyDto(
	values: CreateBranchFormValues,
): CreateBranchBodyDto {
	const parsedValues = createBranchFormSchema.parse(values);
	const body: CreateBranchBodyDto = {
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

	const schedules = toCreateBranchScheduleDtos(parsedValues);
	if (schedules.length > 0) {
		body.schedules = schedules;
	}

	return CreateBranchBodySchema.parse(body);
}

export function toCreateBranchScheduleDtos(
	values: CreateBranchFormValues,
): CreateBranchScheduleBodyDto[] {
	if (!values.scheduleEnabled) {
		return [];
	}

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
): CreateBranchScheduleBodyDto[] {
	if (!window.enabled) {
		return [];
	}

	return window.daysOfWeek.map((dayOfWeek) =>
		CreateBranchScheduleBodySchema.parse({
			type,
			dayOfWeek,
			specificDate: null,
			openTime: timeStringToMinutes(window.openTime),
			closeTime: timeStringToMinutes(window.closeTime),
			slotIntervalMinutes: window.slotIntervalMinutes,
		}),
	);
}
