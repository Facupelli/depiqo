import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import { CreatePackageCommand } from './create-package.command';
import { toCreatePackageProblem } from './create-package-http-error.mapper';
import { CreatePackageServiceResult } from './create-package.handler';
import { CreatePackageRequestDto } from './create-package.request.dto';
import { CreatePackageResponseDto } from './create-package.response.dto';

@Controller('v2/offering-setup/packages')
export class CreatePackageHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePackageRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreatePackageResponseDto> {
    const result = await this.commandBus.execute<CreatePackageCommand, CreatePackageServiceResult>(
      new CreatePackageCommand({
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        branchIds: dto.branchIds,
        requirements: dto.requirements,
      }),
    );

    if (result.isErr()) {
      throw toCreatePackageProblem(result.error);
    }

    return {
      rentableItemId: result.value.rentableItemId,
      rentalOfferIds: result.value.rentalOfferIds,
    };
  }
}
