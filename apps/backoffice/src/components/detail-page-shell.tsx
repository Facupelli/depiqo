import type { ReactNode } from "react";

interface DetailPageShellProps {
	breadcrumb: ReactNode;
	header: ReactNode;
	navigation: ReactNode;
	children: ReactNode;
}

export function DetailPageShell({
	breadcrumb,
	header,
	navigation,
	children,
}: DetailPageShellProps) {
	return (
		<>
			{breadcrumb}
			<div className="flex flex-col">
				{header}
				{navigation}
				<div className="mt-5">{children}</div>
			</div>
		</>
	);
}
