import type { InvoiceDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
	ExternalLink,
	History,
	MoreHorizontal,
	Pencil,
	Trash2,
} from "lucide-react";
import { formatExactCurrencyRate } from "@/shared/utils/formatters";
import { formatInvoiceDate } from "./invoice.utils";

export type InvoiceRowAction = "correct" | "history" | "remove";

export function InvoiceListRow({
	invoice,
	canManage,
	mutationDisabled,
	onAction,
}: {
	invoice: InvoiceDto;
	canManage: boolean;
	mutationDisabled: boolean;
	onAction: (invoice: InvoiceDto, action: InvoiceRowAction) => void;
}) {
	return (
		<li className="flex min-w-0 items-start gap-2 py-2.5 first:pt-0 last:pb-0">
			<div className="min-w-0 flex-1 space-y-1">
				<p className="line-clamp-2 text-sm font-medium text-neutral-950 [overflow-wrap:anywhere]">
					{invoice.reference}
				</p>
				<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					<time
						dateTime={invoice.issuedOn}
						className="text-xs text-neutral-500"
					>
						{formatInvoiceDate(invoice.issuedOn)}
					</time>
					<span className="min-w-0 break-words font-mono text-sm text-neutral-950">
						{formatExactCurrencyRate(invoice.amount, invoice.currency)}
					</span>
				</div>
			</div>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="shrink-0 text-neutral-500"
							aria-label={`Acciones para la factura ${invoice.reference}`}
						>
							<MoreHorizontal className="size-4" />
						</Button>
					}
				/>
				<DropdownMenuContent align="end" className="min-w-48">
					{canManage && !invoice.removedAt ? (
						<DropdownMenuItem
							disabled={mutationDisabled}
							onClick={() => onAction(invoice, "correct")}
						>
							<Pencil className="size-3.5" />
							Editar registro
						</DropdownMenuItem>
					) : null}
					<DropdownMenuItem onClick={() => onAction(invoice, "history")}>
						<History className="size-3.5" />
						Ver historial
					</DropdownMenuItem>
					{invoice.externalUrl ? (
						<DropdownMenuItem
							render={
								<a
									href={invoice.externalUrl}
									target="_blank"
									rel="noopener noreferrer"
								>
									<ExternalLink className="size-3.5" />
									Abrir factura externa
								</a>
							}
						/>
					) : null}
					{canManage && !invoice.removedAt ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								disabled={mutationDisabled}
								onClick={() => onAction(invoice, "remove")}
							>
								<Trash2 className="size-3.5" />
								Eliminar registro
							</DropdownMenuItem>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</li>
	);
}
