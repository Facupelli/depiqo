import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Building2, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useCreateCustomerGoogleState } from "@/features/tenant-management/auth/customer-google-state/customer-google-state.mutation";
import {
	customerRegisterDefaultValues,
	customerRegisterSchema,
} from "@/features/tenant-management/auth/portal/customer-register-form.schema";
import { buildSharedGoogleAuthStartUrl } from "@/features/tenant-management/auth/portal/google-auth.redirect";
import {
	getPortalAuthRedirectTarget,
	portalAuthRedirectSchema,
} from "@/features/tenant-management/auth/portal/portal-auth.redirect";
import { getTenantBranding } from "@/features/tenant-management/tenant-context/tenant-branding";
import { PoweredByFooter } from "@/shared/components/powered-by-footer";
import { isAuthError, ProblemDetailsError } from "@/shared/errors";

export const Route = createFileRoute("/_portal/register")({
	validateSearch: portalAuthRedirectSchema,
	beforeLoad: async ({ context, search }) => {
		if (context.user?.actorType === "TENANT_CUSTOMER") {
			throw redirect(getPortalAuthRedirectTarget(search));
		}

		if (context.user?.actorType === "TENANT_USER") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: RegisterPage,
});

const formId = "register-customer";

function RegisterPage() {
	const { tenantContext } = Route.useRouteContext();
	const redirectSearch = Route.useSearch();

	const isPending = false;
	const { mutateAsync: createGoogleState, isPending: isGoogleStatePending } =
		useCreateCustomerGoogleState();
	const [serverError, setServerError] = useState<string | null>(null);
	const redirectTarget = getPortalAuthRedirectTarget(redirectSearch);
	const isGooglePending = isGoogleStatePending;

	const form = useForm({
		defaultValues: customerRegisterDefaultValues,
		validators: {
			onSubmit: customerRegisterSchema,
		},
		onSubmit: async () => {
			setServerError(
				"El registro con email y contraseña está temporalmente deshabilitado. Usa Google para crear tu cuenta.",
			);
		},
	});

	const handleGoogleLogin = async () => {
		setServerError(null);

		try {
			const { state } = await createGoogleState({
				body: {
					portalOrigin: window.location.origin,
					redirectPath: redirectTarget.href,
				},
			});
			window.location.assign(buildSharedGoogleAuthStartUrl(state));
		} catch (error) {
			setServerError(getGoogleAuthErrorMessage(error));
		}
	};

	const branding = getTenantBranding(tenantContext.tenant);

	return (
		<div className="grid grid-rows-[1fr_auto] min-h-svh bg-neutral-100">
			{/* Main — centers content both axes */}
			<main className="flex flex-col items-center justify-center px-4 py-12">
				<div className="w-full max-w-md space-y-6">
					{/* ── Logo + heading ── */}
					<div className="space-y-2">
						{branding.logoSrc && (
							<div className="flex justify-center">
								<img
									src={branding.logoSrc}
									alt={branding.tenantName}
									className="size-32 object-contain"
								/>
							</div>
						)}
						<div className="space-y-1">
							<h1 className="text-2xl font-bold tracking-tight">
								Crear nueva cuenta
							</h1>
							<p className="text-sm text-muted-foreground">
								Regístrate para empezar a alquilar equipos profesionales.
							</p>
						</div>
					</div>

					<div className="space-y-4">
						<button
							type="button"
							onClick={handleGoogleLogin}
							disabled={isPending || isGooglePending}
							className="w-full flex items-center justify-center gap-3 h-11 px-3 rounded-md border border-[#747775] bg-white text-[#1F1F1F] font-medium text-sm font-[Roboto,sans-serif] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 48 48"
								className="size-5 shrink-0"
							>
								<title>Google Logo</title>
								<path
									fill="#EA4335"
									d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
								/>
								<path
									fill="#4285F4"
									d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
								/>
								<path
									fill="#FBBC05"
									d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
								/>
								<path
									fill="#34A853"
									d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
								/>
								<path fill="none" d="M0 0h48v48H0z" />
							</svg>

							{isGooglePending ? "Conectando..." : "Continuar con Google"}
						</button>

						<div className="flex items-center gap-3">
							<span className="flex-1 h-px bg-neutral-300" />
							<span className="text-sm text-muted-foreground">o</span>
							<span className="flex-1 h-px bg-neutral-300" />
						</div>
					</div>

					<form
						id={formId}
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
						noValidate
					>
						<FieldGroup>
							{/* ── First name / Last name ── */}
							<div className="grid grid-cols-2 gap-4">
								<form.Field
									name="firstName"
									children={(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;

										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													type="text"
													placeholder="Ej. Juan"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													className="bg-white"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								/>

								<form.Field
									name="lastName"
									children={(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;

										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>Apellidos</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													type="text"
													placeholder="Ej. Pérez"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													className="bg-white"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								/>
							</div>

							{/* ── Email ── */}
							<form.Field
								name="email"
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												Correo Electrónico
											</FieldLabel>
											<div className="relative">
												<Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
												<Input
													id={field.name}
													name={field.name}
													type="email"
													placeholder="usuario@ejemplo.com"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													className="pl-9 bg-white"
												/>
											</div>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>

							{/* ── Password ── */}
							<form.Field
								name="password"
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Contraseña</FieldLabel>
											<div className="relative">
												<Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
												<Input
													id={field.name}
													name={field.name}
													type="password"
													placeholder="••••••••"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													className="pl-9 bg-white"
												/>
											</div>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>

							{/* ── Is company checkbox ── */}
							<form.Field
								name="isCompany"
								children={(field) => (
									<div className="flex items-center gap-2.5">
										<Checkbox
											id={field.name}
											checked={field.state.value}
											onCheckedChange={(checked) => {
												field.handleChange(checked === true);
												if (checked !== true) {
													form.setFieldValue("companyName", undefined);
												}
											}}
											className="bg-white"
										/>
										<label
											htmlFor={field.name}
											className="text-sm text-zinc-400 cursor-pointer select-none"
										>
											Soy una empresa
										</label>
									</div>
								)}
							/>

							{/* ── Company name (conditional) ── */}
							<form.Subscribe
								selector={(state) => state.values.isCompany}
								children={(isCompany) =>
									isCompany ? (
										<form.Field
											name="companyName"
											children={(field) => {
												const isInvalid =
													field.state.meta.isTouched &&
													!field.state.meta.isValid;

												return (
													<Field data-invalid={isInvalid}>
														<FieldLabel htmlFor={field.name}>
															Nombre de la empresa
														</FieldLabel>
														<div className="relative">
															<Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
															<Input
																id={field.name}
																name={field.name}
																type="text"
																placeholder="Acme Corp"
																value={field.state.value ?? ""}
																onBlur={field.handleBlur}
																onChange={(e) =>
																	field.handleChange(e.target.value)
																}
																aria-invalid={isInvalid}
																className="pl-9"
															/>
														</div>
														{isInvalid && (
															<FieldError errors={field.state.meta.errors} />
														)}
													</Field>
												);
											}}
										/>
									) : null
								}
							/>

							{/* ── Submit ── */}
							<form.Subscribe
								selector={(state) => [state.canSubmit, state.isSubmitting]}
								children={([canSubmit, isSubmitting]) => (
									<Field data-invalid={!!serverError} className="grid gap-y-2">
										<Button
											className="w-full py-5"
											type="submit"
											form={formId}
											disabled={!canSubmit || isPending || isGooglePending}
										>
											{isSubmitting || isPending
												? "Creando..."
												: "Crear cuenta"}
										</Button>

										{serverError ? (
											<FieldError errors={[{ message: serverError }]} />
										) : null}
									</Field>
								)}
							/>
						</FieldGroup>
					</form>

					{/* ── Footer links ── */}
					<div className="space-y-4">
						<p className="text-center text-xs text-muted-foreground">
							Al registrarse aceptas nuestros{" "}
							<Link
								to="/admin/login"
								className="underline font-semibold"
								preload={false}
							>
								Términos de Servicio
							</Link>{" "}
							y{" "}
							<Link
								to="/admin/login"
								className="underline font-semibold"
								preload={false}
							>
								Política de Privacidad
							</Link>
						</p>

						<div className="h-px bg-accent w-full" />

						<p className="text-center text-sm text-muted-foreground">
							¿Ya tienes cuenta?{" "}
							<Link
								to="/login"
								search={redirectSearch}
								className="underline font-semibold"
							>
								Iniciar sesión
							</Link>
						</p>
					</div>
				</div>
			</main>

			<PoweredByFooter />
		</div>
	);
}

function getGoogleAuthErrorMessage(error: unknown): string {
	if (isAuthError(error)) {
		return "No pudimos iniciar sesión con Google.";
	}

	if (error instanceof ProblemDetailsError) {
		return error.problemDetails.detail;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return "Ocurrió un error inesperado al iniciar sesión con Google.";
}
