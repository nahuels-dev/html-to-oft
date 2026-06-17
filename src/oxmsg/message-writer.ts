import { MapiProperty } from '../mapi/property.js';
import { PidTag } from '../mapi/property-tags.js';
import { MapiType } from '../mapi/property-types.js';

export interface CreateMessagePropertiesInput {
  subject?: string;
  html: string;
  text?: string;
  from?: {
    name?: string;
    email?: string;
  };
}

export function createBaseMessageProperties(input: CreateMessagePropertiesInput): MapiProperty[] {
  const props: MapiProperty[] = [
    { id: PidTag.StoreSupportMask, type: MapiType.PT_LONG, value: 0x00040e79 },
    { id: PidTag.MessageClass, type: MapiType.PT_UNICODE, value: 'IPM.Note' },
    { id: PidTag.Subject, type: MapiType.PT_UNICODE, value: input.subject ?? '' },
    { id: PidTag.Body, type: MapiType.PT_UNICODE, value: input.text ?? '' },
    { id: PidTag.Html, type: MapiType.PT_BINARY, value: Buffer.from(input.html, 'utf8') },
    { id: PidTag.NativeBody, type: MapiType.PT_LONG, value: 2 },
    { id: PidTag.MessageEditorFormat, type: MapiType.PT_LONG, value: 2 },
    { id: PidTag.MessageFlags, type: MapiType.PT_LONG, value: 0 },
    { id: PidTag.HasAttach, type: MapiType.PT_BOOLEAN, value: false },
    { id: PidTag.Importance, type: MapiType.PT_LONG, value: 1 },
    { id: PidTag.Priority, type: MapiType.PT_LONG, value: 0 },
    { id: PidTag.Sensitivity, type: MapiType.PT_LONG, value: 0 },
  ];

  if (input.from?.name) {
    props.push({ id: PidTag.SenderName, type: MapiType.PT_UNICODE, value: input.from.name });
  }

  if (input.from?.email) {
    props.push({
      id: PidTag.SenderEmailAddress,
      type: MapiType.PT_UNICODE,
      value: input.from.email,
    });
  }

  return props;
}
