import { ChangePasswordBodySchema } from "@repo/api-contracts";
import { z } from "zod";
import type { ChangePasswordBodyDto } from "./change-password.api";

const currentPasswordFormSchema = z.string().superRefine((value, context) => {
	if (
		!ChangePasswordBodySchema.shape.currentPassword.safeParse(value).success
	) {
		context.addIssue({
			code: "custom",
			message: "Ingresa tu contraseña actual",
		});
	}
});

const newPasswordFormSchema = z.string().superRefine((value, context) => {
	if (!ChangePasswordBodySchema.shape.newPassword.safeParse(value).success) {
		context.addIssue({
			code: "custom",
			message: "Ingresa una nueva contraseña válida",
		});
	}
});

export const changePasswordFormSchema = z
	.object({
		currentPassword: currentPasswordFormSchema,
		newPassword: newPasswordFormSchema,
		confirmNewPassword: z.string().min(1, "Confirma tu nueva contraseña"),
	})
	.refine((values) => values.newPassword === values.confirmNewPassword, {
		message: "Las contraseñas no coinciden",
		path: ["confirmNewPassword"],
	});

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export function createChangePasswordFormDefaultValues(): ChangePasswordFormValues {
	return {
		currentPassword: "",
		newPassword: "",
		confirmNewPassword: "",
	};
}

export function toChangePasswordDto(
	values: ChangePasswordFormValues,
): ChangePasswordBodyDto {
	return ChangePasswordBodySchema.parse({
		currentPassword: values.currentPassword,
		newPassword: values.newPassword,
	});
}
