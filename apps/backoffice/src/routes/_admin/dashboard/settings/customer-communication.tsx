import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { can, requireRouteAccess } from "@/auth/permissions";
import { SettingsConfigurationSection } from "@/modules/settings/business-configuration/SettingsConfigurationSection";

export const Route = createFileRoute(
	"/_admin/dashboard/settings/customer-communication",
)({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.TenantSettingsManage),
		);
	},

	component: CustomerCommunicationScreen,
});

function CustomerCommunicationScreen() {
	return <SettingsConfigurationSection section="customer-communication" />;
}
