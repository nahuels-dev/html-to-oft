export function encodeUnicode(value: string): Buffer {
  return Buffer.from(`${value}\0`, 'utf16le');
}

export function encodeString8(value: string): Buffer {
  return Buffer.from(`${value}\0`, 'latin1');
}

export function encodeInt32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32LE(value, 0);
  return buffer;
}

export function encodeInt16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeInt16LE(value, 0);
  return buffer;
}

export function encodeBoolean(value: boolean): Buffer {
  return encodeInt32(value ? 1 : 0);
}

export function encodeBinary(value: Buffer | Uint8Array): Buffer {
  return Buffer.from(value);
}

export function encodeFiletime(value: Date): Buffer {
  const unixToWindowsEpochMs = 11_644_473_600_000;
  const ticksPerMs = 10_000n;
  const filetime = BigInt(value.getTime() + unixToWindowsEpochMs) * ticksPerMs;
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(filetime, 0);
  return buffer;
}
