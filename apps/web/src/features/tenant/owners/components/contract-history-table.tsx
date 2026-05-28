import type { GetOwnerResponseDto } from "@repo/schemas";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type OwnerContract = GetOwnerResponseDto["contracts"][number];

interface ContractHistoryTableProps {
	contracts: OwnerContract[];
}

function formatDate(date: Date | string): string {
	return new Date(date).toLocaleDateString("es-ES", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function contractStatus(contract: OwnerContract): {
	label: string;
	className: string;
} {
	if (contract.isActive) {
		return {
			label: "Activo",
			className: "bg-emerald-50 text-emerald-700 border-emerald-200",
		};
	}

	const now = new Date();
	const until = contract.validUntil ? new Date(contract.validUntil) : null;

	if (until && until < now) {
		return {
			label: "Finalizado",
			className: "bg-slate-100 text-slate-500 border-slate-200",
		};
	}

	return {
		label: "Inactivo",
		className: "bg-rose-50 text-rose-600 border-rose-200",
	};
}

export function ContractHistoryTable({ contracts }: ContractHistoryTableProps) {
	if (contracts.length === 0) {
		return (
			<div className="flex items-center justify-center py-12 text-sm text-slate-400">
				Sin historial de contratos anteriores.
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow className="border-slate-100 hover:bg-transparent">
					<TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
						Referencia
					</TableHead>
					<TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
						Reparto
					</TableHead>
					<TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
						Base
					</TableHead>
					<TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
						Válido desde
					</TableHead>
					<TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
						Válido hasta
					</TableHead>
					<TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
						Estado
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{contracts.map((contract) => {
					const status = contractStatus(contract);
					const ownerPct = Math.round(contract.ownerShare * 100);
					const rentalPct = Math.round(contract.rentalShare * 100);

					return (
						<TableRow
							key={contract.id}
							className="border-slate-100 hover:bg-slate-50/60"
						>
							<TableCell className="font-mono text-xs text-slate-500">
								{contract.id.slice(0, 8).toUpperCase()}
							</TableCell>
							<TableCell className="font-mono text-sm font-medium text-slate-800">
								{ownerPct}/{rentalPct}
							</TableCell>
							<TableCell className="font-mono text-xs text-slate-500">
								{contract.basis}
							</TableCell>
							<TableCell className="text-sm text-slate-600">
								{formatDate(contract.validFrom)}
							</TableCell>
							<TableCell className="text-sm text-slate-600">
								{contract.validUntil ? formatDate(contract.validUntil) : "—"}
							</TableCell>
							<TableCell>
								<Badge
									variant="outline"
									className={`text-xs font-medium ${status.className}`}
								>
									{status.label}
								</Badge>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
