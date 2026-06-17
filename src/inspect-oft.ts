import { listCfbEntries, type CfbEntryInfo } from './cfb/cfb-reader.js';
import { PidTag } from './mapi/property-tags.js';
import { MapiType } from './mapi/property-types.js';
import { PROPERTIES_STREAM_NAME, substgStreamName } from './oxmsg/stream-names.js';

export interface InspectOftResult {
  entries: CfbEntryInfo[];
  hasSubject: boolean;
  hasHtml: boolean;
  hasBody: boolean;
  hasPropertiesStream: boolean;
  hasNamedPropertyMapping: boolean;
  recipientCount: number;
  attachmentCount: number;
}

function hasEntry(entries: CfbEntryInfo[], name: string): boolean {
  return entries.some((entry) => entry.name === name || entry.name.endsWith(`/${name}`));
}

export function inspectOft(buffer: Buffer): InspectOftResult {
  const entries = listCfbEntries(buffer);
  const recipientStorages = new Set<string>();
  const attachmentStorages = new Set<string>();

  for (const entry of entries) {
    const [storage] = entry.name.split('/');
    if (storage.startsWith('__recip_version1.0_#')) recipientStorages.add(storage);
    if (storage.startsWith('__attach_version1.0_#')) attachmentStorages.add(storage);
  }

  return {
    entries,
    hasSubject: hasEntry(entries, substgStreamName(PidTag.Subject, MapiType.PT_UNICODE)),
    hasHtml: hasEntry(entries, substgStreamName(PidTag.Html, MapiType.PT_BINARY)),
    hasBody: hasEntry(entries, substgStreamName(PidTag.Body, MapiType.PT_UNICODE)),
    hasPropertiesStream: hasEntry(entries, PROPERTIES_STREAM_NAME),
    hasNamedPropertyMapping: entries.some((entry) => entry.name.startsWith('__nameid_version1.0/')),
    recipientCount: recipientStorages.size,
    attachmentCount: attachmentStorages.size,
  };
}
