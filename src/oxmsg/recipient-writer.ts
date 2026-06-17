import type { CfbWriter } from '../cfb/cfb-writer.js';
import type { OftRecipient } from '../create-oft.js';
import { PidTag } from '../mapi/property-tags.js';
import { MapiType } from '../mapi/property-types.js';
import {
  writePropertiesStream,
  writeVariablePropertyStreams,
} from './properties-stream-writer.js';

export const RecipientTypeValue = {
  To: 1,
  Cc: 2,
  Bcc: 3,
} as const;

export function recipientStorageName(index: number): string {
  return `__recip_version1.0_#${index.toString(16).toUpperCase().padStart(8, '0')}`;
}

function recipientTypeValue(type: OftRecipient['type']): number {
  if (type === 'cc') return RecipientTypeValue.Cc;
  if (type === 'bcc') return RecipientTypeValue.Bcc;
  return RecipientTypeValue.To;
}

export function writeRecipient(cfb: CfbWriter, index: number, recipient: OftRecipient): void {
  const storage = recipientStorageName(index);
  const displayName = recipient.name ?? recipient.email;
  const props = [
    { id: PidTag.RecipientType, type: MapiType.PT_LONG, value: recipientTypeValue(recipient.type) },
    { id: PidTag.DisplayName, type: MapiType.PT_UNICODE, value: displayName },
    { id: PidTag.AddressType, type: MapiType.PT_UNICODE, value: recipient.addressType ?? 'SMTP' },
    { id: PidTag.EmailAddress, type: MapiType.PT_UNICODE, value: recipient.email },
    {
      id: PidTag.SearchKey,
      type: MapiType.PT_BINARY,
      value: Buffer.from(`${recipient.addressType ?? 'SMTP'}:${recipient.email.toUpperCase()}\0`, 'utf16le'),
    },
  ];

  writeVariablePropertyStreams(cfb, props, storage);
  writePropertiesStream(cfb, props, { kind: 'attachment-or-recipient' }, storage);
}
