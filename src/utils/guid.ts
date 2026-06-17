import { randomUUID } from 'node:crypto';

export function randomGuid(): string {
  return randomUUID();
}
