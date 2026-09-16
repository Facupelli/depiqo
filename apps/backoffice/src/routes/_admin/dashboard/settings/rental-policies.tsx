import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { can, requireRouteAccess } from "@/auth/permissions";
import { SettingsConfigurationSection } from "@/modules/settings/business-configuration/SettingsConfigurationSection";

export const Route = createFileRoute(
	"/_admin/dashboard/settings/rental-policies",
)({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.TenantSettingsManage),
		);
	},

	component: RentalPoliciesScreen,
});

function RentalPoliciesScreen() {
	return <SettingsConfigurationSection section="rental-policies" />;
}
