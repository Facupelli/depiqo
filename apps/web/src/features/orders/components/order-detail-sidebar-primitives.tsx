import type { ReactNode } from "react";

export function SidebarCardHeader({
	icon,
	title,
	action,
}: {
	icon: ReactNode;
	title: string;
	action?: ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-3 border-b border-neutral-100 mb-3 pb-1">
			<div className="flex items-center gap-2">
				<span className="flex size-8 items-center justify-center text-neutral-600">
					{icon}
				</span>
				<h2 className="text-sm font-bold text-neutral-950">{title}</h2>
			</div>
			{action}
		</div>
	);
}

export function SidebarField({
	icon,
	value,
}: {
	icon: ReactNode;
	value: string;
}) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-neutral-400 shrink-0">{icon}</span>
			<span className="text-xs text-neutral-500">{value}</span>
		</div>
	);
}
