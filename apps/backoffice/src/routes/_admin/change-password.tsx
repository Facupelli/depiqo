import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/_admin/change-password")({
	beforeLoad: ({ context }) => {
		if (!context.user.mustChangePassword) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: ChangePasswordPage,
});

function ChangePasswordPage() {
	return (
		<main className="grid min-h-svh place-items-center bg-neutral-100 px-4 py-10 sm:py-12">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="mb-2 flex size-10 items-center justify-center rounded-full bg-depiqo-blue-50 text-depiqo-blue-700">
						<KeyRound className="size-5" aria-hidden="true" />
					</div>
					<CardTitle>Debes cambiar tu contraseña</CardTitle>
					<CardDescription>
						Por seguridad, debes establecer una nueva contraseña antes de
						acceder al panel de administración.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-neutral-600">
						La opción para cambiarla estará disponible aquí próximamente.
					</p>
				</CardContent>
			</Card>
		</main>
	);
}
