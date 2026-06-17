import { CfbWriter } from './cfb/cfb-writer.js';
import { htmlToText } from './html/html-to-text.js';
import { normalizeHtml } from './html/normalize-html.js';
import { PidTag } from './mapi/property-tags.js';
import { createBaseMessageProperties } from './oxmsg/message-writer.js';
import { writeAttachment } from './oxmsg/attachment-writer.js';
import { writeEmptyNamedPropertyMappingStorage } from './oxmsg/named-property-writer.js';
import {
  writePropertiesStream,
  writeVariablePropertyStreams,
} from './oxmsg/properties-stream-writer.js';
import { writeRecipient } from './oxmsg/recipient-writer.js';

export interface CreateOftInput {
  subject?: string;
  html: string;
  text?: string;
  from?: {
    name?: string;
    email?: string;
  };
  attachments?: OftAttachment[];
  recipients?: OftRecipient[];
  to?: RecipientLike[];
  cc?: RecipientLike[];
  bcc?: RecipientLike[];
}

export interface OftAttachment {
  filename: string;
  content: Buffer | Uint8Array;
  mimeType?: string;
  cid?: string;
  inline?: boolean;
}

export interface OftRecipient {
  email: string;
  name?: string;
  type?: 'to' | 'cc' | 'bcc';
  addressType?: string;
}

export type RecipientLike = string | Omit<OftRecipient, 'type'>;

function normalizeRecipient(value: RecipientLike, type: OftRecipient['type']): OftRecipient {
  return typeof value === 'string' ? { email: value, type } : { ...value, type };
}

function collectRecipients(input: CreateOftInput): OftRecipient[] {
  return [
    ...(input.recipients ?? []),
    ...(input.to ?? []).map((recipient) => normalizeRecipient(recipient, 'to')),
    ...(input.cc ?? []).map((recipient) => normalizeRecipient(recipient, 'cc')),
    ...(input.bcc ?? []).map((recipient) => normalizeRecipient(recipient, 'bcc')),
  ];
}

function assertCreateOftInput(input: CreateOftInput): void {
  if (!input.html || input.html.trim().length === 0) {
    throw new Error('createOft requires a non-empty html string.');
  }

  input.attachments?.forEach((attachment, index) => {
    if (!attachment.filename || attachment.filename.trim().length === 0) {
      throw new Error(`Attachment at index ${index} requires a non-empty filename.`);
    }

    if (attachment.content.byteLength === 0) {
      throw new Error(`Attachment "${attachment.filename}" has empty content.`);
    }
  });

  collectRecipients(input).forEach((recipient, index) => {
    if (!recipient.email || recipient.email.trim().length === 0) {
      throw new Error(`Recipient at index ${index} requires a non-empty email.`);
    }
  });
}

export async function createOft(input: CreateOftInput): Promise<Buffer> {
  assertCreateOftInput(input);

  const html = normalizeHtml(input.html);
  const text = input.text ?? htmlToText(html);
  const props = createBaseMessageProperties({ ...input, html, text });
  const cfb = new CfbWriter();
  const attachmentCount = input.attachments?.length ?? 0;
  const recipients = collectRecipients(input);
  const recipientCount = recipients.length;
  const hasAttach = props.find((prop) => prop.id === PidTag.HasAttach);

  if (hasAttach?.type === 0x000b) {
    hasAttach.value = attachmentCount > 0;
  }

  writeVariablePropertyStreams(cfb, props);
  writePropertiesStream(cfb, props, {
    kind: 'top-level',
    nextRecipientId: recipientCount,
    nextAttachmentId: attachmentCount,
    recipientCount,
    attachmentCount,
  });

  writeEmptyNamedPropertyMappingStorage(cfb);

  recipients.forEach((recipient, index) => {
    writeRecipient(cfb, index, recipient);
  });

  input.attachments?.forEach((attachment, index) => {
    writeAttachment(cfb, index, attachment);
  });

  return cfb.write();
}
