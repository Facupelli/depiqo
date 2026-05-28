import { createFileRoute } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";
import { useState } from "react";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/features/customer/components/detail/overview-tab";
import { ProfileTab } from "@/features/customer/components/detail/profile-tab";
import {
	customerQueries,
	useCustomerDetail,
} from "@/features/customer/customer.queries";

export const Route = createFileRoute("/_admin/dashboard/customers/$customerId")(
	{
		loader: ({ context: { queryClient }, params: { customerId } }) =>
			queryClient.ensureQueryData(customerQueries.detail(customerId)),

		pendingComponent: () => <CustomerDetailSkeleton />,
		errorComponent: ({ error }) => <CustomerDetailError error={error} />,

		component: CustomerDetailPage,
	},
);

function CustomerDetailPage() {
	const { customerId } = Route.useParams();

	return (
		<div className="min-h-screen bg-background px-8">
			<CustomerPageHeader customerId={customerId} />
			<div className="py-8">
				<CustomerTabs customerId={customerId} />
			</div>
		</div>
	);
}

function CustomerDetailSkeleton() {
	return (
		<div className="min-h-screen bg-background px-6">
			<div className="h-16 flex items-center gap-3">
				<div className="h-6 w-40 bg-muted rounded animate-pulse" />
				<div className="h-5 w-14 bg-muted rounded-full animate-pulse" />
			</div>
		</div>
	);
}

function CustomerDetailError({ error }: { error: unknown }) {
	const message =
		error instanceof Error ? error.message : "Something went wrong.";

	return (
		<div className="min-h-screen bg-background flex items-center justify-center">
			<p className="text-destructive text-sm">{message}</p>
		</div>
	);
}

interface CustomerPageHeaderProps {
	customerId: string;
}

export function CustomerPageHeader({ customerId }: CustomerPageHeaderProps) {
	const { data: customer } = useCustomerDetail(customerId);

	const fullName = `${customer.firstName} ${customer.lastName}`;

	return (
		<header>
			<PageBreadcrumb
				parent={{ label: "Clientes", to: "/dashboard/customers" }}
				current={customer.firstName}
			/>

			<div className="flex items-center justify-between border-b border-border pb-6">
				<div className="flex items-center gap-3">
					<h1 className="text-xl font-semibold text-foreground">{fullName}</h1>
					<Badge
						variant={customer.isActive ? "default" : "secondary"}
						className={
							customer.isActive
								? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
								: "bg-muted text-muted-foreground"
						}
					>
						{customer.isActive ? "Active" : "Inactive"}
					</Badge>
				</div>

				<div className="flex items-center gap-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search resources..."
							className="pl-9 w-64 bg-muted border-transparent"
						/>
					</div>
					<Button variant="ghost" size="icon">
						<Bell className="h-5 w-5 text-muted-foreground" />
					</Button>
				</div>
			</div>
		</header>
	);
}

type TabValue = "overview" | "profile" | "order-history";

interface CustomerTabsProps {
	customerId: string;
}

export function CustomerTabs({ customerId }: CustomerTabsProps) {
	const [activeTab, setActiveTab] = useState<TabValue>("overview");

	return (
		<Tabs
			value={activeTab}
			onValueChange={(v) => setActiveTab(v as TabValue)}
			className="flex flex-col gap-y-10"
		>
			<TabsList>
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="profile">Profile Verification</TabsTrigger>
				<TabsTrigger value="order-history">Order History</TabsTrigger>
			</TabsList>

			<TabsContent value="overview" hidden={activeTab !== "overview"}>
				<OverviewTab customerId={customerId} />
			</TabsContent>

			<TabsContent value="profile">
				{activeTab === "profile" && <ProfileTab customerId={customerId} />}
			</TabsContent>

			<TabsContent value="order-history">
				{activeTab === "order-history" && (
					<div className="text-muted-foreground text-sm">Coming soon.</div>
				)}
			</TabsContent>
		</Tabs>
	);
}
