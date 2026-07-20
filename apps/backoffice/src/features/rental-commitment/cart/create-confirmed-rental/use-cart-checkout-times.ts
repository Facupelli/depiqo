import { useState } from "react";

export function useCartCheckoutTimes() {
	const [pickupTime, setPickupTime] = useState<number | undefined>(undefined);
	const [returnTime, setReturnTime] = useState<number | undefined>(undefined);
	const [isTimesRequired, setIsTimesRequired] = useState(false);

	const onPickupTimeChange = (value: number) => {
		setPickupTime(value);
		if (value && returnTime) {
			setIsTimesRequired(false);
		}
	};

	const onReturnTimeChange = (value: number) => {
		setReturnTime(value);
		if (pickupTime && value) {
			setIsTimesRequired(false);
		}
	};

	return {
		pickupTime,
		returnTime,
		isTimesRequired,
		onPickupTimeChange,
		onReturnTimeChange,
		requireTimes: () => setIsTimesRequired(true),
	};
}
