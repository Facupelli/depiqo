import { EquipmentLine } from 'src/modules/order/domain/ports/contract-render.port';

export function formatAccessoryText(item: EquipmentLine['includedItems'][number]): string {
  return `x${item.quantity} ${item.name}`;
}
