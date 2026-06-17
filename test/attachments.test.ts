import { describe, expect, it } from 'vitest';
import { createOft } from '../src/create-oft.js';
import { listCfbEntries, readCfbStream } from '../src/cfb/cfb-reader.js';
import { decodePropertiesStream } from '../src/oxmsg/properties-stream-writer.js';
import { PidTag } from '../src/mapi/property-tags.js';

describe('attachments', () => {
  it('writes initial attachment streams in attachment storage', async () => {
    const oft = await createOft({
      subject: 'Inline',
      html: '<img src="cid:logo">',
      attachments: [
        {
          filename: 'logo.png',
          content: Buffer.from([1, 2, 3]),
          mimeType: 'image/png',
          cid: 'logo',
          inline: true,
        },
      ],
    });

    const names = listCfbEntries(oft).map((entry) => entry.name);
    expect(names).toContain('__attach_version1.0_#00000000/__substg1.0_37010102');
    expect(names).toContain('__attach_version1.0_#00000000/__substg1.0_37020102');
    expect(names).toContain('__attach_version1.0_#00000000/__substg1.0_3704001F');
    expect(names).toContain('__attach_version1.0_#00000000/__substg1.0_3703001F');
    expect(names).toContain('__attach_version1.0_#00000000/__substg1.0_3707001F');
    expect(names).toContain('__attach_version1.0_#00000000/__substg1.0_370E001F');
    expect(names).toContain('__attach_version1.0_#00000000/__substg1.0_3712001F');
    expect(names).not.toContain('__attach_version1.0_#00000000/__substg1.0_3712001E');
    expect(names).not.toContain('__attach_version1.0_#00000000/__substg1.0_3713001F');
    expect(names).toContain('__attach_version1.0_#00000000/__substg1.0_0FF90102');
    expect(names).toContain('__attach_version1.0_#00000000/__properties_version1.0');

    const content = readCfbStream(
      oft,
      '__attach_version1.0_#00000000/__substg1.0_37010102',
    );
    expect(content).toEqual(Buffer.from([1, 2, 3]));

    const properties = readCfbStream(oft, '__attach_version1.0_#00000000/__properties_version1.0');
    const entries = decodePropertiesStream(properties!, 'attachment-or-recipient');
    const entryById = new Map(entries.map((entry) => [entry.id, entry]));

    expect(entryById.get(PidTag.ObjectType)?.data.readInt32LE()).toBe(7);
    expect(entryById.get(PidTag.Access)?.data.readInt32LE()).toBe(2);
    expect(entryById.get(PidTag.AccessLevel)?.data.readInt32LE()).toBe(0);
    expect(entryById.get(PidTag.AttachMethod)?.data.readInt32LE()).toBe(1);
    expect(entryById.get(PidTag.AttachNumber)?.data.readInt32LE()).toBe(0);
    expect(entryById.get(PidTag.AttachSize)?.data.readInt32LE()).toBe(3);
    expect(entryById.get(PidTag.RenderingPosition)?.data.readInt32LE()).toBe(-1);
    expect(entryById.get(PidTag.AttachFlags)?.data.readInt32LE()).toBe(0x00000004);
    expect(entryById.get(PidTag.AttachmentFlags)?.data.readInt32LE()).toBe(0x00000008);
    expect(entryById.get(PidTag.AttachmentHidden)?.data.readUInt16LE()).toBe(1);
    expect(entryById.get(PidTag.StoreSupportMask)?.data.readInt32LE()).toBe(0x00040e79);
    expect(entries.some((entry) => entry.id === PidTag.RecordKey && entry.byteCount === 4)).toBe(
      true,
    );
    expect(entries.filter((entry) => entry.id === PidTag.AttachContentId)).toHaveLength(1);
    expect(entries.some((entry) => entry.id === PidTag.AttachEncoding && entry.byteCount === 0)).toBe(
      true,
    );
    expect(entries.some((entry) => entry.id === PidTag.CreationTime)).toBe(true);
    expect(entries.some((entry) => entry.id === PidTag.LastModificationTime)).toBe(true);
    expect(entries.some((entry) => entry.id === PidTag.AttachDataBinary && entry.byteCount === 3)).toBe(
      true,
    );
  });
});
