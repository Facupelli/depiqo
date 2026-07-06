import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type PublicSigningTerminalStateProps = {
	icon: LucideIcon;
	title: string;
	description: string;
	detail?: string;
	actionLabel?: string;
	actionHref?: string;
};

export function PublicSigningTerminalState({
	icon: Icon,
	title,
	description,
	detail,
	actionLabel,
	actionHref,
}: PublicSigningTerminalStateProps) {
	return (
		<div className="flex min-h-svh items-center justify-center bg-neutral-100 px-4 py-10 sm:px-6">
			<Card className="w-full max-w-lg border-neutral-200 bg-white">
				<CardHeader className="space-y-4 text-center">
					<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-neutral-900 text-white">
						<Icon className="size-6" />
					</div>
					<div className="space-y-1.5">
						<CardTitle className="text-xl font-semibold text-neutral-950 sm:text-2xl">
							{title}
						</CardTitle>
						<CardDescription className="text-sm leading-6 text-neutral-600">
							{description}
						</CardDescription>
					</div>
				</CardHeader>
				{detail ? (
					<CardContent>
						<div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-600">
							{detail}
						</div>
					</CardContent>
				) : null}
				{actionHref && actionLabel ? (
					<CardFooter>
						<Button
							className="w-full"
							render={<a href={actionHref}>{actionLabel}</a>}
						/>
					</CardFooter>
				) : null}
			</Card>
		</div>
	);
}
