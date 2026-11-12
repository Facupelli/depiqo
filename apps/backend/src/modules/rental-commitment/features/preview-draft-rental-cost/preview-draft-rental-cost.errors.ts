import type { ApplicationError } from 'src/core/errors/application-error';

export interface PreviewDraftRentalCostError extends ApplicationError {
  code:
    | 'rental_commitment.rental_not_found'
    | 'rental_commitment.rental_not_draft'
    | 'rental_commitment.preview_invalid_input'
    | 'rental_commitment.delivery_review_required'
    | 'rental_commitment.preview_selection_unavailable'
    | 'rental_commitment.preview_configuration_unavailable'
    | 'rental_commitment.preview_pricing_unavailable';
}
