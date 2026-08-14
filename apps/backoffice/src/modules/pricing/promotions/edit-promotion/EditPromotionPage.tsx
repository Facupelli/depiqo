import { PromotionForm } from "../PromotionForm";
import { useSuspensePromotion } from "../promotion.queries";
import {
	promotionToFormValues,
	toUpdatePromotionDto,
} from "../promotion-form.schema";
import { useUpdatePromotion } from "./update-promotion.mutation";

type EditPromotionPageProps = {
	promotionId: string;
	onCancel: () => void;
	onSuccess: () => void;
};

const formId = "edit-promotion";

export function EditPromotionPage({
	promotionId,
	onCancel,
	onSuccess,
}: EditPromotionPageProps) {
	const { data: promotion } = useSuspensePromotion(promotionId);
	const { mutateAsync: updatePromotion, isPending } = useUpdatePromotion();

	return (
		<PromotionForm
			key={promotion.id}
			formId={formId}
			defaultValues={promotionToFormValues(promotion)}
			onCancel={onCancel}
			onSubmit={async (values) => {
				await updatePromotion({
					params: { promotionId: promotion.id },
					body: toUpdatePromotionDto(values),
				});
				onSuccess();
			}}
			isPending={isPending}
			submitLabel="Guardar cambios"
			pendingLabel="Guardando..."
		/>
	);
}
