import type { GetOwnerDetailResponseDto } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangle,
	CalendarRange,
	Mail,
	Phone,
	StickyNote,
} from "lucide-react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	ownerQueries,
	useOwnerDetail,
} from "@/features/asset-inventory/owners/owners.queries";

export const Route = createFileRoute("/_admin/dashboard/owners/$ownerId")({
	loader: ({ context: { queryClient }, params: { ownerId } }) =>
		queryClient.ensureQueryData(ownerQueries.detail(ownerId)),

	component: RouteComponent,
});

function RouteComponent() {
	return (
		<ErrorBoundary FallbackComponent={OwnerDetailError}>
			<OwnerDetailPage />
		</ErrorBoundary>
	);
}

function OwnerDetailPage() {
	const { ownerId } = Route.useParams();
	const { data: owner, isPending, isError, error } = useOwnerDetail(ownerId);

	if (isPending) {
		return <OwnerDetailSkeleton />;
	}

	if (isError) {
		throw error;
	}

	const activeContract = owner.contracts.find(isActiveContract) ?? null;
	const pastContracts = owner.contracts
		.filter((contract) => contract.id !== activeContract?.id)
		.sort(
			(a, b) =>
				new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime(),
		);

	return (
		<div className="min-h-screen bg-neutral-50">
			<div className="mx-auto max-w-6xl px-8">
				<PageBreadcrumb
					parent={{ label: "Propietarios", to: "/dashboard/owners" }}
					current={owner.name}
				/>

				{/* Page header */}
				<div className="mb-8 flex items-start justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-neutral-900">
							Detalle del Propietario
						</h1>
						<p className="mt-1 text-sm text-neutral-500">
							Información contractual y datos de contacto
						</p>
					</div>
				</div>

				{/* Top grid: owner card + active contract */}
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
					<OwnerCard owner={owner} isActive={Boolean(activeContract)} />
					<ActiveContractCard contract={activeContract} />
				</div>

				{/* Contract history */}
				<div className="mt-6 rounded-lg border border-neutral-200 bg-white">
					<div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
						<h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
							Otros Contratos
						</h2>
						<span className="font-mono text-xs text-neutral-400">
							{pastContracts.length}{" "}
							{pastContracts.length === 1 ? "registro" : "registros"}
						</span>
					</div>
					<ContractList contracts={pastContracts} />
				</div>
			</div>
		</div>
	);
}

interface OwnerCardProps {
	owner: GetOwnerDetailResponseDto;
	isActive: boolean;
}

function OwnerCard({ owner, isActive }: OwnerCardProps) {
	const initials = owner.name
		.split(" ")
		.map((n) => n[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	return (
		<Card className="border-neutral-200 bg-white shadow-none">
			<CardContent>
				<div className="flex items-start gap-4">
					{/* Avatar */}
					<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-900 font-mono text-lg font-semibold tracking-tight text-white">
						{initials}
					</div>

					{/* Name + status */}
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h2 className="text-xl font-semibold text-neutral-900 leading-tight">
								{owner.name}
							</h2>
							{!isActive && (
								<Badge variant="secondary" className="text-xs">
									Sin contrato activo
								</Badge>
							)}
						</div>
						<p className="mt-0.5 font-mono text-xs text-neutral-400 tracking-wider uppercase">
							{owner.id.slice(0, 8).toUpperCase()}
						</p>
					</div>
				</div>

				{/* Contact fields */}
				<dl className="mt-6 space-y-3">
					<div className="flex items-center gap-3">
						<Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
						<dt className="w-20 shrink-0 text-xs font-medium uppercase tracking-wider text-neutral-400">
							Email
						</dt>
						<dd className="text-sm text-neutral-700 truncate">
							{owner.email ?? "-"}
						</dd>
					</div>
					<div className="flex items-center gap-3">
						<Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
						<dt className="w-20 shrink-0 text-xs font-medium uppercase tracking-wider text-neutral-400">
							Teléfono
						</dt>
						<dd className="text-sm text-neutral-700">{owner.phone ?? "-"}</dd>
					</div>
					<div className="flex items-start gap-3">
						<StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
						<dt className="w-20 shrink-0 text-xs font-medium uppercase tracking-wider text-neutral-400">
							Notas
						</dt>
						<dd className="text-sm text-neutral-600 leading-relaxed">
							{owner.notes ?? "-"}
						</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	);
}

type OwnerContract = GetOwnerDetailResponseDto["contracts"][number];

interface ActiveContractCardProps {
	contract: OwnerContract | null;
}

function isActiveContract(contract: OwnerContract): boolean {
	const now = new Date();
	const validFrom = new Date(contract.validFrom);
	const validTo = contract.validTo ? new Date(contract.validTo) : null;

	return validFrom <= now && (!validTo || validTo >= now);
}

function formatDate(date: string): string {
	return new Date(date).toLocaleDateString("es-ES", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatShare(share: string): number {
	return Math.round(Number(share) * 100);
}

function ActiveContractCard({ contract }: ActiveContractCardProps) {
	if (!contract) {
		return (
			<Card className="border-dashed border-neutral-200 bg-neutral-50 shadow-none">
				<CardContent className="flex h-full min-h-35 items-center justify-center">
					<p className="text-sm text-neutral-400">Sin contrato activo</p>
				</CardContent>
			</Card>
		);
	}

	const ownerPct = formatShare(contract.ownerShare);
	const rentalPct = formatShare(contract.rentalShare);

	return (
		<Card className="border-neutral-900 bg-neutral-900 text-white shadow-none">
			<CardHeader className="flex flex-row items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
					Contrato Activo
				</span>
				<Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15">
					En vigor
				</Badge>
			</CardHeader>

			<CardContent>
				<div className="grid grid-cols-3 gap-6">
					{/* Split */}
					<div>
						<p className="text-xs uppercase tracking-wider text-neutral-500">
							Reparto
						</p>
						<p className="mt-1.5 font-mono text-4xl font-bold tracking-tight text-white">
							{ownerPct}
							<span className="text-neutral-500">/</span>
							{rentalPct}
						</p>
						<p className="mt-0.5 text-xs text-neutral-500">
							Propietario / Gestión
						</p>
					</div>

					{/* Basis */}
					<div>
						<p className="text-xs uppercase tracking-wider text-neutral-500">
							Base
						</p>
						<p className="mt-1.5 font-mono text-sm font-semibold text-neutral-200">
							{contract.basis}
						</p>
					</div>

					{/* Dates */}
					<div>
						<p className="text-xs uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
							<CalendarRange className="h-3 w-3" />
							Vigencia
						</p>
						<p className="mt-1.5 text-sm text-neutral-200">
							{formatDate(contract.validFrom)}
						</p>
						<p className="text-xs text-neutral-500">
							{contract.validTo
								? `hasta ${formatDate(contract.validTo)}`
								: "Indefinido"}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function ContractList({ contracts }: { contracts: OwnerContract[] }) {
	if (contracts.length === 0) {
		return (
			<div className="flex items-center justify-center py-12 text-sm text-neutral-400">
				Sin contratos adicionales.
			</div>
		);
	}

	return (
		<div className="divide-y divide-neutral-100 px-6">
			{contracts.map((contract) => {
				const ownerPct = formatShare(contract.ownerShare);
				const rentalPct = formatShare(contract.rentalShare);

				return (
					<div
						key={contract.id}
						className="grid gap-4 py-4 md:grid-cols-[1fr_auto_auto] md:items-center"
					>
						<div>
							<p className="font-mono text-xs text-neutral-400">
								{contract.id.slice(0, 8).toUpperCase()}
							</p>
							<p className="mt-1 text-sm text-neutral-600">
								{formatDate(contract.validFrom)} —{" "}
								{contract.validTo ? formatDate(contract.validTo) : "Indefinido"}
							</p>
						</div>
						<div className="font-mono text-sm font-medium text-neutral-800">
							{ownerPct}/{rentalPct}
						</div>
						<Badge variant="outline" className="w-fit text-xs font-medium">
							{contract.basis}
						</Badge>
					</div>
				);
			})}
		</div>
	);
}

function OwnerDetailSkeleton() {
	return (
		<div className="min-h-screen bg-neutral-50">
			<div className="mx-auto max-w-6xl px-6 py-10">
				{/* Breadcrumb */}
				<Skeleton className="mb-6 h-3 w-40" />

				{/* Header */}
				<div className="mb-8 flex items-start justify-between">
					<div className="space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-48" />
					</div>
				</div>

				{/* Top grid */}
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
					<Skeleton className="h-52 rounded-lg" />
					<Skeleton className="h-52 rounded-lg" />
				</div>

				{/* History list */}
				<Skeleton className="mt-6 h-64 rounded-lg" />
			</div>
		</div>
	);
}

function OwnerDetailError({ error, resetErrorBoundary }: FallbackProps) {
	const message = error instanceof Error ? error.message : "Error desconocido.";

	return (
		<div className="min-h-screen bg-neutral-50">
			<div className="mx-auto max-w-6xl px-6 py-10">
				<div className="flex flex-col items-center justify-center rounded-lg border border-rose-100 bg-white py-20 text-center">
					<AlertTriangle className="mb-4 h-8 w-8 text-rose-400" />
					<h2 className="text-base font-semibold text-neutral-800">
						No se pudo cargar el propietario
					</h2>
					<p className="mt-1 text-sm text-neutral-500">{message}</p>
					<Button
						variant="outline"
						size="sm"
						className="mt-6"
						onClick={resetErrorBoundary}
					>
						Reintentar
					</Button>
				</div>
			</div>
		</div>
	);
}
