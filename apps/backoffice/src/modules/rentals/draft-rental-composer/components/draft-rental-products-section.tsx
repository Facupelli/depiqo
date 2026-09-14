import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { withForm } from "@/shared/contexts/form.context";
import { createDraftRentalComposerDefaultValues } from "../draft-rental-composer.schema";
import { DraftRentalOfferSearchSection } from "./draft-rental-offer-search-section";
import { DraftRentalSelectedOffersSection } from "./draft-rental-selected-offers-section";

export const DraftRentalProductsSection = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	render: function Render({ form }) {
		return (
			<Card size="sm" className="gap-3 shadow-none">
				<CardHeader>
					<CardTitle className="text-base">Productos</CardTitle>
				</CardHeader>
				<CardContent>
					<DraftRentalOfferSearchSection form={form} />
					<DraftRentalSelectedOffersSection form={form} />
				</CardContent>
			</Card>
		);
	},
});
