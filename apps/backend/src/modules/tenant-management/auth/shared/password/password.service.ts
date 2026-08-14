import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { V2PasswordAlgorithm } from 'src/generated/prisma/enums';

@Injectable()
export class PasswordService {
  async hashPassword(password: string): Promise<{
    hash: string;
    algorithm: V2PasswordAlgorithm;
  }> {
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
      hashLength: 32,
    });

    return {
      hash,
      algorithm: V2PasswordAlgorithm.ARGON2ID,
    };
  }

  async verifyPassword(input: { password: string; hash: string; algorithm: V2PasswordAlgorithm }): Promise<boolean> {
    switch (input.algorithm) {
      case V2PasswordAlgorithm.ARGON2ID:
        return argon2.verify(input.hash, input.password);

      case V2PasswordAlgorithm.BCRYPT:
        throw new InternalServerErrorException('Bcrypt verification is not implemented yet.');

      default:
        throw new InternalServerErrorException('Unsupported password algorithm.');
    }
  }

  needsRehash(input: { hash: string; algorithm: V2PasswordAlgorithm }): boolean {
    return input.algorithm !== V2PasswordAlgorithm.ARGON2ID;
  }
}
