import type { BranchScheduleSlotDto } from "@repo/api-contracts";
import { useState } from "react";

export function useCartCheckoutTimes() {
	const [pickupSlot, setPickupSlot] = useState<
		BranchScheduleSlotDto | undefined
	>(undefined);
	const [returnSlot, setReturnSlot] = useState<
		BranchScheduleSlotDto | undefined
	>(undefined);
	const [isTimesRequired, setIsTimesRequired] = useState(false);

	const onPickupSlotChange = (value: BranchScheduleSlotDto) => {
		setPickupSlot(value);
		if (returnSlot) {
			setIsTimesRequired(false);
		}
	};

	const onReturnSlotChange = (value: BranchScheduleSlotDto) => {
		setReturnSlot(value);
		if (pickupSlot) {
			setIsTimesRequired(false);
		}
	};

	return {
		pickupSlot,
		returnSlot,
		isTimesRequired,
		onPickupSlotChange,
		onReturnSlotChange,
		requireTimes: () => setIsTimesRequired(true),
	};
}
