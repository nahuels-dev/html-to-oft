import type { CfbWriter } from '../cfb/cfb-writer.js';
import type { OftAttachment } from '../create-oft.js';
import { PidTag } from '../mapi/property-tags.js';
import { MapiType } from '../mapi/property-types.js';
import {
  writePropertiesStream,
  writeVariablePropertyStreams,
} from './properties-stream-writer.js';
import { attachmentStorageName } from './stream-names.js';

export function writeAttachment(cfb: CfbWriter, index: number, attachment: OftAttachment): void {
  const storage = attachmentStorageName(index);
  const extension = extensionFromFilename(attachment.filename);
  const now = new Date();
  const props = [
    { id: PidTag.AttachNumber, type: MapiType.PT_LONG, value: index },
    { id: PidTag.RecordKey, type: MapiType.PT_BINARY, value: attachmentRecordKey(index) },
    { id: PidTag.ObjectType, type: MapiType.PT_LONG, value: 7 },
    { id: PidTag.Access, type: MapiType.PT_LONG, value: 2 },
    { id: PidTag.AccessLevel, type: MapiType.PT_LONG, value: 0 },
    { id: PidTag.AttachMethod, type: MapiType.PT_LONG, value: 1 },
    { id: PidTag.RenderingPosition, type: MapiType.PT_LONG, value: -1 },
    { id: PidTag.DisplayName, type: MapiType.PT_UNICODE, value: attachment.filename },
    { id: PidTag.AttachFilename, type: MapiType.PT_UNICODE, value: attachment.filename },
    { id: PidTag.AttachLongFilename, type: MapiType.PT_UNICODE, value: attachment.filename },
    ...(extension
      ? [{ id: PidTag.AttachExtension, type: MapiType.PT_UNICODE, value: extension }]
      : []),
    ...(attachment.mimeType
      ? [{ id: PidTag.AttachMimeTag, type: MapiType.PT_UNICODE, value: attachment.mimeType }]
      : []),
    { id: PidTag.AttachDataBinary, type: MapiType.PT_BINARY, value: attachment.content },
    { id: PidTag.AttachEncoding, type: MapiType.PT_BINARY, value: Buffer.alloc(0) },
    { id: PidTag.AttachSize, type: MapiType.PT_LONG, value: attachment.content.byteLength },
    ...(attachment.inline
      ? [
        { id: PidTag.AttachFlags, type: MapiType.PT_LONG, value: 0x00000004 },
        { id: PidTag.AttachmentFlags, type: MapiType.PT_LONG, value: 0x00000008 },
        { id: PidTag.AttachmentHidden, type: MapiType.PT_BOOLEAN, value: true },
      ]
      : []),
    ...(attachment.cid
      ? [{ id: PidTag.AttachContentId, type: MapiType.PT_UNICODE, value: attachment.cid }]
      : []),
    { id: PidTag.CreationTime, type: MapiType.PT_SYSTIME, value: now },
    { id: PidTag.LastModificationTime, type: MapiType.PT_SYSTIME, value: now },
    { id: PidTag.StoreSupportMask, type: MapiType.PT_LONG, value: 0x00040e79 },
  ];

  writeVariablePropertyStreams(cfb, props, storage);
  writePropertiesStream(cfb, props, { kind: 'attachment-or-recipient' }, storage);
}

function extensionFromFilename(filename: string): string {
  const match = filename.match(/(\.[a-z0-9]+)$/i);
  return match?.[1] ?? '';
}

function attachmentRecordKey(index: number): Buffer {
  const key = Buffer.alloc(4);
  key.writeUInt32LE(index, 0);
  return key;
}
