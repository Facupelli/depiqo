import { z } from "zod";

const STORAGE_KEY_PREFIX = "confirmed-rental-success";

const confirmedRentalSuccessSnapshotSchema = z.discriminatedUnion(
	"fulfillmentMethod",
	[
		z.object({
			fulfillmentMethod: z.literal("PICKUP"),
			pickupDate: z.iso.date(),
			pickupLocation: z.string().trim().min(1),
			pickupTime: z.string().trim().min(1),
		}),
		z.object({
			fulfillmentMethod: z.literal("DELIVERY"),
		}),
	],
);

export type ConfirmedRentalSuccessSnapshot = z.infer<
	typeof confirmedRentalSuccessSnapshotSchema
>;

export function writeConfirmedRentalSuccessSnapshot(
	rentalNumber: number,
	snapshot: ConfirmedRentalSuccessSnapshot,
): void {
	try {
		sessionStorage.setItem(
			getStorageKey(rentalNumber),
			JSON.stringify(confirmedRentalSuccessSnapshotSchema.parse(snapshot)),
		);
	} catch {
		// Storage can be unavailable. The success page will use its generic view.
	}
}

export function readConfirmedRentalSuccessSnapshot(
	rentalNumber: number,
): ConfirmedRentalSuccessSnapshot | null {
	try {
		const stored = sessionStorage.getItem(getStorageKey(rentalNumber));
		if (!stored) return null;

		const parsed = confirmedRentalSuccessSnapshotSchema.safeParse(
			JSON.parse(stored),
		);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

function getStorageKey(rentalNumber: number): string {
	return `${STORAGE_KEY_PREFIX}:${rentalNumber}`;
}
