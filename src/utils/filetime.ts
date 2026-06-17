const WINDOWS_TICK = 10_000;
const SEC_TO_UNIX_EPOCH = 11_644_473_600;

export function dateToFiletime(date: Date): Buffer {
  const filetime = BigInt(date.getTime() + SEC_TO_UNIX_EPOCH * 1000) * BigInt(WINDOWS_TICK);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(filetime, 0);
  return buffer;
}
