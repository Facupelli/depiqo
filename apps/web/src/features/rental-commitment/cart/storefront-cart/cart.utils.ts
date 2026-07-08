import dayjs from "@/lib/dates/dayjs";

export const formatSlot = (minutes: number): string =>
	dayjs().startOf("day").add(minutes, "minute").format("h:mm A");
