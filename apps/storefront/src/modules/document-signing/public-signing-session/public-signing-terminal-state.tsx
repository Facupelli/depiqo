import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type PublicSigningTerminalStateProps = {
	icon: LucideIcon;
	title: string;
	description: string;
	detail?: string;
	action?: ReactNode;
};

export function PublicSigningTerminalState({
	icon: Icon,
	title,
	description,
	detail,
	action,
}: PublicSigningTerminalStateProps) {
	return (
		<main className="grid min-h-svh place-items-center bg-neutral-100 px-4 py-10">
			<Card className="w-full max-w-lg">
				<CardHeader className="space-y-4 text-center">
					<div className="mx-auto grid size-14 place-items-center rounded-full bg-neutral-900 text-white">
						<Icon className="size-6" />
					</div>
					<div className="space-y-2">
						<CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
						<p className="text-sm leading-6 text-neutral-600">{description}</p>
					</div>
				</CardHeader>
				{detail ? (
					<CardContent>
						<div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
							{detail}
						</div>
					</CardContent>
				) : null}
				{action ? <CardContent>{action}</CardContent> : null}
			</Card>
		</main>
	);
}
