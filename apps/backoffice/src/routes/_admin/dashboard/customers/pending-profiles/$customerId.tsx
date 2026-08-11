import type {
	GetCustomerProfileDetailResponseDto,
	RentalCustomerOnboardingStatusDto,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button, buttonVariants } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Textarea } from "@repo/ui/components/textarea";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	BriefcaseBusiness,
	CircleCheck,
	FileText,
	MapPin,
	User,
	Users,
	X,
} from "lucide-react";
import { type ElementType, type ReactNode, useState } from "react";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { useApproveSubmittedCustomerOnboarding } from "@/features/tenant-management/customer/approve-submitted-customer-onboarding/approve-submitted-customer-onboarding.mutation";
import {
	getDocumentFileName,
	getDocumentPreviewType,
	getInstagramProfileUrl,
} from "@/features/tenant-management/customer/components/review/customer-profile-review.utils";
import { useRejectSubmittedCustomerOnboarding } from "@/features/tenant-management/customer/reject-submitted-customer-onboarding/reject-submitted-customer-onboarding.mutation";
import {
	rentalCustomerQueries,
	useCustomerProfileDetail,
} from "@/features/tenant-management/customer/rental-customer.queries";
import { cn } from "@/lib/utils";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { ProblemDetailsError } from "@/shared/errors";

export const Route = createFileRoute(
	"/_admin/dashboard/customers/pending-profiles/$customerId",
)({
	loader: ({ context: { queryClient }, params: { customerId } }) =>
		queryClient.ensureQueryData(
			rentalCustomerQueries.profileDetail(customerId),
		),
	pendingComponent: CustomerProfileReviewPageSkeleton,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el expediente del cliente."
			forbiddenMessage="No tienes permisos para revisar este expediente."
		/>
	),
	component: PendingProfileReviewPage,
});

function PendingProfileReviewPage() {
	const { customerId } = Route.useParams();
	const { data: customer, isLoading } = useCustomerProfileDetail(customerId);

	if (isLoading) {
		return <CustomerProfileReviewPageSkeleton />;
	}

	if (!customer) {
		return (
			<div className="space-y-6 px-6 pb-6">
				<PageBreadcrumb
					parent={{
						label: "Altas de cliente",
						to: "/dashboard/customers/pending-profiles",
					}}
					current="Revision"
				/>
				<p className="text-sm text-muted-foreground">
					No encontramos el perfil para revisar.
				</p>
			</div>
		);
	}

	return <CustomerProfileReviewView customer={customer} />;
}

type CustomerProfileReviewViewModel = ReturnType<
	typeof toCustomerProfileReviewViewModel
>;

function toCustomerProfileReviewViewModel(
	customer: GetCustomerProfileDetailResponseDto,
) {
	const profile = customer.profile;

	return {
		customerId: customer.id,
		profileId: profile.id,
		fullName: profile.fullName,
		phone: profile.phone,
		birthDate: profile.birthDate,
		documentNumber: profile.documentNumber,
		identityDocumentPath: profile.identityDocumentPath,
		address: profile.address,
		city: profile.city,
		stateRegion: profile.stateRegion,
		country: profile.country,
		occupation: profile.occupation,
		company: profile.company,
		taxId: profile.taxId,
		businessName: profile.businessName,
		instagram: profile.instagram,
		knowsExistingCustomer: profile.knowsExistingCustomer,
		knownCustomerName: profile.knownCustomerName,
		contact1Name: profile.contact1Name,
		contact1Phone: profile.contact1Phone,
		contact1Relationship: profile.contact1Relationship,
		contact2Name: profile.contact2Name,
		contact2Phone: profile.contact2Phone,
		contact2Relationship: profile.contact2Relationship,
		rejectionReason: profile.rejectionReason,
		reviewedAt: profile.reviewedAt,
		reviewedById: profile.reviewedById,
		submittedAt: profile.createdAt,
		status: customer.onboardingStatus,
	};
}

function CustomerProfileReviewView({
	customer,
}: {
	customer: GetCustomerProfileDetailResponseDto;
}) {
	const profile = toCustomerProfileReviewViewModel(customer);
	const encodedObjectPath = encodeURIComponent(profile.identityDocumentPath);
	const documentUrl = `/api/customer-profiles/${profile.customerId}/identity-document?objectPath=${encodedObjectPath}`;
	const documentPreviewType = getDocumentPreviewType(
		profile.identityDocumentPath,
	);

	const navigate = useNavigate();
	const approveMutation = useApproveSubmittedCustomerOnboarding();
	const rejectMutation = useRejectSubmittedCustomerOnboarding();
	const [auditorNotes, setAuditorNotes] = useState("");
	const [reviewError, setReviewError] = useState<string | null>(null);
	const isSubmitting = approveMutation.isPending || rejectMutation.isPending;

	function handleAuditorNotesChange(value: string) {
		setAuditorNotes(value);
		if (reviewError) {
			setReviewError(null);
		}
	}

	async function handleApprove() {
		setReviewError(null);

		try {
			await approveMutation.mutateAsync({ customerId: profile.customerId });
			navigate({ to: "/dashboard/customers/pending-profiles" });
		} catch (error) {
			setReviewError(getReviewActionErrorMessage(error));
		}
	}

	async function handleReject() {
		const rejectionReason = auditorNotes.trim();

		if (!rejectionReason) {
			setReviewError("Debes ingresar un motivo para rechazar la solicitud.");
			return;
		}

		setReviewError(null);

		try {
			await rejectMutation.mutateAsync({
				customerId: profile.customerId,
				body: { rejectionReason },
			});
			navigate({ to: "/dashboard/customers/pending-profiles" });
		} catch (error) {
			setReviewError(getReviewActionErrorMessage(error));
		}
	}

	return (
		<div className="space-y-6 px-6 pb-6">
			<CustomerProfileReviewHeader profile={profile} />

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
				<div className="space-y-6">
					<ReviewSectionCard icon={User} title="Datos personales">
						<div className="grid gap-6 md:grid-cols-2">
							<ReviewField label="Nombre completo" value={profile.fullName} />
							<ReviewField label="Numero de telefono" value={profile.phone} />
							<ReviewField
								label="Fecha de nacimiento"
								value={formatReviewDate(profile.birthDate)}
							/>
							<ReviewField
								label="Numero de DNI"
								value={profile.documentNumber}
							/>
						</div>
					</ReviewSectionCard>

					<ReviewSectionCard
						icon={FileText}
						title="Documentacion"
						actions={
							<a
								aria-label="Abrir documento enviado"
								href={documentUrl}
								target="_blank"
								rel="noreferrer"
								className={buttonVariants({ variant: "outline", size: "sm" })}
							>
								Abrir documento
							</a>
						}
					>
						<div className="space-y-4 rounded-lg border border-dashed bg-muted/30 p-4">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Archivo enviado
							</p>
							<p className="mt-2 text-sm font-medium text-foreground">
								{getDocumentFileName(profile.identityDocumentPath)}
							</p>
							<div className="overflow-hidden rounded-lg border bg-background">
								{documentPreviewType === "image" ? (
									<img
										alt="Documento de identidad del cliente"
										className="h-96 w-full bg-muted/20 object-contain"
										src={documentUrl}
									/>
								) : documentPreviewType === "pdf" ? (
									<iframe
										title="Documento de identidad del cliente"
										className="h-96 w-full bg-background"
										src={documentUrl}
									/>
								) : (
									<div className="flex h-96 items-center justify-center p-6 text-center text-sm text-muted-foreground">
										No pudimos generar una vista previa para este archivo. Usa
										el boton para abrirlo en una pestana nueva.
									</div>
								)}
							</div>
						</div>
					</ReviewSectionCard>

					<ReviewSectionCard icon={MapPin} title="Direccion">
						<div className="grid gap-6 md:grid-cols-2">
							<div className="md:col-span-2">
								<ReviewField label="Calle y numero" value={profile.address} />
							</div>
							<ReviewField label="Ciudad" value={profile.city} />
							<ReviewField
								label="Provincia o region"
								value={profile.stateRegion}
							/>
							<ReviewField label="Pais" value={profile.country} />
						</div>
					</ReviewSectionCard>

					<ReviewSectionCard
						icon={BriefcaseBusiness}
						title="Informacion profesional y bancaria"
					>
						<div className="grid gap-6 lg:grid-cols-2">
							<div className="space-y-6">
								<ReviewField label="Ocupacion" value={profile.occupation} />
								<ReviewField
									label="Empresa"
									value={getSafeValue(profile.company)}
								/>
								<ReviewField
									label="CUIT o identificacion fiscal"
									value={getSafeValue(profile.taxId)}
								/>
								<ReviewField
									label="Razon social"
									value={getSafeValue(profile.businessName)}
								/>
							</div>
						</div>
					</ReviewSectionCard>

					<ReviewSectionCard
						icon={BriefcaseBusiness}
						title="Redes y referencias"
					>
						<div className="space-y-6">
							<div className="grid gap-6 md:grid-cols-2">
								<ReviewField
									label="Instagram"
									value={getSafeValue(profile.instagram)}
								/>
								<ReviewField
									label="Conoce a un cliente"
									value={profile.knowsExistingCustomer ? "Sí" : "No"}
								/>
								<ReviewField
									label="Cliente conocido"
									value={getSafeValue(profile.knownCustomerName)}
								/>
							</div>

							{profile.instagram ? (
								<a
									href={getInstagramProfileUrl(profile.instagram) ?? undefined}
									target="_blank"
									rel="noreferrer"
									className="text-sm font-medium text-primary underline-offset-4 hover:underline"
								>
									Abrir perfil de Instagram
								</a>
							) : null}
						</div>
					</ReviewSectionCard>

					<ReviewSectionCard icon={Users} title="Contactos de referencia">
						<div className="grid gap-4 md:grid-cols-2">
							<ReferenceContactCard
								name={profile.contact1Name}
								phone={profile.contact1Phone}
								relationship={profile.contact1Relationship}
							/>
							{profile.contact2Name ||
							profile.contact2Phone ||
							profile.contact2Relationship ? (
								<ReferenceContactCard
									name={profile.contact2Name}
									phone={profile.contact2Phone}
									relationship={profile.contact2Relationship}
								/>
							) : null}
						</div>
					</ReviewSectionCard>
				</div>

				<CustomerProfileReviewActionsPanel
					profile={profile}
					auditorNotes={auditorNotes}
					errorMessage={reviewError}
					isSubmitting={isSubmitting}
					onApprove={handleApprove}
					onAuditorNotesChange={handleAuditorNotesChange}
					onReject={handleReject}
				/>
			</div>
		</div>
	);
}

function CustomerProfileReviewHeader({
	profile,
}: {
	profile: CustomerProfileReviewViewModel;
}) {
	return (
		<div className="border-b border-border pb-4">
			<PageBreadcrumb
				parent={{
					label: "Altas de cliente",
					to: "/dashboard/customers/pending-profiles",
				}}
				current={profile.fullName}
			/>

			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-2">
					<h1 className="text-3xl font-semibold tracking-tight text-foreground">
						{profile.fullName}
					</h1>
					<p className="text-sm text-muted-foreground">
						Perfil enviado el {formatReviewDateTime(profile.submittedAt)}
					</p>
				</div>

				<div className="space-y-2 lg:text-right">
					<Badge
						variant="outline"
						className={cn(
							"h-7 rounded-full px-3 text-sm font-medium",
							getReviewStatusClasses(profile.status),
						)}
					>
						{getReviewStatusLabel(profile.status)}
					</Badge>
				</div>
			</div>
		</div>
	);
}

function ReviewSectionCard({
	icon: Icon,
	title,
	actions,
	children,
}: {
	icon: ElementType;
	title: string;
	actions?: ReactNode;
	children: ReactNode;
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-4 border-b pb-4">
				<div className="flex items-center gap-3">
					<div className="rounded-md bg-muted p-2 text-muted-foreground">
						<Icon className="h-4 w-4" />
					</div>
					<CardTitle className="text-base font-semibold">{title}</CardTitle>
				</div>
				{actions}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

function ReviewField({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1.5">
			<p className="text-xs font-medium uppercase text-muted-foreground">
				{label}
			</p>
			<p className="text-sm font-medium text-foreground">{value}</p>
		</div>
	);
}

function ReferenceContactCard({
	name,
	phone,
	relationship,
}: {
	name: string;
	phone: string;
	relationship: string;
}) {
	return (
		<div className="rounded-lg border bg-muted/20 p-2">
			<p className="text-sm font-semibold text-foreground">
				{getSafeValue(name)}
			</p>
			<p className="mt-1 text-sm text-muted-foreground">
				{getSafeValue(phone)}
			</p>
			<p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
				{getSafeValue(relationship)}
			</p>
		</div>
	);
}

function CustomerProfileReviewActionsPanel({
	profile,
	auditorNotes,
	errorMessage,
	isSubmitting,
	onApprove,
	onAuditorNotesChange,
	onReject,
}: {
	profile: CustomerProfileReviewViewModel;
	auditorNotes: string;
	errorMessage: string | null;
	isSubmitting: boolean;
	onApprove: () => void;
	onAuditorNotesChange: (value: string) => void;
	onReject: () => void;
}) {
	return (
		<div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						Acciones de revision
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-3">
						<Button
							type="button"
							className="w-full"
							size="lg"
							onClick={onApprove}
							disabled={isSubmitting}
						>
							<CircleCheck className="h-4 w-4" />
							{isSubmitting ? "Procesando..." : "Aprobar alta"}
						</Button>
						<Button
							type="button"
							variant="outline"
							className="w-full"
							size="lg"
							onClick={onReject}
							disabled={isSubmitting}
						>
							<X className="h-4 w-4" />
							{isSubmitting ? "Procesando..." : "Rechazar"}
						</Button>
					</div>

					<div className="space-y-2">
						<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
							Notas del auditor
						</p>
						<Textarea
							value={auditorNotes}
							onChange={(event) => onAuditorNotesChange(event.target.value)}
							placeholder="Escriba aqui sus observaciones internas sobre la verificacion del expediente..."
							className="min-h-24 resize-none"
						/>
						<p className="text-xs text-muted-foreground">
							Estas notas son solo visibles para el equipo de auditoria.
						</p>
						{errorMessage ? (
							<p className="text-sm font-medium text-destructive">
								{errorMessage}
							</p>
						) : null}
					</div>

					<div className="space-y-4 rounded-lg border bg-muted/20 p-4">
						<ReviewField
							label="Estado"
							value={getReviewStatusLabel(profile.status)}
						/>
						<ReviewField
							label="Fecha de envio"
							value={formatReviewDateTime(profile.submittedAt)}
						/>
						<ReviewField
							label="Revisado el"
							value={formatReviewDateTime(profile.reviewedAt)}
						/>
						<ReviewField
							label="Revisado por"
							value={getSafeValue(profile.reviewedById)}
						/>
						<ReviewField
							label="Motivo de rechazo"
							value={getSafeValue(profile.rejectionReason)}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "medium",
	timeStyle: "short",
});

function formatReviewDate(value: string | null) {
	if (!value) {
		return "-";
	}

	const [year, month, day] = value.split("-");
	return `${day}/${month}/${year}`;
}

function formatReviewDateTime(value: string | null) {
	if (!value) {
		return "-";
	}

	return dateTimeFormatter.format(new Date(value));
}

function getReviewStatusLabel(status: RentalCustomerOnboardingStatusDto) {
	const labels: Record<RentalCustomerOnboardingStatusDto, string> = {
		NOT_STARTED: "No iniciado",
		PENDING: "Pendiente de validacion",
		APPROVED: "Aprobado",
		REJECTED: "Rechazado",
	};

	return labels[status];
}

function getReviewStatusClasses(status: RentalCustomerOnboardingStatusDto) {
	const classes: Record<RentalCustomerOnboardingStatusDto, string> = {
		NOT_STARTED: "border-slate-200 bg-slate-50 text-slate-700",
		PENDING: "border-amber-200 bg-amber-50 text-amber-700",
		APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
		REJECTED: "border-red-200 bg-red-50 text-red-700",
	};

	return classes[status];
}

function getSafeValue(value: string | null) {
	return value?.trim() ? value : "-";
}

function getReviewActionErrorMessage(error: unknown) {
	if (error instanceof ProblemDetailsError) {
		return error.problemDetails.detail || error.problemDetails.title;
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return "No pudimos procesar la revision del expediente.";
}

export function CustomerProfileReviewPageSkeleton() {
	return (
		<div className="space-y-6 px-6 pb-6">
			<div className="space-y-4 border-b border-border pb-6">
				<Skeleton className="h-5 w-60" />
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="space-y-2">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-10 w-72" />
						<Skeleton className="h-4 w-52" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-7 w-48 rounded-full" />
					</div>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
				<div className="space-y-6">
					{["personal", "document", "address", "work", "references"].map(
						(sectionId) => (
							<Skeleton key={sectionId} className="h-56 w-full rounded-xl" />
						),
					)}
				</div>
				<Skeleton className="h-130 w-full rounded-xl" />
			</div>
		</div>
	);
}
