import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	registerFormDefaults,
	registerFormSchema,
	toRegisterDto,
} from "@/features/tenant-management/tenant/register-tenant-with-owner/register-tenant-with-owner-form.schema";
import { ProblemDetailsError } from "@/shared/errors";
import { useRegisterTenantWithOwner } from "@/features/tenant-management/tenant/register-tenant-with-owner/register-tenant-with-owner.mutation";

export const Route = createFileRoute("/_admin/admin/register")({
	component: RegisterPage,
});

const formId = "register-user-tenant";

function RegisterPage() {
	const { mutateAsync: registerTenantWithOwner, isPending } =
		useRegisterTenantWithOwner();

	const form = useForm({
		defaultValues: registerFormDefaults,
		validators: {
			onSubmit: registerFormSchema,
		},
		onSubmit: async ({ value }) => {
			const dto = toRegisterDto(value);
			try {
				const data = await registerTenantWithOwner({
					body: dto,
				});
				setSuccessData(data);
			} catch (error) {
				console.log(error);
				if (error instanceof ProblemDetailsError || error instanceof Error) {
					setServerError(error.message);
				}
			}
		},
	});

	const [successData, setSuccessData] = useState<{
		tenantUserId: string;
		tenantId: string;
	} | null>(null);
	const [serverError, setServerError] = useState<string | null>(null);

	if (successData) {
		return (
			<div>
				<h2>¡Tu cuenta está lista!</h2>
				<p>
					Ya puedes iniciar sesión y empezar a configurar tu empresa en Depiqo.
				</p>
			</div>
		);
	}

	return (
		<div className="grid place-content-center bg-neutral-100 min-h-svh">
			{serverError && <p role="alert">{serverError}</p>}

			<div className="grid gap-y-10">
				<div className="grid gap-y-2 text-center">
					<h1 className="text-3xl font-bold text-primary">DEPIQO</h1>
					<p className="text-sm text-muted-foreground">
						Gestiona tu alquiler de equipos con más orden desde el primer día.
					</p>
				</div>

				<Card className="w-md">
					<CardHeader>
						<CardTitle>Crea tu cuenta en Depiqo</CardTitle>
						<CardDescription>
							Prepara tu empresa para gestionar equipos, clientes y reservas en
							un solo lugar.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							id={formId}
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								form.handleSubmit();
							}}
							className="space-y-4"
						>
							<FieldGroup>
								<form.Field
									name="tenantName"
									children={(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>
													Nombre de la empresa
												</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder="Ej. Andamios del Norte"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								/>
							</FieldGroup>

							<FieldGroup>
								<div className="flex items-center gap-x-4">
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
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														aria-invalid={isInvalid}
														placeholder="Carlos"
														autoComplete="off"
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
													<FieldLabel htmlFor={field.name}>Apellido</FieldLabel>
													<Input
														id={field.name}
														name={field.name}
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														aria-invalid={isInvalid}
														placeholder="Méndez"
														autoComplete="off"
													/>
													{isInvalid && (
														<FieldError errors={field.state.meta.errors} />
													)}
												</Field>
											);
										}}
									/>
								</div>
								<form.Field
									name="email"
									children={(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>
													Correo electrónico
												</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													type="email"
													placeholder="admin@tuempresa.com"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								/>
								<form.Field
									name="password"
									children={(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>Contraseña</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													type="password"
													placeholder="Crea una contraseña segura"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								/>
							</FieldGroup>
						</form>
					</CardContent>
					<CardFooter className="grid gap-y-4">
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
							children={([canSubmit, isSubmitting]) => (
								<Field orientation="horizontal">
									<Button
										className="uppercase w-full py-5"
										type="submit"
										form={formId}
										disabled={!canSubmit || isPending}
									>
										{isSubmitting ? "Creando cuenta..." : "Crear mi cuenta"}
									</Button>
								</Field>
							)}
						/>

						<div>
							<p className="text-center text-sm text-muted-foreground">
								¿Ya tienes una cuenta?{" "}
								<Link to="/admin/login" className="underline">
									Inicia sesión
								</Link>
							</p>
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
