import { RetainedRentalCustomerProfileFactsService } from './retained-rental-customer-profile-facts.service';

describe('RetainedRentalCustomerProfileFactsService', () => {
  const customer = {
    id: 'customer-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    isCompany: false,
    companyName: null,
    profile: {
      fullName: 'Ada Lovelace',
      businessName: null,
      documentNumber: '12345678',
      address: 'Example 123',
      phone: '+54 11 1234 5678',
    },
  };

  function createService(record: typeof customer | null) {
    const findFirst = jest.fn().mockResolvedValue(record);

    return {
      service: new RetainedRentalCustomerProfileFactsService({ client: { v2RentalCustomer: { findFirst } } } as never),
      findFirst,
    };
  }

  it('returns legal facts without filtering the retained customer lifecycle', async () => {
    const { service, findFirst } = createService(customer);

    await expect(
      service.getRetainedRentalCustomerProfileFacts({ tenantId: 'tenant-1', rentalCustomerId: 'customer-1' }),
    ).resolves.toEqual({
      rentalCustomerId: 'customer-1',
      fullName: 'Ada Lovelace',
      documentNumber: '12345678',
      address: 'Example 123',
      phone: '+54 11 1234 5678',
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'customer-1', tenantId: 'tenant-1' },
      }),
    );
    expect(findFirst.mock.calls[0][0].where).not.toHaveProperty('deletedAt');
    expect(findFirst.mock.calls[0][0].where).not.toHaveProperty('isActive');
  });

  it('returns null when the customer is missing or outside the tenant', async () => {
    const { service } = createService(null);

    await expect(
      service.getRetainedRentalCustomerProfileFacts({ tenantId: 'tenant-1', rentalCustomerId: 'foreign-customer' }),
    ).resolves.toBeNull();
  });
});
