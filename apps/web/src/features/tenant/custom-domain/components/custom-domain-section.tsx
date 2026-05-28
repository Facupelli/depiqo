import type {
	GetCustomDomainResponseDto,
	RegisterCustomDomainResponseDto,
} from "@repo/api-contracts";
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { Globe, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ProblemDetailsError } from "@/shared/errors";
import { useRefreshCustomDomainStatus } from "@/v2/features/tenant-management/tenant/custom-domain/refresh-custom-domain-status.mutation";
import { useRegisterCustomDomain } from "@/v2/features/tenant-management/tenant/custom-domain/register-custom-domain.mutation";
import { useCustomDomain } from "@/v2/features/tenant-management/tenant/tenant.queries";
import {
	type CustomDomainFormValues,
	createCustomDomainFormDefaultValues,
	customDomainFormSchema,
	toRegisterCustomDomainDto,
} from "../schemas/custom-domain-form.schema";

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
			<div>
				<h2 className="text-xl font-bold">Custom Domain</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Register one branded subdomain for your portal. Runtime routing is
					enabled only after a manual refresh confirms the hostname is active.
				</p>
			</div>

			<div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-5 py-4">
				<div className="flex items-start gap-3">
					<div className="flex size-9 items-center justify-center rounded-lg bg-background text-muted-foreground">
						<Globe className="size-4" />
					</div>
					<div className="space-y-1 text-sm text-muted-foreground">
						<p className="font-medium text-foreground">Phase 1 behavior</p>
						<p>
							Once a domain is registered, this UI becomes read-only. Use the
							refresh action to re-check Cloudflare and promote the domain to
							live routing only when it becomes active.
						</p>
					</div>
				</div>
			</div>

			{customDomainQuery.isLoading ? (
				<p className="text-sm text-muted-foreground">
					Loading custom domain...
				</p>
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
							{isRefreshing ? "Refreshing..." : "Refresh status"}
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
			"Provisioning started. Add the DNS record, then refresh the status.",
		badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
	},
	DISABLED: {
		label: "Deshabilitado",
		description:
			"Provisioning failed. Review the latest error and fix DNS before refreshing.",
		badgeClassName: "border-destructive/30 bg-destructive/10 text-destructive",
	},
	VERIFIED: {
		label: "Verificado",
		description:
			"The domain is verified and can now be used for runtime routing.",
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
						Verified at
					</p>
					<p className="text-sm text-foreground">
						{formatVerifiedAt(customDomain.verifiedAt)}
					</p>
				</div>

				<div className="space-y-1">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Last provider error
					</p>
					<p className="text-sm text-foreground">
						{customDomain.failureReason ?? "No provider errors reported"}
					</p>
				</div>

				{cnameTarget ? (
					<div className="space-y-1 sm:col-span-2">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							CNAME target
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
							<FieldLabel htmlFor={field.name}>Custom subdomain</FieldLabel>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) =>
									field.handleChange(event.target.value.toLowerCase())
								}
								placeholder="www.yourbrand.com"
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
							{isSubmitting || isPending ? "Registering..." : "Register domain"}
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

	return error instanceof Error
		? error.message
		: "An unexpected error occurred";
}

function formatVerifiedAt(value: string | null): string {
	if (!value) {
		return "Not verified yet";
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
