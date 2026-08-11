import { Button } from "@repo/ui/components/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useForm } from "@tanstack/react-form";
import {
	createFileRoute,
	Link,
	notFound,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useCustomerLogin } from "@/modules/tenant-management/auth/customer-auth.queries";
import { useCreateCustomerGoogleState } from "@/modules/tenant-management/auth/customer-google/customer-google.mutation";
import { buildCustomerGoogleStartUrl } from "@/modules/tenant-management/auth/customer-google/customer-google.redirect";
import {
	createCustomerLoginFormDefaults,
	customerLoginFormSchema,
	toCustomerLoginDto,
} from "@/modules/tenant-management/auth/customer-login-form.schema";
import { resolveCustomerReturnTo } from "@/modules/tenant-management/auth/customer-return-to";
import { getCurrentCustomerForStorefront } from "@/modules/tenant-management/auth/get-current-customer.function";
import { getTenantBranding } from "@/modules/tenant-management/tenant-branding/tenant-branding";
import { isAuthError } from "@/shared/errors";

export const Route = createFileRoute("/login")({
	validateSearch: z.object({ returnTo: z.unknown().optional() }),
	beforeLoad: async ({ context, search }) => {
		if (!context.tenantContext || context.tenantContext.face !== "storefront")
			throw notFound();

		const returnTo = resolveCustomerReturnTo(search.returnTo);
		const customer = await getCurrentCustomerForStorefront();
		if (customer) throw redirect({ href: returnTo, replace: true });

		return { storefrontTenant: context.tenantContext, returnTo };
	},
	component: CustomerLoginPage,
});

function CustomerLoginPage() {
	const { storefrontTenant, returnTo } = Route.useRouteContext();
	const branding = getTenantBranding(storefrontTenant.tenant);
	const router = useRouter();
	const login = useCustomerLogin();
	const createGoogleState = useCreateCustomerGoogleState();
	const [serverError, setServerError] = useState<string | null>(null);
	async function startGoogleLogin() {
		setServerError(null);
		try {
			const { state } = await createGoogleState.mutateAsync({
				redirectPath: returnTo,
			});
			window.location.assign(buildCustomerGoogleStartUrl(state));
		} catch {
			setServerError("No pudimos iniciar el acceso con Google.");
		}
	}

	const form = useForm({
		defaultValues: createCustomerLoginFormDefaults(),
		validators: { onSubmit: customerLoginFormSchema },
		onSubmit: async ({ value }) => {
			setServerError(null);
			try {
				await login.mutateAsync(toCustomerLoginDto(value));
				await router.navigate({ href: returnTo, replace: true });
			} catch (error) {
				setServerError(
					isAuthError(error)
						? "Correo o contraseña inválidos."
						: "No pudimos iniciar sesión.",
				);
			}
		},
	});

	return (
		<main className="grid min-h-svh place-items-center bg-neutral-100 px-4 py-12">
			<section className="w-full max-w-md space-y-6 rounded-xl border bg-white p-6 shadow-sm">
				{branding.logoSrc ? (
					<img
						src={branding.logoSrc}
						alt={branding.tenantName}
						className="mx-auto size-24 object-contain"
					/>
				) : null}
				<div className="space-y-1">
					<h1 className="text-2xl font-bold">Iniciar sesión</h1>
					<p className="text-sm text-muted-foreground">
						Accede a tu cuenta de {branding.tenantName}.
					</p>
				</div>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
					noValidate
				>
					<FieldGroup>
						<form.Field name="email">
							{(field) => (
								<Field
									data-invalid={
										field.state.meta.isTouched && !field.state.meta.isValid
									}
								>
									<FieldLabel htmlFor={field.name}>
										Correo electrónico
									</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="email"
										autoComplete="email"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
									{field.state.meta.isTouched && !field.state.meta.isValid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							)}
						</form.Field>
						<form.Field name="password">
							{(field) => (
								<Field
									data-invalid={
										field.state.meta.isTouched && !field.state.meta.isValid
									}
								>
									<FieldLabel htmlFor={field.name}>Contraseña</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										autoComplete="current-password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
									{field.state.meta.isTouched && !field.state.meta.isValid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							)}
						</form.Field>
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Field data-invalid={!!serverError}>
									<Button
										type="submit"
										className="w-full"
										disabled={!canSubmit || login.isPending}
									>
										{isSubmitting || login.isPending
											? "Iniciando..."
											: "Iniciar sesión"}
									</Button>
									{serverError ? (
										<FieldError errors={[{ message: serverError }]} />
									) : null}
								</Field>
							)}
						</form.Subscribe>
					</FieldGroup>
				</form>
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-white px-2 text-muted-foreground">o</span>
					</div>
				</div>
				<Button
					type="button"
					variant="outline"
					className="w-full"
					disabled={createGoogleState.isPending}
					onClick={startGoogleLogin}
				>
					{createGoogleState.isPending
						? "Redirigiendo a Google..."
						: "Continuar con Google"}
				</Button>
				<p className="text-center text-sm text-muted-foreground">
					¿No tienes una cuenta?{" "}
					<Link
						to="/register"
						search={{ returnTo }}
						className="font-semibold underline"
					>
						Ver opciones de registro
					</Link>
				</p>
			</section>
		</main>
	);
}
