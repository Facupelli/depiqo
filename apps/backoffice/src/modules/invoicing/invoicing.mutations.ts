import type { RegisterExternalInvoiceBodyDto } from "@repo/api-contracts";
import {
	type QueryClient,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { reportKeys } from "@/modules/reports/public";
import {
	type CorrectInvoiceRegistrationVariables,
	correctInvoiceRegistration,
	type RemoveInvoiceRegistrationVariables,
	registerExternalInvoice,
	removeInvoiceRegistration,
} from "./invoicing.api";
import { toInvoicingUiError } from "./invoicing.errors";
import { invoicingKeys } from "./invoicing.queries";

type InvoiceMutationContext = {
	// Cache context only; rental association is never sent in PATCH or DELETE.
	rentalId: string;
	invoiceId: string;
};

export type CorrectInvoiceRegistrationMutationVariables =
	CorrectInvoiceRegistrationVariables & InvoiceMutationContext;

export type RemoveInvoiceRegistrationMutationVariables =
	RemoveInvoiceRegistrationVariables & InvoiceMutationContext;

function invoiceMutationTargets({
	rentalId,
	invoiceId,
}: InvoiceMutationContext) {
	return [
		invoicingKeys.rentalLists(rentalId),
		invoicingKeys.invoiceDetails(invoiceId),
		reportKeys.rentals(),
	];
}

async function refreshInvoiceAfterError(
	queryClient: QueryClient,
	error: unknown,
	variables: InvoiceMutationContext,
) {
	const { kind } = toInvoicingUiError(error);
	if (
		kind !== "version-conflict" &&
		kind !== "registration-removed" &&
		kind !== "invoice-not-found"
	) {
		return;
	}

	// Refresh cached truth, but never rebase or retry the failed mutation.
	await Promise.all(
		invoiceMutationTargets(variables).map((queryKey) =>
			queryClient.invalidateQueries({ queryKey }),
		),
	);
}

export function useRegisterExternalInvoice() {
	return useMutation({
		mutationFn: registerExternalInvoice,
		retry: false,
		meta: {
			invalidates: (variables: RegisterExternalInvoiceBodyDto) => [
				invoicingKeys.rentalLists(variables.rentalId),
				reportKeys.rentals(),
			],
		},
	});
}

export function useCorrectInvoiceRegistration() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (variables: CorrectInvoiceRegistrationMutationVariables) =>
			correctInvoiceRegistration(variables),
		retry: false,
		meta: { invalidates: invoiceMutationTargets },
		onError: (error, variables) =>
			refreshInvoiceAfterError(queryClient, error, variables),
	});
}

export function useRemoveInvoiceRegistration() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (variables: RemoveInvoiceRegistrationMutationVariables) =>
			removeInvoiceRegistration(variables),
		retry: false,
		meta: { invalidates: invoiceMutationTargets },
		onError: (error, variables) =>
			refreshInvoiceAfterError(queryClient, error, variables),
	});
}
