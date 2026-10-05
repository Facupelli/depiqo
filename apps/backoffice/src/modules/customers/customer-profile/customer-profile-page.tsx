import type { RentalCustomerOnboardingStatusDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { buttonVariants } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { BriefcaseBusiness, FileCheck2, MapPin, UserRound } from "lucide-react";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { useCustomerProfile } from "./customer-profile.queries";
import { CustomerSensitiveProfile } from "./customer-sensitive-profile";

const statusLabels: Record<RentalCustomerOnboardingStatusDto, string> = {
	NOT_STARTED: "Perfil no enviado",
	PENDING: "Pendiente de revisión",
	APPROVED: "Aprobado",
	REJECTED: "Rechazado",
};

const statusVariants = {
	NOT_STARTED: "outline",
	PENDING: "secondary",
	APPROVED: "default",
	REJECTED: "destructive",
} as const;

function Value({ value }: { value: string | null | undefined }) {
	return (
		<span className={value ? "break-words" : "text-muted-foreground"}>
			{value || "No disponible"}
		</span>
	);
}

function Field({
	label,
	value,
}: {
	label: string;
	value: string | null | undefined;
}) {
	return (
		<div className="min-w-0 space-y-1">
			<dt className="text-xs font-medium text-muted-foreground">{label}</dt>
			<dd className="text-sm font-medium text-foreground">
				<Value value={value} />
			</dd>
		</div>
	);
}

function timestamp(value: string | null, timezone: string) {
	return value
		? formatTimestampInTimezone(value, timezone, "DD MMM YYYY, HH:mm")
		: null;
}

export function CustomerProfilePage({
	customerId,
	canReadSensitive,
	canReadDocument,
}: {
	customerId: string;
	canReadSensitive: boolean;
	canReadDocument: boolean;
}) {
	const { data: customer } = useCustomerProfile(customerId);
	const timezone = useTenantTimezone();
	const submitted = customer.submittedProfile;

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<header>
				<PageBreadcrumb
					parent={{ label: "Clientes", to: "/dashboard/customers" }}
					current={customer.primaryName ?? "Cliente"}
				/>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0 space-y-2">
						<h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
							{customer.primaryName ??
								(customer.isCompany
									? "Nombre de empresa no disponible"
									: "Nombre no disponible")}
						</h1>
						{customer.isCompany && (
							<p className="text-sm text-muted-foreground">
								Contacto: <Value value={customer.contactName} />
							</p>
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						<Badge variant={statusVariants[customer.onboardingStatus]}>
							{statusLabels[customer.onboardingStatus]}
						</Badge>
						<Badge variant={customer.isActive ? "outline" : "secondary"}>
							{customer.isActive ? "Cuenta activa" : "Cuenta inactiva"}
						</Badge>
					</div>
				</div>
				{customer.onboardingStatus === "REJECTED" && submitted && (
					<p className="mt-3 text-sm text-muted-foreground">
						Información enviada por el cliente; no aprobada.
					</p>
				)}
			</header>

			<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
				<main className="min-w-0 space-y-5">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<UserRound className="size-4" /> Contacto
							</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="grid gap-5 sm:grid-cols-2">
								<Field label="Email" value={customer.email} />
								<Field label="Teléfono" value={customer.phone} />
								{!customer.isCompany && (
									<Field label="Nombre" value={customer.contactName} />
								)}
							</dl>
						</CardContent>
					</Card>

					{!submitted ? (
						<Card>
							<CardContent className="flex flex-col items-start gap-2 py-8">
								<p className="font-medium">Perfil aún no enviado</p>
								<p className="text-sm text-muted-foreground">
									El cliente todavía no ha enviado sus datos de perfil. La
									información de cuenta sigue disponible.
								</p>
							</CardContent>
						</Card>
					) : (
						<>
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<BriefcaseBusiness className="size-4" /> Información
										adicional
									</CardTitle>
								</CardHeader>
								<CardContent>
									<dl className="grid gap-5 sm:grid-cols-2">
										<Field label="Ocupación" value={submitted.occupation} />
										<Field
											label="Empresa o empleador"
											value={submitted.employer}
										/>
										<Field label="Instagram" value={submitted.instagram} />
										<Field
											label="Conoce a un cliente"
											value={submitted.knowsExistingCustomer ? "Sí" : "No"}
										/>
									</dl>
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<MapPin className="size-4" /> Ubicación
									</CardTitle>
								</CardHeader>
								<CardContent>
									<dl className="grid gap-5 sm:grid-cols-3">
										<Field label="Ciudad" value={submitted.city} />
										<Field label="Región" value={submitted.stateRegion} />
										<Field label="País" value={submitted.country} />
									</dl>
								</CardContent>
							</Card>
						</>
					)}
					{canReadSensitive && (
						<CustomerSensitiveProfile customerId={customerId} />
					)}
				</main>

				<aside className="space-y-5">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Cuenta y revisión</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="space-y-5">
								<Field
									label="Email verificado"
									value={customer.emailVerified ? "Sí" : "No"}
								/>
								<Field
									label="Métodos de acceso"
									value={
										customer.authenticationMethods.length
											? customer.authenticationMethods
													.map((method) =>
														method === "PASSWORD" ? "Contraseña" : "Google",
													)
													.join(" · ")
											: null
									}
								/>
								<Field
									label="Creado"
									value={timestamp(customer.createdAt, timezone)}
								/>
								<Field
									label="Último ingreso"
									value={timestamp(customer.lastLoginAt, timezone)}
								/>
								<Field
									label="Enviado"
									value={timestamp(customer.lastSubmittedAt, timezone)}
								/>
								{submitted?.reviewedAt && (
									<Field
										label="Revisado"
										value={timestamp(submitted.reviewedAt, timezone)}
									/>
								)}
								{submitted?.reviewerLabel && (
									<Field label="Revisor" value={submitted.reviewerLabel} />
								)}
							</dl>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="flex items-start gap-3 text-sm">
							<FileCheck2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
							<div>
								<p className="font-medium">Documento de identidad</p>
								{customer.identityDocumentOnFile ? (
									<>
										<p className="mt-1 text-muted-foreground">
											Documento cargado.
										</p>
										{canReadDocument && (
											<a
												href={`/api/customers/${encodeURIComponent(customerId)}/identity-document`}
												target="_blank"
												rel="noreferrer"
												className={buttonVariants({
													variant: "outline",
													size: "sm",
													className: "mt-3",
												})}
											>
												Ver documento
											</a>
										)}
									</>
								) : (
									<p className="mt-1 text-muted-foreground">
										No se cargó un documento.
									</p>
								)}
							</div>
						</CardContent>
					</Card>
				</aside>
			</div>
		</div>
	);
}

export function CustomerProfilePageSkeleton() {
	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<Skeleton className="h-7 w-48" />
			<Skeleton className="h-10 w-72 max-w-full" />
			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
				<Skeleton className="h-80 w-full" />
				<Skeleton className="h-80 w-full" />
			</div>
		</div>
	);
}
