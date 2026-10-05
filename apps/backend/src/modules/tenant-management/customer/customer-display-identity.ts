export interface CustomerDisplayIdentityInput {
  firstName: string;
  lastName: string;
  isCompany: boolean;
  companyName: string | null;
  profile: { fullName: string; businessName: string | null } | null;
}

export interface CustomerDisplayIdentity {
  primaryName: string | null;
  companyName: string | null;
  contactName: string | null;
}

export function resolveCustomerDisplayIdentity(customer: CustomerDisplayIdentityInput): CustomerDisplayIdentity {
  const accountPersonName = usableName(`${customer.firstName} ${customer.lastName}`);
  const contactName = usableName(customer.profile?.fullName) ?? accountPersonName;
  const companyName = customer.isCompany
    ? (usableName(customer.profile?.businessName) ?? usableName(customer.companyName))
    : null;

  return {
    primaryName: customer.isCompany ? companyName : contactName,
    companyName,
    contactName,
  };
}

function usableName(value: string | null | undefined): string | null {
  return value?.trim() || null;
}
