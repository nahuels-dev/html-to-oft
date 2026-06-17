import { describe, expect, it } from 'vitest';
import { createOft } from '../src/create-oft.js';
import { patchOftTemplate } from '../src/patch-oft-template.js';
import { readCfbStream } from '../src/cfb/cfb-reader.js';
import { substgStreamName } from '../src/oxmsg/stream-names.js';
import { PidTag } from '../src/mapi/property-tags.js';
import { MapiType } from '../src/mapi/property-types.js';
import {
  decodePropertiesStream,
} from '../src/oxmsg/properties-stream-writer.js';
import { PROPERTIES_STREAM_NAME } from '../src/oxmsg/stream-names.js';

describe('patchOftTemplate', () => {
  it('replaces known subject, body, and HTML streams', async () => {
    const base = await createOft({
      subject: 'Old',
      html: '<h1>Old</h1>',
      text: 'Old',
    });

    const patched = await patchOftTemplate(base, {
      subject: 'New',
      html: '<h1>New</h1>',
      text: 'New',
    });

    const subject = readCfbStream(patched, substgStreamName(PidTag.Subject, MapiType.PT_UNICODE));
    const body = readCfbStream(patched, substgStreamName(PidTag.Body, MapiType.PT_UNICODE));
    const binaryHtml = readCfbStream(patched, substgStreamName(PidTag.Html, MapiType.PT_BINARY));
    const unicodeHtml = readCfbStream(patched, substgStreamName(PidTag.Html, MapiType.PT_UNICODE));

    expect(subject?.toString('utf16le')).toBe('New\0');
    expect(body?.toString('utf16le')).toBe('New\0');
    expect(binaryHtml?.toString('utf8')).toContain('<h1>New</h1>');
    expect(unicodeHtml).toBeNull();

    const properties = readCfbStream(patched, PROPERTIES_STREAM_NAME);
    const entries = decodePropertiesStream(properties!, 'top-level');
    const subjectEntry = entries.find((entry) => entry.id === PidTag.Subject);
    const bodyEntry = entries.find((entry) => entry.id === PidTag.Body);
    const binaryHtmlEntry = entries.find((entry) => entry.id === PidTag.Html && entry.type === MapiType.PT_BINARY);
    const unicodeHtmlEntry = entries.find((entry) => entry.id === PidTag.Html && entry.type === MapiType.PT_UNICODE);

    expect(subjectEntry?.byteCount).toBe(Buffer.from('New\0', 'utf16le').length);
    expect(bodyEntry?.byteCount).toBe(Buffer.from('New\0', 'utf16le').length);
    expect(binaryHtmlEntry?.byteCount).toBe(binaryHtml?.byteLength);
    expect(unicodeHtmlEntry).toBeUndefined();
  });

  it('rejects empty patch input', async () => {
    const base = await createOft({ html: '<h1>Hello</h1>' });
    await expect(patchOftTemplate(base, {})).rejects.toThrow('at least one field');
  });
});
