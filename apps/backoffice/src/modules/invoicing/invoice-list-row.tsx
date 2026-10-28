import type { InvoiceDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { ExternalLink } from "lucide-react";
import { formatExactCurrencyRate } from "@/shared/utils/formatters";
import { formatInvoiceDate } from "./invoice.utils";

export function InvoiceListRow({
	invoice,
	onSelect,
}: {
	invoice: InvoiceDto;
	onSelect: () => void;
}) {
	return (
		<li className="flex min-w-0 items-start gap-2 py-2 first:pt-0 last:pb-0">
			<button
				type="button"
				onClick={onSelect}
				aria-label={`Ver registro de factura ${invoice.reference}`}
				className="group min-w-0 flex-1 space-y-1.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<span className="flex min-w-0 flex-wrap items-start gap-2">
					<span className="min-w-0 line-clamp-2 text-sm font-medium text-neutral-950 group-hover:text-primary [overflow-wrap:anywhere]">
						{invoice.reference}
					</span>
					{invoice.removedAt ? (
						<Badge variant="secondary">Registro eliminado</Badge>
					) : null}
				</span>
				<span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					<time dateTime={invoice.issuedOn} className="text-xs text-neutral-500">
						{formatInvoiceDate(invoice.issuedOn)}
					</time>
					<span className="min-w-0 break-words font-mono text-sm text-neutral-950">
						{formatExactCurrencyRate(invoice.amount, invoice.currency)}{" "}
						<span className="text-xs text-neutral-500">{invoice.currency}</span>
					</span>
				</span>
			</button>
			{invoice.externalUrl ? (
				<a
					href={invoice.externalUrl}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={`Abrir factura ${invoice.reference} en el sistema externo`}
					className="flex size-7 shrink-0 items-center justify-center rounded-md text-primary hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<ExternalLink className="size-3.5" />
				</a>
			) : null}
		</li>
	);
}
