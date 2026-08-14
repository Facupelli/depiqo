import type { GetBranchesBranchDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Pencil } from "lucide-react";

interface BranchesTableProps {
	branches: GetBranchesBranchDto[];
	onEditBranch: (branchId: string) => void;
}

export function BranchesTable({ branches, onEditBranch }: BranchesTableProps) {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Dirección</TableHead>
						<TableHead>Zona horaria</TableHead>
						<TableHead>Delivery</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead className="text-right">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{branches.length > 0 ? (
						branches.map((branch) => (
							<TableRow key={branch.id}>
								<TableCell className="font-medium">{branch.name}</TableCell>
								<TableCell className="text-muted-foreground">
									{branch.address || "Sin dirección"}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{branch.timezone || "Sin zona horaria"}
								</TableCell>
								<TableCell>
									{branch.supportsDelivery ? "Disponible" : "No disponible"}
								</TableCell>
								<TableCell>
									<BranchStatusBadge isActive={branch.isActive} />
								</TableCell>
								<TableCell className="text-right">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => onEditBranch(branch.id)}
									>
										<Pencil className="mr-2 h-4 w-4" />
										Editar
									</Button>
								</TableCell>
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={6}
								className="h-24 text-center text-muted-foreground"
							>
								No se encontraron sucursales.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

function BranchStatusBadge({ isActive }: { isActive: boolean }) {
	return isActive ? (
		<Badge variant="outline" className="border-foreground text-foreground">
			Activa
		</Badge>
	) : (
		<Badge
			variant="outline"
			className="border-muted-foreground text-muted-foreground"
		>
			Inactiva
		</Badge>
	);
}
