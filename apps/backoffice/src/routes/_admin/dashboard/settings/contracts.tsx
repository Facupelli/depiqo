import { createFileRoute } from "@tanstack/react-router";
import { ContractSignerSettingsSection } from "@/modules/settings/contract-settings/configure-contract-signer/ContractSignerSettingsSection";

export const Route = createFileRoute("/_admin/dashboard/settings/contracts")({
	component: ContractsScreen,
});

function ContractsScreen() {
	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-semibold">Firmante del negocio</h3>
				<p className="text-sm text-muted-foreground">
					Estos datos se usarán en los futuros contratos de alquiler.
				</p>
			</div>
			<ContractSignerSettingsSection />
		</div>
	);
}
