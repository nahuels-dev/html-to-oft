export const MapiType = {
  PT_SHORT: 0x0002,
  PT_LONG: 0x0003,
  PT_BOOLEAN: 0x000b,
  PT_SYSTIME: 0x0040,
  PT_STRING8: 0x001e,
  PT_UNICODE: 0x001f,
  PT_BINARY: 0x0102,
} as const;

export type MapiTypeValue = (typeof MapiType)[keyof typeof MapiType];
