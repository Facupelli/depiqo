import {
	TenantPermission,
	type TenantPermission as TenantPermissionId,
} from "@repo/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { can } from "@/auth/permissions";
import { getProblemDetailsStatus } from "@/shared/errors";
import { getInvoice, getRentalInvoices } from "./invoicing.api";

type InvoiceQueryOptions = {
	permissions: readonly TenantPermissionId[];
	includeRemoved?: boolean;
	enabled?: boolean;
};

export const invoicingKeys = {
	all: () => ["v2", "invoicing", "invoices"] as const,
	rentalLists: (rentalId: string) =>
		[...invoicingKeys.all(), "rental", rentalId.trim()] as const,
	rentalList: (rentalId: string, includeRemoved = false) =>
		[...invoicingKeys.rentalLists(rentalId), { includeRemoved }] as const,
	invoiceDetails: (invoiceId: string) =>
		[...invoicingKeys.all(), "detail", invoiceId.trim()] as const,
	invoiceDetail: (invoiceId: string, includeRemoved = false) =>
		[...invoicingKeys.invoiceDetails(invoiceId), { includeRemoved }] as const,
};

function retryInvoiceQuery(failureCount: number, error: Error): boolean {
	const status = getProblemDetailsStatus(error);
	return (
		failureCount < 2 &&
		(status === 0 || (status !== undefined && status >= 500))
	);
}

export const invoicingQueries = {
	rentalList: (
		rentalId: string,
		{ permissions, includeRemoved = false, enabled = true }: InvoiceQueryOptions,
	) =>
		queryOptions({
			queryKey: invoicingKeys.rentalList(rentalId, includeRemoved),
			queryFn: ({ signal }) =>
				getRentalInvoices({ rentalId, includeRemoved }, signal),
			enabled: enabled && can(permissions, TenantPermission.InvoicingRead),
			retry: retryInvoiceQuery,
		}),
	invoiceDetail: (
		invoiceId: string,
		{ permissions, includeRemoved = false, enabled = true }: InvoiceQueryOptions,
	) =>
		queryOptions({
			queryKey: invoicingKeys.invoiceDetail(invoiceId, includeRemoved),
			queryFn: ({ signal }) =>
				getInvoice(invoiceId, { includeRemoved }, signal),
			enabled: enabled && can(permissions, TenantPermission.InvoicingRead),
			// Recheck the current version when opening an invoice workflow.
			staleTime: 0,
			retry: retryInvoiceQuery,
		}),
};
