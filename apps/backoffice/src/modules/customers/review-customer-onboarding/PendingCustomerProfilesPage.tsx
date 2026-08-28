import type { GetRentalCustomersItemDto } from "@repo/api-contracts";
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
import { useNavigate } from "@tanstack/react-router";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { useCustomers } from "../list-customers/list-customers.queries";

export function PendingCustomerProfilesPage() {
	const navigate = useNavigate();
	const timezone = useTenantTimezone();

	const { data: pendingProfiles, isLoading } = useCustomers({
		page: 1,
		pageSize: 100,
		status: "PENDING",
	});

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Altas de cliente
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Revisa los perfiles enviados por clientes pendientes de aprobacion.
				</p>
			</div>

			<div className="rounded-md border bg-background">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nombre</TableHead>
							<TableHead>Fecha</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead className="text-right">Acción</TableHead>
						</TableRow>
					</TableHeader>

					{isLoading || !pendingProfiles ? (
						<TableBody>
							<TableRow>
								<TableCell
									colSpan={4}
									className="h-32 text-center text-muted-foreground"
								>
									Cargando...
								</TableCell>
							</TableRow>
						</TableBody>
					) : (
						<TableBody>
							{pendingProfiles.data.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={4}
										className="h-32 text-center text-muted-foreground"
									>
										No hay altas de cliente pendientes.
									</TableCell>
								</TableRow>
							) : (
								pendingProfiles.data.map((profile) => (
									<PendingProfileRow
										key={profile.id}
										profile={profile}
										timezone={timezone}
										onOpen={() =>
											navigate({
												to: "/dashboard/customers/pending-profiles/$customerId",
												params: { customerId: profile.id },
											})
										}
									/>
								))
							)}
						</TableBody>
					)}
				</Table>
			</div>
		</div>
	);
}

function PendingProfileRow({
	profile,
	timezone,
	onOpen,
}: {
	profile: GetRentalCustomersItemDto;
	timezone: string;
	onOpen: () => void;
}) {
	return (
		<TableRow>
			<TableCell className="font-medium">
				{profile.firstName} {profile.lastName}
			</TableCell>
			<TableCell>
				{formatTimestampInTimezone(
					profile.createdAt,
					timezone,
					"DD MMM, YYYY · HH:mm",
				)}
			</TableCell>
			<TableCell>
				<Badge
					variant="outline"
					className="border-amber-200 bg-amber-50 text-amber-700"
				>
					{profile.status}
				</Badge>
			</TableCell>
			<TableCell className="text-right">
				<Button type="button" variant="outline" size="sm" onClick={onOpen}>
					Ver solicitud
				</Button>
			</TableCell>
		</TableRow>
	);
}
