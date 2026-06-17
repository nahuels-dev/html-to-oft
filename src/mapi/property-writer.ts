import {
  encodeBinary,
  encodeBoolean,
  encodeFiletime,
  encodeInt16,
  encodeInt32,
  encodeString8,
  encodeUnicode,
} from '../utils/encoding.js';
import { MapiProperty } from './property.js';
import { MapiType } from './property-types.js';

export function encodePropertyValue(prop: MapiProperty): Buffer {
  switch (prop.type) {
    case MapiType.PT_STRING8:
      return encodeString8(prop.value);
    case MapiType.PT_UNICODE:
      return encodeUnicode(prop.value);
    case MapiType.PT_BINARY:
      return encodeBinary(prop.value);
    case MapiType.PT_SHORT:
      return encodeInt16(prop.value);
    case MapiType.PT_LONG:
      return encodeInt32(prop.value);
    case MapiType.PT_BOOLEAN:
      return encodeBoolean(prop.value);
    case MapiType.PT_SYSTIME:
      return prop.value instanceof Date ? encodeFiletime(prop.value) : encodeBinary(prop.value);
    default: {
      const neverProp: never = prop;
      throw new Error(`Unsupported MAPI property type: ${JSON.stringify(neverProp)}`);
    }
  }
}

export function propertyTag(id: number, type: number): number {
  return ((id & 0xffff) << 16) | (type & 0xffff);
}

export function isVariableLengthProperty(prop: { type: number }): boolean {
  return (
    prop.type === MapiType.PT_UNICODE ||
    prop.type === MapiType.PT_STRING8 ||
    prop.type === MapiType.PT_BINARY
  );
}
