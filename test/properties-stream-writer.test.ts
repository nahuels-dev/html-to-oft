import { describe, expect, it } from 'vitest';
import { createOft } from '../src/create-oft.js';
import { readCfbStream } from '../src/cfb/cfb-reader.js';
import { PidTag } from '../src/mapi/property-tags.js';
import { MapiType } from '../src/mapi/property-types.js';
import {
  createPropertiesStream,
  decodePropertiesStream,
} from '../src/oxmsg/properties-stream-writer.js';
import { PROPERTIES_STREAM_NAME } from '../src/oxmsg/stream-names.js';

describe('properties stream writer', () => {
  it('writes a top-level MS-OXMSG property stream header and 16-byte entries', () => {
    const stream = createPropertiesStream(
      [
        { id: PidTag.Subject, type: MapiType.PT_UNICODE, value: 'Hi' },
        { id: PidTag.Importance, type: MapiType.PT_LONG, value: 1 },
        { id: PidTag.HasAttach, type: MapiType.PT_BOOLEAN, value: true },
      ],
      { kind: 'top-level', nextAttachmentId: 2, attachmentCount: 2 },
    );

    expect(stream.length).toBe(32 + 3 * 16);
    expect(stream.readUInt32LE(12)).toBe(2);
    expect(stream.readUInt32LE(20)).toBe(2);

    const entries = decodePropertiesStream(stream, 'top-level');
    expect(entries[0]).toMatchObject({
      propertyTag: 0x0037001f,
      id: PidTag.Subject,
      type: MapiType.PT_UNICODE,
      byteCount: 6,
    });
    expect(entries[1].data.readInt32LE(0)).toBe(1);
    expect(entries[2].data.readUInt16LE(0)).toBe(1);
  });

  it('createOft writes a binary properties stream instead of a placeholder document', async () => {
    const oft = await createOft({ subject: 'Hi', html: '<h1>Hello</h1>' });
    const stream = readCfbStream(oft, PROPERTIES_STREAM_NAME);

    expect(stream).not.toBeNull();
    expect(stream?.subarray(0, 1).toString('utf8')).not.toBe('{');

    const entries = decodePropertiesStream(stream!, 'top-level');
    expect(entries.some((entry) => entry.id === PidTag.StoreSupportMask)).toBe(true);
    expect(entries.some((entry) => entry.id === PidTag.Subject)).toBe(true);
    expect(entries.some((entry) => entry.id === PidTag.Html)).toBe(true);
  });
});
