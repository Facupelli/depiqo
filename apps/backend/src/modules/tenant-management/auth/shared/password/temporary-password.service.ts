import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*+-=?';
const ALPHABET = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;
const PASSWORD_LENGTH = 20;

@Injectable()
export class TemporaryPasswordService {
  generate(): string {
    const characters = [
      pick(LOWERCASE),
      pick(UPPERCASE),
      pick(DIGITS),
      pick(SYMBOLS),
      ...Array.from({ length: PASSWORD_LENGTH - 4 }, () => pick(ALPHABET)),
    ];

    for (let index = characters.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
    }

    return characters.join('');
  }
}

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}
