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
import { useRouter } from "@tanstack/react-router";
import { KeyRound, LogOut } from "lucide-react";
import { useState } from "react";
import { useLogout } from "@/auth/logout/logout.mutation";
import { normalizeSafeRedirectTo } from "@/shared/auth/auth-redirect";
import { mapChangePasswordError } from "./change-password.errors";
import { useChangePassword } from "./change-password.mutation";
import {
	changePasswordFormSchema,
	createChangePasswordFormDefaultValues,
	toChangePasswordDto,
} from "./change-password-form.schema";

const formId = "change-password";

export function ChangePasswordPage({ redirectTo }: { redirectTo?: string }) {
	const router = useRouter();
	const changePassword = useChangePassword();
	const logout = useLogout();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: createChangePasswordFormDefaultValues(),
		validators: {
			onSubmit: changePasswordFormSchema,
		},
		onSubmit: async ({ value }) => {
			setServerError(null);

			try {
				await changePassword.mutateAsync({
					body: toChangePasswordDto(value),
				});

				await router.navigate({
					href: normalizeSafeRedirectTo(redirectTo, "/dashboard"),
					replace: true,
				});
			} catch (error) {
				setServerError(mapChangePasswordError(error));
			}
		},
	});

	return (
		<main className="grid min-h-svh place-items-center bg-neutral-100 px-4 py-10 sm:py-12">
			<div className="grid w-full max-w-md gap-4">
				<Card className="w-full">
					<CardHeader>
						<div className="mb-2 flex size-10 items-center justify-center rounded-full bg-depiqo-blue-50 text-depiqo-blue-700">
							<KeyRound className="size-5" aria-hidden="true" />
						</div>
						<CardTitle>Reemplaza tu contraseña temporal</CardTitle>
						<CardDescription>
							Antes de continuar, establece una nueva contraseña que solo tú
							conozcas.
						</CardDescription>
					</CardHeader>

					<CardContent>
						<form
							id={formId}
							onSubmit={(event) => {
								event.preventDefault();
								event.stopPropagation();
								form.handleSubmit();
							}}
						>
							<FieldGroup>
								<form.Field name="currentPassword">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>
													Contraseña actual
												</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													type="password"
													autoComplete="current-password"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(event) =>
														field.handleChange(event.target.value)
													}
													aria-invalid={isInvalid}
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
								<form.Field name="newPassword">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>
													Nueva contraseña
												</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													type="password"
													autoComplete="new-password"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(event) =>
														field.handleChange(event.target.value)
													}
													aria-invalid={isInvalid}
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>
								<form.Field name="confirmNewPassword">
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>
													Confirmar nueva contraseña
												</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													type="password"
													autoComplete="new-password"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(event) =>
														field.handleChange(event.target.value)
													}
													aria-invalid={isInvalid}
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

					<CardFooter className="grid gap-4">
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Field data-invalid={!!serverError} className="grid gap-2">
									<Button
										type="submit"
										form={formId}
										className="w-full py-5 uppercase"
										disabled={!canSubmit || changePassword.isPending}
									>
										{isSubmitting || changePassword.isPending
											? "Guardando..."
											: "Cambiar contraseña"}
									</Button>
									{serverError && (
										<FieldError errors={[{ message: serverError }]} />
									)}
								</Field>
							)}
						</form.Subscribe>
					</CardFooter>
				</Card>

				<Button
					type="button"
					variant="ghost"
					className="justify-self-center text-neutral-600"
					disabled={logout.isPending || changePassword.isPending}
					onClick={() => logout.mutate()}
				>
					<LogOut aria-hidden="true" />
					{logout.isPending ? "Saliendo..." : "Cerrar sesión"}
				</Button>
			</div>
		</main>
	);
}
