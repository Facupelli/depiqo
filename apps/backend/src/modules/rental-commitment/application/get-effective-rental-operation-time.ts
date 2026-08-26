export function getEffectiveRentalOperationTime(operationTime: Date, rentalStart: Date): Date {
  return operationTime < rentalStart ? rentalStart : operationTime;
}
