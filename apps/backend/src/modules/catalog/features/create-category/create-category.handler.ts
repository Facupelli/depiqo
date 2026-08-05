import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { Prisma } from 'src/generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';

import { CreateCategoryCommand } from './create-category.command';
import { CreateCategoryError, createCategoryError } from './create-category.errors';

export interface CreateCategoryResult {
  id: string;
}

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler implements ICommandHandler<
  CreateCategoryCommand,
  Result<CreateCategoryResult, CreateCategoryError>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateCategoryCommand): Promise<Result<CreateCategoryResult, CreateCategoryError>> {
    const name = command.name.trim();
    const providedSlug = command.slug?.trim().toLowerCase();
    const slug = providedSlug ?? (await this.createAvailableSlug(command.tenantId, this.slugify(name)));
    const context = {
      useCase: 'CreateCategory',
      tenantId: command.tenantId,
      slug,
    };

    if (providedSlug) {
      const existingCategory = await this.prisma.client.v2RentableItemCategory.findFirst({
        where: { tenantId: command.tenantId, slug: providedSlug, deletedAt: null },
        select: { id: true },
      });

      if (existingCategory) {
        return err(
          createCategoryError(
            'catalog.category_slug_already_in_use',
            'A category with the requested slug already exists.',
            undefined,
            context,
          ),
        );
      }
    }

    try {
      const category = await this.prisma.client.v2RentableItemCategory.create({
        data: {
          tenantId: command.tenantId,
          name,
          slug,
          sortOrder: command.sortOrder,
          isActive: command.isActive,
        },
        select: { id: true },
      });

      return ok({ id: category.id });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return err(
          createCategoryError(
            'catalog.category_slug_already_in_use',
            'A category with the requested slug already exists.',
            error,
            context,
          ),
        );
      }

      throw error;
    }
  }

  private async createAvailableSlug(tenantId: string, baseSlug: string): Promise<string> {
    const existingCategories = await this.prisma.client.v2RentableItemCategory.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [{ slug: baseSlug }, { slug: { startsWith: `${baseSlug}-` } }],
      },
      select: { slug: true },
    });

    const existingSlugs = new Set(existingCategories.map((category) => category.slug));
    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let suffix = 2;
    while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
      suffix += 1;
    }

    return `${baseSlug}-${suffix}`;
  }

  private slugify(value: string): string {
    const slug = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'category';
  }
}
