import type {
	GetAssetsResponseDto,
	GetOwnerDetailResponseDto,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	AlertTriangle,
	CalendarRange,
	Mail,
	Phone,
	StickyNote,
} from "lucide-react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { useAssets } from "@/modules/inventory/assets/public";
import { useOwnerDetail } from "./owner-detail.queries";

interface OwnerDetailPageProps {
	ownerId: string;
}

export function OwnerDetailPage({ ownerId }: OwnerDetailPageProps) {
	return (
		<ErrorBoundary FallbackComponent={OwnerDetailError}>
			<OwnerDetailContent ownerId={ownerId} />
		</ErrorBoundary>
	);
}

function OwnerDetailContent({ ownerId }: OwnerDetailPageProps) {
	const { data: owner, isPending, isError, error } = useOwnerDetail(ownerId);

	if (isPending) {
		return <OwnerDetailSkeleton />;
	}

	if (isError) {
		throw error;
	}

	const activeContract = owner.contracts.find(isActiveContract) ?? null;

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

				{/* Equipment units */}
				<OwnerAssetsSection ownerId={ownerId} />
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
				<div className="flex items-center gap-4">
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

function OwnerAssetsSection({ ownerId }: OwnerDetailPageProps) {
	const assetsQuery = useAssets({ ownerId });
	const assets = assetsQuery.data;

	return (
		<div className="mt-6 rounded-lg border border-neutral-200 bg-white">
			<div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
				<h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
					Equipos
				</h2>
				{assets ? (
					<span className="font-mono text-xs text-neutral-400">
						{assets.length} {assets.length === 1 ? "equipo" : "equipos"}
					</span>
				) : null}
			</div>
			{assetsQuery.isPending ? (
				<div className="flex items-center justify-center py-12 text-sm text-neutral-400">
					Cargando equipos...
				</div>
			) : assetsQuery.isError && !assets ? (
				<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
					<p className="text-sm text-neutral-500">
						No pudimos cargar los equipos de este propietario.
					</p>
					<Button
						variant="outline"
						size="sm"
						onClick={() => assetsQuery.refetch()}
					>
						Reintentar
					</Button>
				</div>
			) : assets ? (
				<AssetList assets={assets} />
			) : null}
		</div>
	);
}

function AssetList({ assets }: { assets: GetAssetsResponseDto }) {
	if (assets.length === 0) {
		return (
			<div className="flex items-center justify-center py-12 text-sm text-neutral-400">
				Sin equipos.
			</div>
		);
	}

	return (
		<div className="divide-y divide-neutral-100 px-6">
			{assets.map((asset) => (
				<div
					key={asset.id}
					className="grid gap-4 py-4 md:grid-cols-[1fr_auto_auto] md:items-center"
				>
					<div>
						<p className="text-sm font-medium text-neutral-800">
							{asset.serialNumber ?? "-"}
						</p>
						<p className="mt-1 text-xs text-neutral-500">
							{asset.equipmentTypeName}
						</p>
					</div>
					<div className="text-sm text-neutral-600">
						{asset.branchName ?? "-"}
					</div>
					<AssetStatusBadge status={asset.status} />
				</div>
			))}
		</div>
	);
}

function AssetStatusBadge({
	status,
}: {
	status: GetAssetsResponseDto[number]["status"];
}) {
	if (status === "ACTIVE") {
		return <Badge className="bg-emerald-600 text-white">Activo</Badge>;
	}

	if (status === "INACTIVE") {
		return <Badge variant="secondary">Inactivo</Badge>;
	}

	return <Badge variant="outline">Retirado</Badge>;
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
