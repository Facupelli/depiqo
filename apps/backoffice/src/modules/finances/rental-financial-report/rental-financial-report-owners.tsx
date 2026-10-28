import type { RentalFinancialReportTotalsDto } from "@repo/api-contracts";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { UserRound } from "lucide-react";
import { useId } from "react";
import { formatExactMoney } from "@/shared/utils/decimal-string";
import { getOwnerSharePercentage } from "./rental-financial-report.utils";

const percentageFormatter = new Intl.NumberFormat("es-AR", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

export function RentalFinancialReportOwners({
	totals,
	currency,
	periodLabel,
}: {
	totals: RentalFinancialReportTotalsDto;
	currency: string;
	periodLabel: string;
}) {
	const titleId = useId();
	return (
		<section
			aria-labelledby={titleId}
			className="min-w-0 rounded-lg border border-neutral-200/80 bg-card p-4 @4xl/finances:p-5"
		>
			<h2 id={titleId} className="text-sm font-semibold text-neutral-900">
				Participación de terceros
				<span className="sr-only"> · {periodLabel}</span>
			</h2>
			{totals.owners.length === 0 ? (
				<div className="flex min-h-64 items-center justify-center px-4 text-center text-sm text-neutral-500">
					No hay participación de terceros en este período.
				</div>
			) : (
				<div className="mt-4 overflow-hidden rounded-md border border-neutral-200/80">
					<Table className="text-xs">
						<TableHeader className="bg-neutral-50/80">
							<TableRow className="hover:bg-transparent">
								<TableHead className="h-9 px-3 text-xs font-medium text-neutral-500">
									Propietario
								</TableHead>
								<TableHead className="h-9 px-3 text-right text-xs font-medium text-neutral-500">
									Importe
								</TableHead>
								<TableHead
									colSpan={2}
									className="h-9 px-3 text-right text-xs font-medium text-neutral-500"
								>
									% del total
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{totals.owners.map((owner) => {
								const percentage = getOwnerSharePercentage(
									owner.amount,
									totals.thirdPartyAmount,
								);
								const initials = owner.ownerName
									?.trim()
									.split(/\s+/)
									.slice(0, 2)
									.map((word) => word[0])
									.join("")
									.toLocaleUpperCase("es");
								return (
									<TableRow key={owner.ownerId}>
										<TableCell className="px-3 py-3">
											<div className="flex min-w-0 items-center gap-2">
												<Avatar className="size-7" aria-hidden="true">
													<AvatarFallback className="bg-depiqo-blue-50 text-[10px] font-medium text-depiqo-blue-700">
														{initials || <UserRound className="size-3.5" />}
													</AvatarFallback>
												</Avatar>
												<span
													className="max-w-36 truncate text-neutral-700"
													title={owner.ownerName ?? owner.ownerId}
												>
													{owner.ownerName ?? (
														<span className="inline-flex max-w-full gap-1 align-bottom">
															<span className="truncate">
																Propietario no disponible
															</span>
															<span
																className="shrink-0 text-muted-foreground"
																aria-hidden="true"
															>
																· {owner.ownerId.slice(0, 8)}
															</span>
														</span>
													)}
													{owner.ownerName === null ? (
														<span className="sr-only"> · {owner.ownerId}</span>
													) : null}
												</span>
											</div>
										</TableCell>
										<TableCell className="px-3 text-right text-neutral-700 tabular-nums">
											{formatExactMoney(owner.amount, currency)}
										</TableCell>
										<TableCell className="px-3 text-right text-neutral-600 tabular-nums">
											{percentageFormatter.format(percentage)}%
										</TableCell>
										<TableCell className="w-20 pr-3" aria-hidden="true">
											<div className="h-2 w-12 overflow-hidden rounded-xs bg-depiqo-blue-50 @4xl/finances:w-16">
												<div
													className="h-full rounded-xs bg-depiqo-blue-400"
													style={{ width: `${Math.min(100, percentage)}%` }}
												/>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
						<TableFooter className="bg-neutral-50/80">
							<TableRow className="hover:bg-transparent">
								<TableCell className="px-3 py-3 font-semibold text-neutral-900">
									Total
								</TableCell>
								<TableCell className="px-3 text-right font-semibold text-neutral-900 tabular-nums">
									{formatExactMoney(totals.thirdPartyAmount, currency)}
								</TableCell>
								<TableCell
									colSpan={2}
									className="px-3 text-right font-semibold text-neutral-900 tabular-nums"
								>
									{getOwnerSharePercentage(
										totals.thirdPartyAmount,
										totals.thirdPartyAmount,
									) === 0
										? "0"
										: "100"}
									%
								</TableCell>
							</TableRow>
						</TableFooter>
					</Table>
				</div>
			)}
		</section>
	);
}
