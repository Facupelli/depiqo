import { Link } from "@tanstack/react-router";

const itemClassName =
	"border-b-2 border-transparent px-1 pb-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
const activeItemClassName = "border-primary text-foreground";

export function TeamLocalNav() {
	return (
		<nav aria-label="Equipo" className="flex gap-6 border-b">
			<Link
				to="/dashboard/settings/team"
				activeOptions={{ exact: true }}
				className={itemClassName}
				activeProps={{ className: activeItemClassName }}
			>
				Integrantes
			</Link>
			<Link
				to="/dashboard/settings/team/roles"
				className={itemClassName}
				activeProps={{ className: activeItemClassName }}
			>
				Roles
			</Link>
		</nav>
	);
}
