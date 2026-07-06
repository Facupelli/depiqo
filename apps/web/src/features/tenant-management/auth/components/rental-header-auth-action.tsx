import type { AuthCustomerDto } from "@repo/api-contracts";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getCurrentRelativeRedirect } from "@/shared/auth/auth-redirect";
import { getPortalAuthRedirectSearch } from "@/shared/auth/portal-auth-redirect";
import { useLogout } from "@/features/tenant-management/auth/logout/logout.mutation";

export function RentalHeaderAuthAction({
	user,
}: {
	user: AuthCustomerDto | null;
}) {
	const navigate = useNavigate();

	if (!user) {
		return (
			<button
				type="button"
				onClick={() => {
					navigate({
						to: "/login",
						search: getPortalAuthRedirectSearch(
							getCurrentRelativeRedirect("/rental"),
						),
					});
				}}
				className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
			>
				Iniciar Sesión
			</button>
		);
	}

	return <RentalHeaderUserPopover email={user.email} />;
}

type RentalHeaderUserPopoverProps = {
	email: string;
};

function RentalHeaderUserPopover({ email }: RentalHeaderUserPopoverProps) {
	const { mutate: logOut, isPending } = useLogout();

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className="rounded-full border border-neutral-200"
						aria-label="Abrir perfil"
					>
						<User className="h-5 w-5" />
					</Button>
				}
			/>
			<PopoverContent
				align="end"
				sideOffset={8}
				className="w-72 gap-3 rounded-lg border border-neutral-200 bg-white "
			>
				<div>
					<p className="truncate text-xs text-muted-foreground">{email}</p>
				</div>
				<div>
					<Button
						variant="ghost"
						className="w-full px-0 justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
						onClick={() => {
							logOut();
						}}
						disabled={isPending}
					>
						<LogOut className="size-4" />
						Cerrar Sesión
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
