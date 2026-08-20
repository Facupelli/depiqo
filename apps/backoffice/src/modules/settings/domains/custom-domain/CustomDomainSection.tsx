import type {
	GetCustomDomainResponseDto,
	RegisterCustomDomainResponseDto,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProblemDetailsError } from "@/shared/errors";
import { useCustomDomain } from "./custom-domain.queries";
import {
	type CustomDomainFormValues,
	createCustomDomainFormDefaultValues,
	customDomainFormSchema,
	toRegisterCustomDomainDto,
} from "./custom-domain.schema";
import { useRefreshCustomDomainStatus } from "./refresh-custom-domain-status.mutation";
import { useRegisterCustomDomain } from "./register-custom-domain.mutation";

export function CustomDomainSection() {
	const [registrationResult, setRegistrationResult] =
		useState<RegisterCustomDomainResponseDto | null>(null);
	const [refreshError, setRefreshError] = useState<string | null>(null);
	const [registrationError, setRegistrationError] = useState<string | null>(
		null,
	);
	const customDomainQuery = useCustomDomain();
	const { mutateAsync: refreshStatus, isPending: isRefreshing } =
		useRefreshCustomDomainStatus();
	const { mutateAsync: registerDomain, isPending: isRegistering } =
		useRegisterCustomDomain();

	const customDomain = customDomainQuery.data;
	const cnameTarget = registrationResult?.cnameTarget ?? null;

	async function handleRefresh() {
		setRefreshError(null);

		try {
			await refreshStatus();
		} catch (error) {
			setRefreshError(getProblemDetail(error));
		}
	}

	async function handleRegisterDomain(values: CustomDomainFormValues) {
		setRegistrationError(null);

		try {
			const result = await registerDomain({
				body: toRegisterCustomDomainDto(values),
			});

			setRegistrationResult(result);
		} catch (error) {
			setRegistrationError(getProblemDetail(error));
		}
	}

	return (
		<section className="space-y-4">
			{customDomainQuery.isLoading ? (
				<p className="text-sm text-muted-foreground">Cargando dominio...</p>
			) : customDomainQuery.isError ? (
				<p className="text-sm text-destructive">
					{getProblemDetail(customDomainQuery.error)}
				</p>
			) : customDomain ? (
				<>
					<CustomDomainDetails
						customDomain={customDomain}
						cnameTarget={cnameTarget}
					/>

					{refreshError ? <FieldError>{refreshError}</FieldError> : null}

					<div className="flex justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={handleRefresh}
							disabled={isRefreshing}
						>
							<RefreshCw
								className={cn("size-4", isRefreshing && "animate-spin")}
							/>
							{isRefreshing ? "Comprobando..." : "Comprobar estado"}
						</Button>
					</div>
				</>
			) : (
				<CustomDomainRegistrationForm
					onSubmit={handleRegisterDomain}
					isPending={isRegistering}
					submitError={registrationError}
				/>
			)}
		</section>
	);
}

const STATUS_COPY: Record<
	"PENDING" | "VERIFIED" | "DISABLED",
	{ label: string; description: string; badgeClassName: string }
> = {
	PENDING: {
		label: "Pendiente",
		description:
			"Configura el registro DNS indicado y vuelve a comprobar el estado.",
		badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
	},
	DISABLED: {
		label: "Deshabilitado",
		description:
			"No pudimos verificar el dominio. Revisa la configuración DNS e inténtalo de nuevo.",
		badgeClassName: "border-destructive/30 bg-destructive/10 text-destructive",
	},
	VERIFIED: {
		label: "Verificado",
		description: "Tu dominio está listo para usarse en la tienda online.",
		badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
	},
};

function CustomDomainDetails({
	customDomain,
	cnameTarget,
}: {
	customDomain: NonNullable<GetCustomDomainResponseDto>;
	cnameTarget: string | null;
}) {
	const statusConfig = STATUS_COPY[customDomain.status];

	return (
		<div className="rounded-xl border border-border bg-card">
			<div className="border-b border-border px-5 py-4">
				<div className="flex flex-wrap items-center gap-3">
					<p className="text-sm font-semibold text-foreground">
						{customDomain.domain}
					</p>
					<CustomDomainStatusBadge status={customDomain.status} />
				</div>
				<p className="mt-2 text-sm text-muted-foreground">
					{statusConfig.description}
				</p>
			</div>

			<div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
				<div className="space-y-1">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Verificado el
					</p>
					<p className="text-sm text-foreground">
						{formatVerifiedAt(customDomain.verifiedAt)}
					</p>
				</div>

				<div className="space-y-1">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Problema de verificación
					</p>
					<p className="text-sm text-foreground">
						{customDomain.failureReason ?? "No hay problemas informados"}
					</p>
				</div>

				{cnameTarget ? (
					<div className="space-y-1 sm:col-span-2">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Destino CNAME
						</p>
						<p className="rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground">
							{cnameTarget}
						</p>
						<p className="text-xs text-muted-foreground">
							Point your subdomain CNAME to this target, then run a manual
							refresh.
						</p>
					</div>
				) : null}
			</div>
		</div>
	);
}

function CustomDomainRegistrationForm({
	onSubmit,
	isPending,
	submitError,
}: {
	onSubmit: (values: CustomDomainFormValues) => Promise<void>;
	isPending: boolean;
	submitError: string | null;
}) {
	const form = useForm({
		defaultValues: createCustomDomainFormDefaultValues(),
		validators: {
			onSubmit: customDomainFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4 rounded-xl border border-border bg-card px-5 py-4"
		>
			<form.Field name="domain">
				{(field) => {
					const isInvalid =
						field.state.meta.isTouched && !field.state.meta.isValid;

					return (
						<Field data-invalid={isInvalid}>
							<FieldLabel htmlFor={field.name}>
								Dominio personalizado
							</FieldLabel>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) =>
									field.handleChange(event.target.value.toLowerCase())
								}
								placeholder="www.tunegocio.com"
								aria-invalid={isInvalid}
								disabled={isPending}
							/>

							{isInvalid ? (
								<FieldError errors={field.state.meta.errors} />
							) : null}
						</Field>
					);
				}}
			</form.Field>

			{submitError ? <FieldError>{submitError}</FieldError> : null}

			<div className="flex justify-end">
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isSubmitting]) => (
						<Button type="submit" disabled={!canSubmit || isPending}>
							{isSubmitting || isPending ? "Guardando..." : "Guardar dominio"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

function getProblemDetail(error: unknown): string {
	if (error instanceof ProblemDetailsError) {
		return error.problemDetails.detail ?? error.problemDetails.title;
	}

	return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}

function formatVerifiedAt(value: string | null): string {
	if (!value) {
		return "Aún no verificado";
	}

	return format(new Date(value), "PPP p");
}

function CustomDomainStatusBadge({
	status,
}: {
	status: "PENDING" | "VERIFIED" | "DISABLED";
}) {
	const config = STATUS_COPY[status];

	return (
		<Badge
			variant="outline"
			className={cn("capitalize", config.badgeClassName)}
		>
			{config.label}
		</Badge>
	);
}
