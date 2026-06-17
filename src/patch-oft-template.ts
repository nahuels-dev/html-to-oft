import * as CFB from 'cfb';
import { CfbWriter } from './cfb/cfb-writer.js';
import { readCfbContainer } from './cfb/cfb-reader.js';
import { normalizeHtml } from './html/normalize-html.js';
import { PidTag } from './mapi/property-tags.js';
import { MapiType } from './mapi/property-types.js';
import { encodeBinary, encodeUnicode } from './utils/encoding.js';
import { PROPERTIES_STREAM_NAME, substgStreamName } from './oxmsg/stream-names.js';
import { upsertVariableLengthPropertyEntry } from './oxmsg/properties-stream-writer.js';

export interface PatchOftTemplateInput {
  subject?: string;
  html?: string;
  text?: string;
}

function upsertStream(cfb: CFB.CFB$Container, name: string, content: Buffer): void {
  const existing = CFB.find(cfb, name);
  if (existing) {
    existing.content = content;
    existing.size = content.length;
    return;
  }

  CFB.utils.cfb_add(cfb, name, content);
}

export async function patchOftTemplate(
  baseOft: Buffer,
  input: PatchOftTemplateInput,
): Promise<Buffer> {
  if (baseOft.byteLength === 0) {
    throw new Error('patchOftTemplate requires a non-empty baseOft buffer.');
  }

  if (
    input.subject === undefined &&
    input.html === undefined &&
    input.text === undefined
  ) {
    throw new Error('patchOftTemplate requires at least one field to patch.');
  }

  const cfb = readCfbContainer(baseOft);

  if (input.subject !== undefined) {
    const prop = { id: PidTag.Subject, type: MapiType.PT_UNICODE, value: input.subject } as const;
    upsertStream(
      cfb,
      substgStreamName(PidTag.Subject, MapiType.PT_UNICODE),
      encodeUnicode(input.subject),
    );
    upsertVariableLengthPropertyEntry(cfb, PROPERTIES_STREAM_NAME, prop, 'top-level');
  }

  if (input.text !== undefined) {
    const prop = { id: PidTag.Body, type: MapiType.PT_UNICODE, value: input.text } as const;
    upsertStream(cfb, substgStreamName(PidTag.Body, MapiType.PT_UNICODE), encodeUnicode(input.text));
    upsertVariableLengthPropertyEntry(cfb, PROPERTIES_STREAM_NAME, prop, 'top-level');
  }

  if (input.html !== undefined) {
    const normalizedHtml = normalizeHtml(input.html);
    const htmlProp = {
      id: PidTag.Html,
      type: MapiType.PT_BINARY,
      value: Buffer.from(normalizedHtml, 'utf8'),
    } as const;
    upsertStream(
      cfb,
      substgStreamName(PidTag.Html, MapiType.PT_BINARY),
      encodeBinary(htmlProp.value),
    );
    upsertVariableLengthPropertyEntry(cfb, PROPERTIES_STREAM_NAME, htmlProp, 'top-level');
  }

  return new CfbWriter(cfb).write();
}
