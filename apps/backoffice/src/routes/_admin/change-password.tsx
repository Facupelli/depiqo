import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChangePasswordPage } from "@/auth/change-password/change-password-page";
import {
	authRedirectSearchSchema,
	normalizeSafeRedirectTo,
} from "@/shared/auth/auth-redirect";

export const Route = createFileRoute("/_admin/change-password")({
	validateSearch: authRedirectSearchSchema,
	beforeLoad: ({ context }) => {
		if (!context.user.mustChangePassword) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: ChangePasswordRoute,
});

function ChangePasswordRoute() {
	const search = Route.useSearch();

	return (
		<ChangePasswordPage
			redirectTo={normalizeSafeRedirectTo(search.redirectTo, "/dashboard")}
		/>
	);
}
