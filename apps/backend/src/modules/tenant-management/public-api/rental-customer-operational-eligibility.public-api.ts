export interface EvaluateRentalCustomerOperationalEligibilityInput {
  tenantId: string;
  rentalCustomerId: string;
}

export type RentalCustomerOperationalEligibilityResult =
  | { eligible: true }
  | {
      eligible: false;
      reason: 'RentalCustomerNotFoundOrOutsideTenant' | 'RentalCustomerDeleted' | 'RentalCustomerInactive';
    };

export abstract class RentalCustomerOperationalEligibility {
  abstract evaluateRentalCustomerOperationalEligibility(
    input: EvaluateRentalCustomerOperationalEligibilityInput,
  ): Promise<RentalCustomerOperationalEligibilityResult>;
}
