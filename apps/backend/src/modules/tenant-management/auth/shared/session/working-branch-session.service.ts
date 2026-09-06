import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { WorkingBranchSessionError, workingBranchSessionError } from './working-branch-session.errors';

@Injectable()
export class WorkingBranchSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(req: Request, tenantId: string): Promise<string | null> {
    const workingBranchId = req.session.workingBranchId ?? null;
    if (workingBranchId === null) return null;

    if (await this.isValid(tenantId, workingBranchId)) return workingBranchId;

    req.session.workingBranchId = null;
    await this.save(req);
    return null;
  }

  async update(
    req: Request,
    tenantId: string,
    workingBranchId: string | null,
  ): Promise<Result<{ workingBranchId: string | null }, WorkingBranchSessionError>> {
    if (workingBranchId !== null && !(await this.isValid(tenantId, workingBranchId))) {
      return err(
        workingBranchSessionError(
          'tenant_management.branch_not_found',
          `Branch "${workingBranchId}" was not found.`,
          undefined,
          { useCase: 'UpdateWorkingBranch', tenantId, branchId: workingBranchId },
        ),
      );
    }

    req.session.workingBranchId = workingBranchId;
    await this.save(req);
    return ok({ workingBranchId });
  }

  private async isValid(tenantId: string, branchId: string): Promise<boolean> {
    const branch = await this.prisma.client.v2Branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
      select: { id: true },
    });

    return branch !== null;
  }

  private save(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.save((error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
}
