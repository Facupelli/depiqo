import type { GetRentableItemDetailOfferSetupSummaryDto } from '@repo/api-contracts';

type SetupSummary = GetRentableItemDetailOfferSetupSummaryDto;
type SetupStatus = SetupSummary['status'];
type SetupIssue = SetupSummary['issues'][number];
type AvailableAction = SetupSummary['availableActions'][number];

type ItemStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
type BillingUnit = 'HOUR' | 'DAY' | 'WEEK';

interface BranchSetupFacts {
  isActive: boolean;
}

interface OfferSetupFacts {
  isVisible: boolean;
  isRentable: boolean;
}

interface PricingTierSetupFacts {
  pricePerUnit: string;
}

interface RatePlanSetupFacts {
  id: string;
  name: string;
  currency: string;
  billingUnit: BillingUnit;
  isActive: boolean;
  tiers: PricingTierSetupFacts[];
}

interface PricingSetupFacts {
  isActive: boolean;
  ratePlan: RatePlanSetupFacts;
}

export interface RentalOfferSetupSummaryInput {
  itemStatus: ItemStatus;
  branch: BranchSetupFacts | null;
  offer: OfferSetupFacts;
  pricing: PricingSetupFacts | null;
}

export function buildRentalOfferSetupSummary(input: RentalOfferSetupSummaryInput): SetupSummary {
  const branchIsAvailable = isBranchAvailable(input.branch);
  const pricingIsValid = isPricingValid(input.pricing);

  return {
    status: determineSetupStatus(input, branchIsAvailable, pricingIsValid),
    issues: collectSetupIssues(input),
    priceSummary: buildPriceSummary(input.pricing, pricingIsValid),
    availableActions: determineAvailableActions(input.itemStatus, branchIsAvailable, pricingIsValid),
  };
}

function isBranchAvailable(branch: BranchSetupFacts | null): boolean {
  return branch?.isActive === true;
}

function isPricingValid(pricing: PricingSetupFacts | null): pricing is PricingSetupFacts {
  return (
    pricing !== null &&
    pricing.isActive &&
    pricing.ratePlan.isActive &&
    pricing.ratePlan.tiers.length > 0
  );
}

function determineSetupStatus(
  input: RentalOfferSetupSummaryInput,
  branchIsAvailable: boolean,
  pricingIsValid: boolean,
): SetupStatus {
  if (!branchIsAvailable) return 'BRANCH_UNAVAILABLE';
  if (!input.pricing) return 'MISSING_PRICING';
  if (!pricingIsValid) return 'INVALID_PRICING';
  if (!input.offer.isRentable) return 'NOT_RENTABLE';
  if (!input.offer.isVisible) return 'NOT_VISIBLE';

  return 'READY';
}

function collectSetupIssues(input: RentalOfferSetupSummaryInput): SetupIssue[] {
  const issues: SetupIssue[] = [];

  addBranchIssues(issues, input.branch);
  addPricingIssues(issues, input.pricing);
  addOfferIssues(issues, input.offer);

  return issues;
}

function addBranchIssues(issues: SetupIssue[], branch: BranchSetupFacts | null): void {
  if (!branch) {
    issues.push('BRANCH_UNAVAILABLE');
    return;
  }

  if (!branch.isActive) issues.push('BRANCH_INACTIVE');
}

function addPricingIssues(issues: SetupIssue[], pricing: PricingSetupFacts | null): void {
  if (!pricing) {
    issues.push('MISSING_PRICING');
    return;
  }

  if (!pricing.isActive) issues.push('PRICING_ASSIGNMENT_INACTIVE');
  if (!pricing.ratePlan.isActive) issues.push('RATE_PLAN_INACTIVE');
  if (pricing.ratePlan.tiers.length === 0) issues.push('NO_VALID_TIERS');
}

function addOfferIssues(issues: SetupIssue[], offer: OfferSetupFacts): void {
  if (!offer.isRentable) issues.push('OFFER_NOT_RENTABLE');
  if (!offer.isVisible) issues.push('OFFER_NOT_VISIBLE');
}

function buildPriceSummary(
  pricing: PricingSetupFacts | null,
  pricingIsValid: boolean,
): SetupSummary['priceSummary'] {
  if (!pricing || !pricingIsValid) return null;

  const firstTier = pricing.ratePlan.tiers[0];
  if (!firstTier) return null;

  return {
    ratePlanId: pricing.ratePlan.id,
    ratePlanName: pricing.ratePlan.name,
    startingPrice: firstTier.pricePerUnit,
    currency: pricing.ratePlan.currency,
    billingUnit: pricing.ratePlan.billingUnit,
  };
}

function determineAvailableActions(
  itemStatus: ItemStatus,
  branchIsAvailable: boolean,
  pricingIsValid: boolean,
): AvailableAction[] {
  if (itemStatus === 'ARCHIVED' || !branchIsAvailable) return [];
  if (pricingIsValid) return ['EDIT_PRICING'];

  return ['ASSIGN_PRICE'];
}
