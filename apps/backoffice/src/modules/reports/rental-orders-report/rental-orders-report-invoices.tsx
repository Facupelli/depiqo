import type { RentalOrdersReportInvoiceDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { ChevronDown } from "lucide-react";
import { formatExactMoney } from "@/shared/utils/decimal-string";
import { formatReportInvoiceDate } from "./rental-orders-report.utils";

export function RentalOrdersReportInvoices({
	invoices,
	rentalNumber,
}: {
	invoices: RentalOrdersReportInvoiceDto[];
	rentalNumber: string;
}) {
	if (invoices.length === 0)
		return <span className="text-muted-foreground">Sin factura</span>;
	if (invoices.length === 1) return <InvoiceSummary invoice={invoices[0]} />;
	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						aria-label={`Ver ${invoices.length} facturas de ${rentalNumber}`}
						className="h-8 gap-2 bg-muted px-2.5 text-sm font-normal text-foreground pointer-coarse:min-h-11"
					>
						{invoices.length} facturas
						<ChevronDown className="size-3.5" />
					</Button>
				}
			/>
			<PopoverContent
				align="start"
				className="max-h-80 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto p-4"
			>
				<PopoverTitle className="text-sm font-semibold text-foreground">
					Facturas de {rentalNumber}
				</PopoverTitle>
				<ul className="divide-y divide-border">
					{invoices.map((invoice) => (
						<li key={invoice.id} className="py-2 first:pt-0 last:pb-0">
							<InvoiceSummary invoice={invoice} />
						</li>
					))}
				</ul>
			</PopoverContent>
		</Popover>
	);
}

function InvoiceSummary({
	invoice,
}: {
	invoice: RentalOrdersReportInvoiceDto;
}) {
	return (
		<div className="min-w-0 space-y-0.5">
			<p
				className="max-w-64 truncate text-sm font-medium text-foreground"
				title={invoice.reference}
			>
				{invoice.reference}
			</p>
			<p className="text-xs text-muted-foreground">
				<time dateTime={invoice.issuedOn}>
					{formatReportInvoiceDate(invoice.issuedOn)}
				</time>{" "}
				· {formatExactMoney(invoice.amount, invoice.currency)}{" "}
				{invoice.currency}
			</p>
		</div>
	);
}
