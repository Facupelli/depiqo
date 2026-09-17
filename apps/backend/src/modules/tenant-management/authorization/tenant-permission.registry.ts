import {
  TenantPermission,
  TenantPermissionSchema,
  type TenantPermission as TenantPermissionId,
} from '@repo/api-contracts';

export const TenantPermissionGroup = {
  Rentals: 'Alquileres',
  Contracts: 'Contratos',
  Products: 'Productos',
  Inventory: 'Inventario',
  Pricing: 'Precios',
  Customers: 'Clientes',
  BusinessSettings: 'Configuración',
  Team: 'Equipo',
} as const;

export type TenantPermissionGroup = (typeof TenantPermissionGroup)[keyof typeof TenantPermissionGroup];

export interface TenantPermissionMetadata {
  readonly id: TenantPermissionId;
  readonly group: TenantPermissionGroup;
  readonly label: string;
  readonly description: string;
}

const metadataByPermission = {
  [TenantPermission.RentalsRead]: permission(
    TenantPermission.RentalsRead,
    TenantPermissionGroup.Rentals,
    'Ver alquileres',
    'Permite consultar propuestas, solicitudes y alquileres confirmados.',
  ),
  [TenantPermission.RentalsProposalsManage]: permission(
    TenantPermission.RentalsProposalsManage,
    TenantPermissionGroup.Rentals,
    'Gestionar propuestas',
    'Permite crear y editar propuestas y solicitudes de clientes antes de confirmarlas.',
  ),
  [TenantPermission.RentalsConfirm]: permission(
    TenantPermission.RentalsConfirm,
    TenantPermissionGroup.Rentals,
    'Confirmar alquileres',
    'Permite confirmar propuestas y solicitudes, reservando los equipos y precios aceptados.',
  ),
  [TenantPermission.RentalsConfirmedManage]: permission(
    TenantPermission.RentalsConfirmedManage,
    TenantPermissionGroup.Rentals,
    'Gestionar alquileres confirmados',
    'Permite modificar los detalles de un alquiler después de su confirmación.',
  ),
  [TenantPermission.RentalsFulfillmentManage]: permission(
    TenantPermission.RentalsFulfillmentManage,
    TenantPermissionGroup.Rentals,
    'Gestionar preparación y entrega',
    'Permite preparar los equipos, reemplazar equipos asignados y gestionar accesorios antes de la entrega.',
  ),
  [TenantPermission.RentalsCancel]: permission(
    TenantPermission.RentalsCancel,
    TenantPermissionGroup.Rentals,
    'Cancelar alquileres',
    'Permite cancelar propuestas, solicitudes y alquileres confirmados.',
  ),
  [TenantPermission.RentalsPriceAdjustmentManage]: permission(
    TenantPermission.RentalsPriceAdjustmentManage,
    TenantPermissionGroup.Rentals,
    'Gestionar ajustes de precio',
    'Permite aplicar y modificar ajustes manuales de precio en los alquileres.',
  ),
  [TenantPermission.ContractsRead]: permission(
    TenantPermission.ContractsRead,
    TenantPermissionGroup.Contracts,
    'Ver contratos',
    'Permite consultar contratos de alquiler y el estado de sus firmas.',
  ),
  [TenantPermission.ContractsGenerate]: permission(
    TenantPermission.ContractsGenerate,
    TenantPermissionGroup.Contracts,
    'Generar documentos',
    'Permite generar contratos de alquiler y documentos relacionados.',
  ),
  [TenantPermission.ContractsSigningSend]: permission(
    TenantPermission.ContractsSigningSend,
    TenantPermissionGroup.Contracts,
    'Enviar contratos para firma',
    'Permite enviar invitaciones a clientes para que firmen contratos de alquiler.',
  ),
  [TenantPermission.ProductsRead]: permission(
    TenantPermission.ProductsRead,
    TenantPermissionGroup.Products,
    'Ver productos',
    'Permite consultar productos, paquetes y sus detalles de alquiler.',
  ),
  [TenantPermission.ProductsManage]: permission(
    TenantPermission.ProductsManage,
    TenantPermissionGroup.Products,
    'Gestionar productos',
    'Permite crear, editar y archivar productos y paquetes, sin modificar precios ni disponibilidad.',
  ),
  [TenantPermission.ProductsAvailabilityManage]: permission(
    TenantPermission.ProductsAvailabilityManage,
    TenantPermissionGroup.Products,
    'Gestionar disponibilidad',
    'Permite definir por sucursal la disponibilidad, visibilidad y posibilidad de alquiler de los productos.',
  ),
  [TenantPermission.InventoryRead]: permission(
    TenantPermission.InventoryRead,
    TenantPermissionGroup.Inventory,
    'Ver inventario',
    'Permite consultar equipos, unidades individuales y su estado en el inventario.',
  ),
  [TenantPermission.InventoryManage]: permission(
    TenantPermission.InventoryManage,
    TenantPermissionGroup.Inventory,
    'Gestionar inventario',
    'Permite agregar, editar, activar, desactivar y retirar unidades del inventario.',
  ),
  [TenantPermission.InventoryOwnershipManage]: permission(
    TenantPermission.InventoryOwnershipManage,
    TenantPermissionGroup.Inventory,
    'Gestionar propietarios',
    'Permite gestionar propietarios de equipos, asignaciones de propiedad y acuerdos con propietarios.',
  ),
  [TenantPermission.PricingRead]: permission(
    TenantPermission.PricingRead,
    TenantPermissionGroup.Pricing,
    'Ver precios',
    'Permite consultar tarifas, promociones y precios de productos.',
  ),
  [TenantPermission.PricingManage]: permission(
    TenantPermission.PricingManage,
    TenantPermissionGroup.Pricing,
    'Gestionar precios',
    'Permite crear y modificar tarifas, promociones y precios de productos.',
  ),
  [TenantPermission.CustomersRead]: permission(
    TenantPermission.CustomersRead,
    TenantPermissionGroup.Customers,
    'Ver clientes',
    'Permite consultar perfiles de clientes y sus datos de contacto.',
  ),
  [TenantPermission.CustomersOnboardingManage]: permission(
    TenantPermission.CustomersOnboardingManage,
    TenantPermissionGroup.Customers,
    'Gestionar altas de clientes',
    'Permite revisar, aprobar y rechazar solicitudes de registro de clientes.',
  ),
  [TenantPermission.BranchesManage]: permission(
    TenantPermission.BranchesManage,
    TenantPermissionGroup.BusinessSettings,
    'Gestionar sucursales',
    'Permite crear y modificar sucursales, ubicaciones y horarios de atención.',
  ),
  [TenantPermission.TenantSettingsManage]: permission(
    TenantPermission.TenantSettingsManage,
    TenantPermissionGroup.BusinessSettings,
    'Gestionar configuración',
    'Permite modificar la configuración general de operaciones y notificaciones del negocio.',
  ),
  [TenantPermission.TenantStorefrontManage]: permission(
    TenantPermission.TenantStorefrontManage,
    TenantPermissionGroup.BusinessSettings,
    'Gestionar tienda',
    'Permite modificar la identidad visual, los dominios y la presentación pública de la tienda.',
  ),
  [TenantPermission.TenantContractSignerManage]: permission(
    TenantPermission.TenantContractSignerManage,
    TenantPermissionGroup.BusinessSettings,
    'Gestionar firmante de contratos',
    'Permite seleccionar y cambiar al representante del negocio que figura en los contratos.',
  ),
  [TenantPermission.TeamRead]: permission(
    TenantPermission.TeamRead,
    TenantPermissionGroup.Team,
    'Ver equipo',
    'Permite consultar integrantes, roles y permisos asignados.',
  ),
  [TenantPermission.TeamManage]: permission(
    TenantPermission.TeamManage,
    TenantPermissionGroup.Team,
    'Gestionar equipo',
    'Permite agregar integrantes, cambiar roles, suspender accesos, restablecer contraseñas y gestionar roles personalizados.',
  ),
} as const satisfies Record<TenantPermissionId, TenantPermissionMetadata>;

export const TENANT_PERMISSION_REGISTRY: readonly TenantPermissionMetadata[] = Object.freeze(
  Object.values(metadataByPermission),
);

export const ALL_TENANT_PERMISSIONS: readonly TenantPermissionId[] = Object.freeze(
  TENANT_PERMISSION_REGISTRY.map(({ id }) => id),
);

export const DEFAULT_MEMBER_TENANT_PERMISSIONS: readonly TenantPermissionId[] = Object.freeze(
  TENANT_PERMISSION_REGISTRY.filter(({ group }) => group !== TenantPermissionGroup.Team).map(({ id }) => id),
);

export function getTenantPermissionMetadata(permissionId: TenantPermissionId): TenantPermissionMetadata {
  return metadataByPermission[permissionId];
}

export function isTenantPermission(value: string): value is TenantPermissionId {
  return TenantPermissionSchema.safeParse(value).success;
}

export function parseTenantPermission(value: string): TenantPermissionId {
  const result = TenantPermissionSchema.safeParse(value);
  if (!result.success) {
    throw new TypeError(`Unknown tenant permission: ${value}`);
  }

  return result.data;
}

export function assertTenantPermission(value: string): asserts value is TenantPermissionId {
  parseTenantPermission(value);
}

function permission(
  id: TenantPermissionId,
  group: TenantPermissionGroup,
  label: string,
  description: string,
): Readonly<TenantPermissionMetadata> {
  return Object.freeze({ id, group, label, description });
}
