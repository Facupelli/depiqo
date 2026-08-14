import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { AggregateRootBase } from 'src/core/domain/aggregate-root.base';

import { RentableItemDefinitionUpdatedDomainEvent } from './events/rentable-item-definition-updated.domain-event';
import {
  CatalogError,
  CatalogInvalidFieldError,
  CatalogRentableItemArchivedError,
  CatalogRentableItemCannotBeActivatedFromStatusError,
  CatalogRentableItemRequirementAlreadyExistsError,
} from './errors/catalog.errors';
import { RentableItemRequirement } from './rentable-item-requirement.entity';

export type RentableItemKind = 'SINGLE' | 'PACKAGE' | 'KIT' | 'BUNDLE';
export type RentableItemStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export const RENTABLE_ITEM_KINDS: readonly RentableItemKind[] = ['SINGLE', 'PACKAGE', 'KIT', 'BUNDLE'];

interface RentableItemProps {
  tenantId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  kind: RentableItemKind;
  status: RentableItemStatus;
  requirements: RentableItemRequirement[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateRentableItemProps {
  id?: string;
  tenantId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  kind: RentableItemKind;
}

export interface CreateRentableItemWithRequirementsProps extends CreateRentableItemProps {
  requirements: Array<{
    equipmentTypeId: string;
    quantityPerItem: number;
  }>;
}

export interface ReconstituteRentableItemProps extends Omit<RentableItemProps, 'requirements'> {
  id: string;
  requirements?: RentableItemRequirement[];
}

export interface UpdateRentableItemDefinitionProps {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  kind?: RentableItemKind;
  requirements?: Array<{
    equipmentTypeId: string;
    quantityPerItem: number;
  }>;
}

export class RentableItem extends AggregateRootBase {
  private constructor(
    public readonly id: string,
    private readonly props: RentableItemProps,
  ) {
    super();
  }

  static create(props: CreateRentableItemProps): Result<RentableItem, CatalogError> {
    const normalized = this.normalizeCreateProps(props);
    if (normalized.isErr()) {
      return err(normalized.error);
    }

    return ok(
      new RentableItem(props.id ?? randomUUID(), {
        ...normalized.value,
        status: 'DRAFT',
        requirements: [],
      }),
    );
  }

  static createWithRequirements(props: CreateRentableItemWithRequirementsProps): Result<RentableItem, CatalogError> {
    const requirementsValidation = this.validateCreateRequirements(props);
    if (requirementsValidation.isErr()) {
      return err(requirementsValidation.error);
    }

    const rentableItemResult = this.create(props);
    if (rentableItemResult.isErr()) {
      return err(rentableItemResult.error);
    }

    const rentableItem = rentableItemResult.value;

    for (const requirement of requirementsValidation.value) {
      const requirementResult = rentableItem.addRequirement(requirement);
      if (requirementResult.isErr()) {
        return err(requirementResult.error);
      }
    }

    return ok(rentableItem);
  }

  static reconstitute(props: ReconstituteRentableItemProps): RentableItem {
    return new RentableItem(props.id, {
      ...props,
      requirements: props.requirements ?? [],
    });
  }

  activate(): Result<void, CatalogError> {
    if (this.props.status !== 'DRAFT') {
      return err(new CatalogRentableItemCannotBeActivatedFromStatusError(this.id, this.props.status));
    }

    this.props.status = 'ACTIVE';
    return ok(undefined);
  }

  updateDefinition(input: UpdateRentableItemDefinitionProps): Result<void, CatalogError> {
    if (this.props.status === 'ARCHIVED') {
      return err(new CatalogRentableItemArchivedError(this.id));
    }

    const kind = input.kind ?? this.props.kind;
    const candidateRequirements =
      input.requirements ??
      this.props.requirements.map((requirement) => ({
        equipmentTypeId: requirement.equipmentTypeId,
        quantityPerItem: requirement.quantityPerItem,
      }));
    const requirementsValidation = RentableItem.validateRequirements(kind, candidateRequirements);
    if (requirementsValidation.isErr()) {
      return err(requirementsValidation.error);
    }

    const name = input.name === undefined ? this.props.name : input.name.trim();
    if (!name) {
      return err(new CatalogInvalidFieldError('name', 'name is required'));
    }

    const replacementRequirements: RentableItemRequirement[] = [];
    if (input.requirements !== undefined) {
      for (const requirement of requirementsValidation.value) {
        const result = RentableItemRequirement.create({
          tenantId: this.tenantId,
          rentableItemId: this.id,
          equipmentTypeId: requirement.equipmentTypeId,
          quantityPerItem: requirement.quantityPerItem,
        });
        if (result.isErr()) {
          return err(result.error);
        }
        replacementRequirements.push(result.value);
      }
    }

    this.props.name = name;
    if (input.description !== undefined) this.props.description = normalizeOptionalString(input.description);
    if (input.imageUrl !== undefined) this.props.imageUrl = normalizeOptionalString(input.imageUrl);
    if (input.categoryId !== undefined) this.props.categoryId = normalizeOptionalString(input.categoryId);
    this.props.kind = kind;
    if (input.requirements !== undefined) this.props.requirements = replacementRequirements;
    this.recordDomainEvent(new RentableItemDefinitionUpdatedDomainEvent(this.id, this.tenantId));

    return ok(undefined);
  }

  addRequirement(input: {
    equipmentTypeId: string;
    quantityPerItem: number;
  }): Result<RentableItemRequirement, CatalogError> {
    const equipmentTypeId = input.equipmentTypeId?.trim();
    if (this.props.requirements.some((requirement) => requirement.equipmentTypeId === equipmentTypeId)) {
      return err(new CatalogRentableItemRequirementAlreadyExistsError(this.id, equipmentTypeId));
    }

    const requirementResult = RentableItemRequirement.create({
      tenantId: this.tenantId,
      rentableItemId: this.id,
      equipmentTypeId: input.equipmentTypeId,
      quantityPerItem: input.quantityPerItem,
    });

    if (requirementResult.isErr()) {
      return err(requirementResult.error);
    }

    this.props.requirements.push(requirementResult.value);
    return ok(requirementResult.value);
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null | undefined {
    return this.props.description;
  }

  get imageUrl(): string | null | undefined {
    return this.props.imageUrl;
  }

  get categoryId(): string | null | undefined {
    return this.props.categoryId;
  }

  get kind(): RentableItemKind {
    return this.props.kind;
  }

  get status(): RentableItemStatus {
    return this.props.status;
  }

  get requirements(): readonly RentableItemRequirement[] {
    return this.props.requirements;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  private static normalizeCreateProps(
    props: CreateRentableItemProps,
  ): Result<Omit<RentableItemProps, 'status' | 'requirements'>, CatalogError> {
    const tenantId = props.tenantId?.trim();
    if (!tenantId) {
      return err(new CatalogInvalidFieldError('tenantId', 'tenantId is required'));
    }

    const name = props.name?.trim();
    if (!name) {
      return err(new CatalogInvalidFieldError('name', 'name is required'));
    }

    if (!RENTABLE_ITEM_KINDS.includes(props.kind)) {
      return err(new CatalogInvalidFieldError('kind', `kind "${props.kind}" is not supported`));
    }

    return ok({
      tenantId,
      name,
      description: normalizeOptionalString(props.description),
      imageUrl: normalizeOptionalString(props.imageUrl),
      categoryId: normalizeOptionalString(props.categoryId),
      kind: props.kind,
    });
  }

  private static validateCreateRequirements(
    props: CreateRentableItemWithRequirementsProps,
  ): Result<Array<{ equipmentTypeId: string; quantityPerItem: number }>, CatalogError> {
    return this.validateRequirements(props.kind, props.requirements);
  }

  private static validateRequirements(
    kind: RentableItemKind,
    requirements: Array<{ equipmentTypeId: string; quantityPerItem: number }>,
  ): Result<Array<{ equipmentTypeId: string; quantityPerItem: number }>, CatalogError> {
    if (!requirements?.length) {
      return err(new CatalogInvalidFieldError('requirements', 'at least one requirement is required'));
    }

    if (kind === 'SINGLE' && requirements.length !== 1) {
      return err(
        new CatalogInvalidFieldError('requirements', 'SINGLE rentable items must have exactly one requirement'),
      );
    }

    const normalizedRequirements: Array<{ equipmentTypeId: string; quantityPerItem: number }> = [];
    const seenEquipmentTypeIds = new Set<string>();

    for (const requirement of requirements) {
      const equipmentTypeId = requirement.equipmentTypeId?.trim();
      if (!equipmentTypeId) {
        return err(new CatalogInvalidFieldError('requirements.equipmentTypeId', 'equipmentTypeId is required'));
      }
      if (!Number.isInteger(requirement.quantityPerItem) || requirement.quantityPerItem <= 0) {
        return err(
          new CatalogInvalidFieldError('requirements.quantityPerItem', 'quantityPerItem must be a positive integer'),
        );
      }
      if (seenEquipmentTypeIds.has(equipmentTypeId)) {
        return err(
          new CatalogInvalidFieldError(
            'requirements.equipmentTypeId',
            `equipmentTypeId "${equipmentTypeId}" was provided more than once`,
          ),
        );
      }

      seenEquipmentTypeIds.add(equipmentTypeId);
      normalizedRequirements.push({ equipmentTypeId, quantityPerItem: requirement.quantityPerItem });
    }

    return ok(normalizedRequirements);
  }
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
