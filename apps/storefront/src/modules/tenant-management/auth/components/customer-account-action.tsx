import { Button } from "@repo/ui/components/button";
import { Link } from "@tanstack/react-router";
import {
	useCurrentCustomer,
	useCustomerLogout,
} from "../customer-auth.queries";

export function CustomerAccountAction() {
	const { data: customer } = useCurrentCustomer();
	const logout = useCustomerLogout();

	if (!customer) {
		return (
			<Link
				to="/login"
				className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs hover:bg-accent"
			>
				Iniciar sesión
			</Link>
		);
	}

	return (
		<div className="flex items-center gap-3">
			<span className="hidden text-sm sm:inline">{customer.firstName}</span>
			<Button
				type="button"
				variant="outline"
				disabled={logout.isPending}
				onClick={() => logout.mutate()}
			>
				{logout.isPending ? "Saliendo..." : "Cerrar sesión"}
			</Button>
		</div>
	);
}
