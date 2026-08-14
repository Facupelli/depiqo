import type { GetRentalCustomersItemDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRentalCustomers } from "@/features/tenant-management/customer/rental-customer.queries";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";

export const Route = createFileRoute(
	"/_admin/dashboard/customers/pending-profiles/",
)({
	pendingComponent: PendingProfilesTableSkeleton,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar las altas de cliente."
			forbiddenMessage="No tienes permisos para revisar las altas de cliente."
		/>
	),
	component: PendingProfilesPage,
});

function PendingProfilesPage() {
	const navigate = useNavigate();
	const timezone = useTenantTimezone();

	const { data: pendingProfiles, isLoading } = useRentalCustomers({
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

function PendingProfilesTableSkeleton() {
	const skeletonRows = ["1", "2", "3", "4", "5"];

	return (
		<div className="space-y-6 p-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-56" />
				<Skeleton className="h-4 w-96" />
			</div>

			<div className="rounded-md border bg-background">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nombre</TableHead>
							<TableHead>Fecha</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead className="text-right">Accion</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{skeletonRows.map((rowId) => (
							<TableRow key={rowId}>
								<TableCell>
									<Skeleton className="h-4 w-40" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-32" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-20 rounded-full" />
								</TableCell>
								<TableCell className="text-right">
									<div className="flex justify-end">
										<Skeleton className="h-8 w-28" />
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
