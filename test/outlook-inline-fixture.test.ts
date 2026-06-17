import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { listCfbEntries, readCfbStream } from '../src/cfb/cfb-reader.js';
import { PidTag } from '../src/mapi/property-tags.js';
import { MapiType } from '../src/mapi/property-types.js';
import { decodePropertiesStream } from '../src/oxmsg/properties-stream-writer.js';
import { substgStreamName } from '../src/oxmsg/stream-names.js';

const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/outlook-inline-image.oft');
const maybeIt = existsSync(fixturePath) ? it : it.skip;

describe('Outlook Classic inline image fixture', () => {
  maybeIt('matches the inline attachment properties Outlook writes', () => {
    const oft = readFileSync(fixturePath);
    const entries = listCfbEntries(oft).map((entry) => entry.name);
    const attachmentStorages = [...new Set(
      entries
        .filter((name) => name.startsWith('__attach_version1.0_#'))
        .map((name) => name.split('/')[0]),
    )];

    const inlineStorage = attachmentStorages.find((storage) => {
      const properties = readCfbStream(oft, `${storage}/__properties_version1.0`);
      if (!properties) return false;

      const propertyEntries = decodePropertiesStream(properties, 'attachment-or-recipient');
      const byId = new Map(propertyEntries.map((entry) => [entry.id, entry]));
      const contentId = readCfbStream(oft, `${storage}/${substgStreamName(PidTag.AttachContentId, MapiType.PT_UNICODE)}`)
        ?.toString('utf16le')
        .replace(/\0$/, '');

      return (
        byId.get(PidTag.AttachFlags)?.data.readInt32LE() === 0x00000004 &&
        byId.get(PidTag.AttachmentFlags)?.data.readInt32LE() === 0x00000008 &&
        byId.get(PidTag.AttachmentHidden)?.data.readUInt16LE() === 1 &&
        byId.get(PidTag.RenderingPosition)?.data.readInt32LE() === -1 &&
        !!contentId
      );
    });

    expect(inlineStorage).toBeTruthy();
  });
});
