import type { CfbWriter } from '../cfb/cfb-writer.js';

const NAMEID_STORAGE = '__nameid_version1.0';

export const NamedPropertyStreamName = {
  Guid: `${NAMEID_STORAGE}/__substg1.0_00020102`,
  Entry: `${NAMEID_STORAGE}/__substg1.0_00030102`,
  String: `${NAMEID_STORAGE}/__substg1.0_00040102`,
} as const;

export function writeEmptyNamedPropertyMappingStorage(cfb: CfbWriter): void {
  cfb.addStream(NamedPropertyStreamName.Guid, Buffer.alloc(0));
  cfb.addStream(NamedPropertyStreamName.Entry, Buffer.alloc(0));
  cfb.addStream(NamedPropertyStreamName.String, Buffer.alloc(0));
}
