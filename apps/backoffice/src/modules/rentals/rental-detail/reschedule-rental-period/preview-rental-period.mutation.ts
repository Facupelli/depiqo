import { useMutation } from "@tanstack/react-query";
import {
	type PreviewRentalPeriodVariables,
	previewRentalPeriod,
} from "./preview-rental-period.api";

export function usePreviewRentalPeriod() {
	return useMutation({
		retry: false,
		mutationFn: async (
			request: PreviewRentalPeriodVariables & { generation: number },
		) => ({ request, preview: await previewRentalPeriod(request) }),
	});
}
