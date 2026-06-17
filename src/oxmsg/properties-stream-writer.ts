import * as CFB from 'cfb';
import { CfbWriter } from '../cfb/cfb-writer.js';
import type { MapiProperty } from '../mapi/property.js';
import { encodePropertyValue, isVariableLengthProperty, propertyTag } from '../mapi/property-writer.js';
import { MapiType } from '../mapi/property-types.js';
import { PROPERTIES_STREAM_NAME, substgStreamName } from './stream-names.js';

export const PropertyFlags = {
  Mandatory: 0x00000001,
  Readable: 0x00000002,
  Writable: 0x00000004,
} as const;

export type PropertiesStreamKind = 'top-level' | 'embedded-message' | 'attachment-or-recipient';

export interface PropertiesStreamOptions {
  kind: PropertiesStreamKind;
  nextRecipientId?: number;
  nextAttachmentId?: number;
  recipientCount?: number;
  attachmentCount?: number;
}

export interface DecodedPropertyStreamEntry {
  propertyTag: number;
  id: number;
  type: number;
  flags: number;
  data: Buffer;
  byteCount?: number;
}

function createHeader(options: PropertiesStreamOptions): Buffer {
  switch (options.kind) {
    case 'top-level': {
      const header = Buffer.alloc(32);
      header.writeUInt32LE(options.nextRecipientId ?? 0, 8);
      header.writeUInt32LE(options.nextAttachmentId ?? 0, 12);
      header.writeUInt32LE(options.recipientCount ?? 0, 16);
      header.writeUInt32LE(options.attachmentCount ?? 0, 20);
      return header;
    }
    case 'embedded-message': {
      const header = Buffer.alloc(24);
      header.writeUInt32LE(options.nextRecipientId ?? 0, 8);
      header.writeUInt32LE(options.nextAttachmentId ?? 0, 12);
      header.writeUInt32LE(options.recipientCount ?? 0, 16);
      header.writeUInt32LE(options.attachmentCount ?? 0, 20);
      return header;
    }
    case 'attachment-or-recipient':
      return Buffer.alloc(8);
    default: {
      const neverOptions: never = options.kind;
      throw new Error(`Unsupported property stream kind: ${neverOptions}`);
    }
  }
}

function headerSizeForKind(kind: PropertiesStreamKind): number {
  if (kind === 'top-level') return 32;
  if (kind === 'embedded-message') return 24;
  return 8;
}

function encodeFixedPropertyEntryValue(prop: MapiProperty): Buffer {
  const value = Buffer.alloc(8);

  switch (prop.type) {
    case MapiType.PT_SHORT:
      value.writeInt16LE(prop.value, 0);
      break;
    case MapiType.PT_LONG:
      value.writeInt32LE(prop.value, 0);
      break;
    case MapiType.PT_BOOLEAN:
      value.writeUInt16LE(prop.value ? 1 : 0, 0);
      break;
    case MapiType.PT_SYSTIME:
      encodePropertyValue(prop).copy(value, 0, 0, 8);
      break;
    default:
      throw new Error(`Property 0x${prop.id.toString(16)} is not fixed-length.`);
  }

  return value;
}

function encodePropertyStreamEntry(prop: MapiProperty): Buffer {
  const entry = Buffer.alloc(16);
  const value = encodePropertyValue(prop);

  entry.writeUInt32LE(propertyTag(prop.id, prop.type), 0);
  entry.writeUInt32LE(PropertyFlags.Readable | PropertyFlags.Writable, 4);

  if (isVariableLengthProperty(prop)) {
    entry.writeUInt32LE(value.length, 8);
    entry.writeUInt32LE(0, 12);
  } else {
    encodeFixedPropertyEntryValue(prop).copy(entry, 8);
  }

  return entry;
}

export function createPropertiesStream(
  props: MapiProperty[],
  options: PropertiesStreamOptions,
): Buffer {
  const header = createHeader(options);
  const entries = props.map(encodePropertyStreamEntry);
  return Buffer.concat([header, ...entries]);
}

export function writeVariablePropertyStreams(
  cfb: CfbWriter,
  props: MapiProperty[],
  basePath = '',
): void {
  for (const prop of props) {
    if (!isVariableLengthProperty(prop)) continue;
    const streamPath = [basePath, substgStreamName(prop.id, prop.type)].filter(Boolean).join('/');
    cfb.addStream(streamPath, encodePropertyValue(prop));
  }
}

export function decodePropertiesStream(
  stream: Buffer,
  kind: PropertiesStreamKind,
): DecodedPropertyStreamEntry[] {
  const headerSize = headerSizeForKind(kind);
  if (stream.length < headerSize || (stream.length - headerSize) % 16 !== 0) {
    throw new Error('Invalid MS-OXMSG properties stream size.');
  }

  const entries: DecodedPropertyStreamEntry[] = [];
  for (let offset = headerSize; offset < stream.length; offset += 16) {
    const tag = stream.readUInt32LE(offset);
    const type = tag & 0xffff;
    const id = (tag >>> 16) & 0xffff;
    const data = stream.subarray(offset + 8, offset + 16);
    const variableLength =
      type === MapiType.PT_UNICODE || type === MapiType.PT_STRING8 || type === MapiType.PT_BINARY;

    entries.push({
      propertyTag: tag,
      id,
      type,
      flags: stream.readUInt32LE(offset + 4),
      data: Buffer.from(data),
      byteCount: variableLength ? stream.readUInt32LE(offset + 8) : undefined,
    });
  }

  return entries;
}

export function upsertVariableLengthPropertyEntry(
  cfb: CFB.CFB$Container,
  streamPath: string,
  prop: MapiProperty,
  kind: PropertiesStreamKind,
): void {
  if (!isVariableLengthProperty(prop)) {
    throw new Error('Only variable-length properties can be upserted with this helper.');
  }

  const existing = CFB.find(cfb, streamPath);
  const valueLength = encodePropertyValue(prop).length;
  const newEntry = encodePropertyStreamEntry(prop);

  if (!existing?.content) {
    const stream = createPropertiesStream([prop], { kind });
    CFB.utils.cfb_add(cfb, streamPath, stream);
    return;
  }

  const stream = Buffer.from(existing.content);
  const headerSize = headerSizeForKind(kind);
  let found = false;

  for (let offset = headerSize; offset <= stream.length - 16; offset += 16) {
    const tag = stream.readUInt32LE(offset);
    if (tag !== propertyTag(prop.id, prop.type)) continue;
    stream.writeUInt32LE(valueLength, offset + 8);
    stream.writeUInt32LE(0, offset + 12);
    found = true;
    break;
  }

  const updated = found ? stream : Buffer.concat([stream, newEntry]);
  existing.content = updated;
  existing.size = updated.length;
}

export function writePropertiesStream(
  cfb: CfbWriter,
  props: MapiProperty[],
  options: PropertiesStreamOptions,
  basePath = '',
): void {
  const streamPath = [basePath, PROPERTIES_STREAM_NAME].filter(Boolean).join('/');
  cfb.addStream(streamPath, createPropertiesStream(props, options));
}
