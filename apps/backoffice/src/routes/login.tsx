import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
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
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { useLogin } from "@/auth/login/login.mutation";
import { loginSchema } from "@/auth/login/login-form.schema";
import {
	authRedirectSearchSchema,
	normalizeSafeRedirectTo,
} from "@/shared/auth/auth-redirect";
import { isAuthError, ProblemDetailsError } from "@/shared/errors";

export const Route = createFileRoute("/login")({
	validateSearch: authRedirectSearchSchema,
	beforeLoad: async ({ context }) => {
		if (context.user?.actorType === "TENANT_USER") {
			throw redirect({
				to: "/dashboard",
			});
		}
	},
	component: LoginPage,
});

const formId = "login-user";

function LoginPage() {
	const router = useRouter();
	const search = Route.useSearch();
	const { mutateAsync: login, isPending } = useLogin();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onSubmit: loginSchema,
		},
		onSubmit: async ({ value }) => {
			setServerError(null);

			try {
				await login({
					body: value,
				});

				await router.invalidate({ sync: true });

				router.navigate({
					href: normalizeSafeRedirectTo(search.redirectTo, "/dashboard"),
				});
			} catch (error) {
				if (isAuthError(error)) {
					setServerError("Invalid email or password");
					return;
				}

				if (error instanceof ProblemDetailsError || error instanceof Error) {
					setServerError(error.message);
				}
			}
		},
	});

	const [serverError, setServerError] = useState<string | null>(null);

	return (
		<div className="grid place-content-center bg-neutral-100 min-h-svh">
			<div className="grid gap-y-10">
				<h1 className="text-3xl font-bold text-primary text-center">DEPIQO</h1>

				<Card className="w-md">
					<CardHeader>
						<CardTitle>Backoffice Login</CardTitle>
						<CardDescription>
							Inicia sesión con tu cuenta para acceder a tu panel de
							administración.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							id={formId}
							onSubmit={(e) => {
								e.preventDefault();
								form.handleSubmit();
							}}
							className="space-y-10"
						>
							<FieldGroup>
								<form.Field name="email">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;

										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>Email:</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													type="email"
													placeholder="admin@skylines.com"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
								<form.Field name="password">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;

										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>
													Contraseña:
												</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													type="password"
													placeholder="********"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
							</FieldGroup>
						</form>
					</CardContent>
					<CardFooter className="grid gap-y-4">
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Field
									orientation="horizontal"
									data-invalid={!!serverError}
									className="grid gap-y-2"
								>
									<Button
										className="uppercase w-full py-5"
										type="submit"
										form={formId}
										disabled={!canSubmit || isPending}
									>
										{isSubmitting || isPending
											? "Cargando..."
											: "Iniciar sesión"}
									</Button>

									{serverError && (
										<FieldError errors={[{ message: serverError }]} />
									)}
								</Field>
							)}
						</form.Subscribe>

						<div>
							<p className="text-center text-sm text-muted-foreground">
								Don't have an account?{" "}
								<Link to="/admin/register" className="underline">
									Register
								</Link>
							</p>
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
