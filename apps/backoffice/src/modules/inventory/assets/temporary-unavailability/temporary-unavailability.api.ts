import {
	cancelAssetUnavailabilityContract,
	listAssetUnavailabilityContract,
	rescheduleAssetUnavailabilityContract,
	scheduleAssetUnavailabilityContract,
} from "@repo/api-contracts";
import type { z } from "zod";
import { apiFetch } from "@/lib/api/api-fetch";

export type UnavailabilityChange =
	| {
			kind: "schedule";
			body: z.input<typeof scheduleAssetUnavailabilityContract.body>;
	  }
	| {
			kind: "reschedule";
			periodId: string;
			body: z.input<typeof rescheduleAssetUnavailabilityContract.body>;
	  }
	| { kind: "remove"; periodId: string };

function assetPath(path: string, assetId: string) {
	return path.replace(":assetId", encodeURIComponent(assetId));
}

export async function listUnavailability(assetId: string, signal: AbortSignal) {
	const contract = listAssetUnavailabilityContract;
	const params = contract.params.parse({ assetId });
	const data = await apiFetch(assetPath(contract.path, params.assetId), {
		method: contract.method,
		signal,
	});
	return contract.response.parse({ data }).data;
}

export async function changeUnavailability(
	assetId: string,
	change: UnavailabilityChange,
) {
	if (change.kind === "schedule") {
		const contract = scheduleAssetUnavailabilityContract;
		const params = contract.params.parse({ assetId });
		const data = await apiFetch(assetPath(contract.path, params.assetId), {
			method: contract.method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(contract.body.parse(change.body)),
		});
		return contract.response.parse({ data }).data;
	}

	const contract =
		change.kind === "reschedule"
			? rescheduleAssetUnavailabilityContract
			: cancelAssetUnavailabilityContract;
	const params = contract.params.parse({ assetId, periodId: change.periodId });
	const path = assetPath(contract.path, params.assetId).replace(
		":periodId",
		encodeURIComponent(params.periodId),
	);
	return contract.response.parse(
		await apiFetch(path, {
			method: contract.method,
			...(change.kind === "reschedule" && {
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(
					rescheduleAssetUnavailabilityContract.body.parse(change.body),
				),
			}),
		}),
	);
}
