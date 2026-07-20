import { Link } from "@tanstack/react-router";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface PageBreadcrumbProps {
	parent: {
		label: string;
		to: string;
		search?: Record<string, unknown>;
	};
	current: string;
}

export function PageBreadcrumb({ parent, current }: PageBreadcrumbProps) {
	return (
		<Breadcrumb className="pt-6 pb-4">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink
						render={
							<Link to={parent.to} search={parent.search as never}>
								{parent.label}
							</Link>
						}
					/>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbPage>{current}</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}
