import { DomainException } from 'src/core/exceptions/domain.exception';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export class JsonSnapshot {
  private readonly snapshotValue: JsonValue;

  constructor(value: JsonValue = {}) {
    if (value === undefined) {
      throw new DomainException('JsonSnapshot value cannot be undefined.');
    }

    this.snapshotValue = structuredClone(value);
  }

  get value(): JsonValue {
    return structuredClone(this.snapshotValue);
  }

  equals(other: JsonSnapshot): boolean {
    return JSON.stringify(this.snapshotValue) === JSON.stringify(other.snapshotValue);
  }

  toJSON(): JsonValue {
    return structuredClone(this.snapshotValue);
  }

  static empty(): JsonSnapshot {
    return new JsonSnapshot({});
  }
}

export class PriceSnapshot extends JsonSnapshot {}
export class BookingSnapshot extends JsonSnapshot {}
