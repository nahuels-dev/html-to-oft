#!/usr/bin/env node

// src/cli.ts
import { readFile, writeFile } from "fs/promises";

// src/cfb/cfb-writer.ts
import * as CFB from "cfb";
var CfbWriter = class {
  cfb;
  constructor(base) {
    this.cfb = base ?? CFB.utils.cfb_new();
  }
  addStream(path, content) {
    CFB.utils.cfb_add(this.cfb, path, content);
  }
  write() {
    return Buffer.from(CFB.write(this.cfb, { type: "buffer", fileType: "cfb" }));
  }
};

// src/html/html-to-text.ts
var ENTITY_MAP = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'"
};
function htmlToText(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<xml\b[^>]*>[\s\S]*?<\/xml>/gi, "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p\s*>/gi, "\n").replace(/<\/div\s*>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&(nbsp|amp|lt|gt|quot);|&#39;/g, (entity) => ENTITY_MAP[entity] ?? entity).replace(/\n{3,}/g, "\n\n").trim();
}

// src/html/normalize-html.ts
function normalizeHtml(html) {
  const document = /<html[\s>]/i.test(html) ? html : `<!doctype html>
<html>
  <body>${html}</body>
</html>`;
  return hardenOutlookImageSpacing(injectOutlookResetStyle(document));
}
var OUTLOOK_RESET_STYLE = `<!--[if mso]>
<style data-html-to-oft-outlook-reset type="text/css">
table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
img{display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
p.MsoNormal,li.MsoNormal,div.MsoNormal{margin:0!important;padding:0!important;mso-margin-top-alt:0in;mso-margin-bottom-alt:0in;}
p.MsoNormal a,p.MsoNormal span{font-size:0!important;line-height:0!important;}
p.MsoNormal img,p img{display:block;border:0;margin:0;padding:0;}
</style>
<![endif]-->`;
function injectOutlookResetStyle(html) {
  if (html.includes("data-html-to-oft-outlook-reset")) return html;
  if (/<\/head\s*>/i.test(html)) {
    return html.replace(/<\/head\s*>/i, `${OUTLOOK_RESET_STYLE}
</head>`);
  }
  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b[^>]*>/i, (tag) => `${tag}
<head>
${OUTLOOK_RESET_STYLE}
</head>`);
  }
  return `${OUTLOOK_RESET_STYLE}
${html}`;
}
function hardenOutlookImageSpacing(html) {
  const withImageStyles = html.replace(/<img\b[^>]*>/gi, (tag) => hardenImageTag(tag));
  return hardenImageOnlyContainers(
    hardenImageOnlyContainers(
      hardenImageOnlyContainers(withImageStyles, "p"),
      "td"
    ),
    "th"
  );
}
function hardenImageOnlyContainers(html, tagName) {
  return html.replace(new RegExp(`<${tagName}\\b[^>]*>(?:(?!<${tagName}\\b|<\\/${tagName}>)[\\s\\S])*<\\/${tagName}>`, "gi"), (container) => {
    if (!isImageOnlyContainer(container, tagName)) return container;
    return hardenImageOnlyContainer(container, tagName);
  });
}
function hardenImageTag(tag) {
  const style = readAttribute(tag, "style");
  const width = readAttribute(tag, "width") ?? readPixelStyle(style, "width");
  let next = upsertStyle(tag, {
    border: "0",
    display: "block",
    "font-size": "0",
    "line-height": "0",
    margin: "0",
    outline: "none",
    padding: "0",
    "text-decoration": "none",
    "-ms-interpolation-mode": "bicubic"
  }, ["display", "font-size", "line-height"]);
  next = upsertAttribute(next, "border", "0");
  if (width) next = upsertAttribute(next, "width", width);
  next = removeAttribute(next, "height");
  return removeStyleProperties(next, ["height"]);
}
function hardenImageOnlyContainer(container, tagName) {
  const image = container.match(/<img\b[^>]*>/i)?.[0];
  if (!image) return container;
  const width = readAttribute(image, "width") ?? readPixelStyle(readAttribute(image, "style"), "width");
  const openTagMatch = container.match(new RegExp(`<${tagName}\\b[^>]*>`, "i"));
  const openTag = openTagMatch?.[0];
  if (!openTag) return container;
  const styles = {
    border: "0",
    "border-collapse": "collapse",
    "font-size": "0",
    margin: "0",
    padding: "0"
  };
  const overrideProperties = ["font-size"];
  styles["line-height"] = "0";
  styles["mso-line-height-alt"] = "0";
  styles["mso-line-height-rule"] = "exactly";
  overrideProperties.push("line-height", "mso-line-height-alt", "mso-line-height-rule");
  let nextOpenTag = upsertStyle(openTag, styles, overrideProperties);
  nextOpenTag = removeAttribute(nextOpenTag, "height");
  nextOpenTag = removeStyleProperties(nextOpenTag, ["height"]);
  if (tagName === "td" || tagName === "th") {
    nextOpenTag = upsertAttribute(nextOpenTag, "valign", "top");
    if (width) nextOpenTag = upsertAttribute(nextOpenTag, "width", width);
  }
  if (tagName === "td" || tagName === "th") {
    const outputTagName = tagName === "th" ? "td" : tagName;
    const outputOpenTag = tagName === "th" ? renameOpeningTag(nextOpenTag, outputTagName) : nextOpenTag;
    return `${outputOpenTag}${wrapImageOnlyCellContent(canonicalImageOnlyContent(container, image))}</${outputTagName}>`;
  }
  const nextContainer = container.replace(openTag, nextOpenTag);
  return hardenImageInlineWrappers(nextContainer);
}
function isImageOnlyContainer(container, tagName) {
  if (!/<img\b/i.test(container)) return false;
  const inner = container.replace(new RegExp(`^<${tagName}\\b[^>]*>`, "i"), "").replace(new RegExp(`<\\/${tagName}>$`, "i"), "");
  const residue = inner.replace(/<!--[\s\S]*?-->/g, "").replace(/<img\b[^>]*>/gi, "").replace(/<\/?(?:a|span|u|b|i|strong|em|p|div|center|font|o:p)\b[^>]*>/gi, "").replace(/<br\s*\/?>/gi, "").replace(/&nbsp;|&#160;|\u00a0/gi, "").replace(/\s+/g, "");
  return residue.length === 0;
}
function hardenImageInlineWrappers(container) {
  return container.replace(/<(a|span)\b[^>]*>/gi, (tag) => upsertStyle(tag, {
    display: "block",
    "font-size": "0",
    "line-height": "0",
    margin: "0",
    padding: "0",
    "text-decoration": "none"
  }, ["display", "font-size", "line-height"]));
}
function canonicalImageOnlyContent(container, image) {
  const anchor = container.match(/<a\b[^>]*>/i)?.[0];
  if (!anchor) return image;
  const hardenedAnchor = upsertStyle(anchor, {
    display: "block",
    "font-size": "0",
    "line-height": "0",
    margin: "0",
    padding: "0",
    "text-decoration": "none"
  }, ["display", "font-size", "line-height"]);
  return `${hardenedAnchor}${image}</a>`;
}
function wrapImageOnlyCellContent(content) {
  return `<p style="margin:0;padding:0;font-size:0;line-height:0;mso-line-height-alt:0;mso-line-height-rule:exactly">${content}</p>`;
}
function renameOpeningTag(tag, nextTagName) {
  return tag.replace(/^<\s*[a-z0-9:-]+/i, `<${nextTagName}`);
}
function readAttribute(tag, name) {
  const escapedName = escapeRegExp(name);
  const match = tag.match(new RegExp(`\\s${escapedName}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}
function readPixelStyle(style, property) {
  if (!style) return null;
  const escapedProperty = escapeRegExp(property);
  const match = style.match(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*(\\d+(?:\\.\\d+)?)px\\s*(?:;|$)`, "i"));
  return match?.[1] ?? null;
}
function upsertAttribute(tag, name, value) {
  if (readAttribute(tag, name) !== null) {
    return tag.replace(
      new RegExp(`(\\s${escapeRegExp(name)}\\s*=\\s*)("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
      `$1"${value}"`
    );
  }
  return tag.replace(/\/?>$/, (end) => ` ${name}="${value}"${end}`);
}
function removeAttribute(tag, name) {
  return tag.replace(new RegExp(`\\s${escapeRegExp(name)}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"), "");
}
function upsertStyle(tag, properties, overrideProperties = []) {
  const currentStyle = readAttribute(tag, "style") ?? "";
  const mergedStyle = mergeStyle(currentStyle, properties, new Set(overrideProperties));
  return upsertAttribute(tag, "style", mergedStyle);
}
function removeStyleProperties(tag, properties) {
  const currentStyle = readAttribute(tag, "style");
  if (currentStyle === null) return tag;
  const blocked = new Set(properties.map((property) => property.toLowerCase()));
  const nextStyle = currentStyle.split(";").map((part) => part.trim()).filter(Boolean).filter((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator === -1) return true;
    return !blocked.has(declaration.slice(0, separator).trim().toLowerCase());
  }).join(";");
  return nextStyle ? upsertAttribute(tag, "style", nextStyle) : removeAttribute(tag, "style");
}
function mergeStyle(style, properties, overrideProperties) {
  const declarations = style.split(";").map((part) => part.trim()).filter(Boolean);
  const seen = /* @__PURE__ */ new Set();
  const next = [];
  declarations.forEach((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator === -1) {
      next.push(declaration);
      return;
    }
    const property = declaration.slice(0, separator).trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(properties, property) && overrideProperties.has(property)) {
      next.push(`${property}:${properties[property]}`);
    } else {
      next.push(declaration);
    }
    seen.add(property);
  });
  Object.entries(properties).forEach(([property, value]) => {
    if (!seen.has(property.toLowerCase())) {
      next.push(`${property}:${value}`);
    }
  });
  return next.join(";");
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/mapi/property-tags.ts
var PidTag = {
  MessageClass: 26,
  Importance: 23,
  Priority: 38,
  Sensitivity: 54,
  Subject: 55,
  ClientSubmitTime: 57,
  MessageDeliveryTime: 3590,
  MessageFlags: 3591,
  MessageSize: 3592,
  HasAttach: 3611,
  AttachSize: 3616,
  AttachNumber: 3617,
  Access: 4084,
  AccessLevel: 4087,
  RecordKey: 4089,
  ObjectType: 4094,
  EntryId: 4095,
  Body: 4096,
  Html: 4115,
  NativeBody: 4118,
  MessageEditorFormat: 22793,
  StoreSupportMask: 13325,
  RecipientType: 3093,
  SenderName: 3098,
  SenderEmailAddress: 3103,
  DisplayName: 12289,
  AddressType: 12290,
  EmailAddress: 12291,
  CreationTime: 12295,
  LastModificationTime: 12296,
  SearchKey: 12299,
  AttachDataBinary: 14081,
  AttachEncoding: 14082,
  AttachExtension: 14083,
  AttachFilename: 14084,
  AttachMethod: 14085,
  AttachLongFilename: 14087,
  RenderingPosition: 14091,
  AttachMimeTag: 14094,
  AttachContentId: 14098,
  AttachContentLocation: 14099,
  AttachFlags: 14100,
  AttachmentFlags: 32765,
  AttachmentHidden: 32766
};

// src/mapi/property-types.ts
var MapiType = {
  PT_SHORT: 2,
  PT_LONG: 3,
  PT_BOOLEAN: 11,
  PT_SYSTIME: 64,
  PT_STRING8: 30,
  PT_UNICODE: 31,
  PT_BINARY: 258
};

// src/oxmsg/message-writer.ts
function createBaseMessageProperties(input) {
  const props = [
    { id: PidTag.StoreSupportMask, type: MapiType.PT_LONG, value: 265849 },
    { id: PidTag.MessageClass, type: MapiType.PT_UNICODE, value: "IPM.Note" },
    { id: PidTag.Subject, type: MapiType.PT_UNICODE, value: input.subject ?? "" },
    { id: PidTag.Body, type: MapiType.PT_UNICODE, value: input.text ?? "" },
    { id: PidTag.Html, type: MapiType.PT_BINARY, value: Buffer.from(input.html, "utf8") },
    { id: PidTag.NativeBody, type: MapiType.PT_LONG, value: 2 },
    { id: PidTag.MessageEditorFormat, type: MapiType.PT_LONG, value: 2 },
    { id: PidTag.MessageFlags, type: MapiType.PT_LONG, value: 0 },
    { id: PidTag.HasAttach, type: MapiType.PT_BOOLEAN, value: false },
    { id: PidTag.Importance, type: MapiType.PT_LONG, value: 1 },
    { id: PidTag.Priority, type: MapiType.PT_LONG, value: 0 },
    { id: PidTag.Sensitivity, type: MapiType.PT_LONG, value: 0 }
  ];
  if (input.from?.name) {
    props.push({ id: PidTag.SenderName, type: MapiType.PT_UNICODE, value: input.from.name });
  }
  if (input.from?.email) {
    props.push({
      id: PidTag.SenderEmailAddress,
      type: MapiType.PT_UNICODE,
      value: input.from.email
    });
  }
  return props;
}

// src/oxmsg/properties-stream-writer.ts
import * as CFB2 from "cfb";

// src/utils/encoding.ts
function encodeUnicode(value) {
  return Buffer.from(`${value}\0`, "utf16le");
}
function encodeString8(value) {
  return Buffer.from(`${value}\0`, "latin1");
}
function encodeInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32LE(value, 0);
  return buffer;
}
function encodeInt16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeInt16LE(value, 0);
  return buffer;
}
function encodeBoolean(value) {
  return encodeInt32(value ? 1 : 0);
}
function encodeBinary(value) {
  return Buffer.from(value);
}
function encodeFiletime(value) {
  const unixToWindowsEpochMs = 116444736e5;
  const ticksPerMs = 10000n;
  const filetime = BigInt(value.getTime() + unixToWindowsEpochMs) * ticksPerMs;
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(filetime, 0);
  return buffer;
}

// src/mapi/property-writer.ts
function encodePropertyValue(prop) {
  switch (prop.type) {
    case MapiType.PT_STRING8:
      return encodeString8(prop.value);
    case MapiType.PT_UNICODE:
      return encodeUnicode(prop.value);
    case MapiType.PT_BINARY:
      return encodeBinary(prop.value);
    case MapiType.PT_SHORT:
      return encodeInt16(prop.value);
    case MapiType.PT_LONG:
      return encodeInt32(prop.value);
    case MapiType.PT_BOOLEAN:
      return encodeBoolean(prop.value);
    case MapiType.PT_SYSTIME:
      return prop.value instanceof Date ? encodeFiletime(prop.value) : encodeBinary(prop.value);
    default: {
      const neverProp = prop;
      throw new Error(`Unsupported MAPI property type: ${JSON.stringify(neverProp)}`);
    }
  }
}
function propertyTag(id, type) {
  return (id & 65535) << 16 | type & 65535;
}
function isVariableLengthProperty(prop) {
  return prop.type === MapiType.PT_UNICODE || prop.type === MapiType.PT_STRING8 || prop.type === MapiType.PT_BINARY;
}

// src/oxmsg/stream-names.ts
function substgStreamName(propertyId, propertyType) {
  const id = propertyId.toString(16).toUpperCase().padStart(4, "0");
  const type = propertyType.toString(16).toUpperCase().padStart(4, "0");
  return `__substg1.0_${id}${type}`;
}
var PROPERTIES_STREAM_NAME = "__properties_version1.0";
function attachmentStorageName(index) {
  return `__attach_version1.0_#${index.toString(16).toUpperCase().padStart(8, "0")}`;
}

// src/oxmsg/properties-stream-writer.ts
var PropertyFlags = {
  Mandatory: 1,
  Readable: 2,
  Writable: 4
};
function createHeader(options) {
  switch (options.kind) {
    case "top-level": {
      const header = Buffer.alloc(32);
      header.writeUInt32LE(options.nextRecipientId ?? 0, 8);
      header.writeUInt32LE(options.nextAttachmentId ?? 0, 12);
      header.writeUInt32LE(options.recipientCount ?? 0, 16);
      header.writeUInt32LE(options.attachmentCount ?? 0, 20);
      return header;
    }
    case "embedded-message": {
      const header = Buffer.alloc(24);
      header.writeUInt32LE(options.nextRecipientId ?? 0, 8);
      header.writeUInt32LE(options.nextAttachmentId ?? 0, 12);
      header.writeUInt32LE(options.recipientCount ?? 0, 16);
      header.writeUInt32LE(options.attachmentCount ?? 0, 20);
      return header;
    }
    case "attachment-or-recipient":
      return Buffer.alloc(8);
    default: {
      const neverOptions = options.kind;
      throw new Error(`Unsupported property stream kind: ${neverOptions}`);
    }
  }
}
function encodeFixedPropertyEntryValue(prop) {
  const value = Buffer.alloc(8);
  switch (prop.type) {
    case MapiType.PT_SHORT:
      value.writeInt16LE(prop.value, 0);
      break;
    case MapiType.PT_LONG:
      value.writeInt32LE(prop.value, 0);
      break;
    case MapiType.PT_BOOLEAN:
      value.writeUInt16LE(prop.value ? 1 : 0, 0);
      break;
    case MapiType.PT_SYSTIME:
      encodePropertyValue(prop).copy(value, 0, 0, 8);
      break;
    default:
      throw new Error(`Property 0x${prop.id.toString(16)} is not fixed-length.`);
  }
  return value;
}
function encodePropertyStreamEntry(prop) {
  const entry = Buffer.alloc(16);
  const value = encodePropertyValue(prop);
  entry.writeUInt32LE(propertyTag(prop.id, prop.type), 0);
  entry.writeUInt32LE(PropertyFlags.Readable | PropertyFlags.Writable, 4);
  if (isVariableLengthProperty(prop)) {
    entry.writeUInt32LE(value.length, 8);
    entry.writeUInt32LE(0, 12);
  } else {
    encodeFixedPropertyEntryValue(prop).copy(entry, 8);
  }
  return entry;
}
function createPropertiesStream(props, options) {
  const header = createHeader(options);
  const entries = props.map(encodePropertyStreamEntry);
  return Buffer.concat([header, ...entries]);
}
function writeVariablePropertyStreams(cfb, props, basePath = "") {
  for (const prop of props) {
    if (!isVariableLengthProperty(prop)) continue;
    const streamPath = [basePath, substgStreamName(prop.id, prop.type)].filter(Boolean).join("/");
    cfb.addStream(streamPath, encodePropertyValue(prop));
  }
}
function writePropertiesStream(cfb, props, options, basePath = "") {
  const streamPath = [basePath, PROPERTIES_STREAM_NAME].filter(Boolean).join("/");
  cfb.addStream(streamPath, createPropertiesStream(props, options));
}

// src/oxmsg/attachment-writer.ts
function writeAttachment(cfb, index, attachment) {
  const storage = attachmentStorageName(index);
  const extension = extensionFromFilename(attachment.filename);
  const now = /* @__PURE__ */ new Date();
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
    ...extension ? [{ id: PidTag.AttachExtension, type: MapiType.PT_UNICODE, value: extension }] : [],
    ...attachment.mimeType ? [{ id: PidTag.AttachMimeTag, type: MapiType.PT_UNICODE, value: attachment.mimeType }] : [],
    { id: PidTag.AttachDataBinary, type: MapiType.PT_BINARY, value: attachment.content },
    { id: PidTag.AttachEncoding, type: MapiType.PT_BINARY, value: Buffer.alloc(0) },
    { id: PidTag.AttachSize, type: MapiType.PT_LONG, value: attachment.content.byteLength },
    ...attachment.inline ? [
      { id: PidTag.AttachFlags, type: MapiType.PT_LONG, value: 4 },
      { id: PidTag.AttachmentFlags, type: MapiType.PT_LONG, value: 8 },
      { id: PidTag.AttachmentHidden, type: MapiType.PT_BOOLEAN, value: true }
    ] : [],
    ...attachment.cid ? [{ id: PidTag.AttachContentId, type: MapiType.PT_UNICODE, value: attachment.cid }] : [],
    { id: PidTag.CreationTime, type: MapiType.PT_SYSTIME, value: now },
    { id: PidTag.LastModificationTime, type: MapiType.PT_SYSTIME, value: now },
    { id: PidTag.StoreSupportMask, type: MapiType.PT_LONG, value: 265849 }
  ];
  writeVariablePropertyStreams(cfb, props, storage);
  writePropertiesStream(cfb, props, { kind: "attachment-or-recipient" }, storage);
}
function extensionFromFilename(filename) {
  const match = filename.match(/(\.[a-z0-9]+)$/i);
  return match?.[1] ?? "";
}
function attachmentRecordKey(index) {
  const key = Buffer.alloc(4);
  key.writeUInt32LE(index, 0);
  return key;
}

// src/oxmsg/named-property-writer.ts
var NAMEID_STORAGE = "__nameid_version1.0";
var NamedPropertyStreamName = {
  Guid: `${NAMEID_STORAGE}/__substg1.0_00020102`,
  Entry: `${NAMEID_STORAGE}/__substg1.0_00030102`,
  String: `${NAMEID_STORAGE}/__substg1.0_00040102`
};
function writeEmptyNamedPropertyMappingStorage(cfb) {
  cfb.addStream(NamedPropertyStreamName.Guid, Buffer.alloc(0));
  cfb.addStream(NamedPropertyStreamName.Entry, Buffer.alloc(0));
  cfb.addStream(NamedPropertyStreamName.String, Buffer.alloc(0));
}

// src/oxmsg/recipient-writer.ts
var RecipientTypeValue = {
  To: 1,
  Cc: 2,
  Bcc: 3
};
function recipientStorageName(index) {
  return `__recip_version1.0_#${index.toString(16).toUpperCase().padStart(8, "0")}`;
}
function recipientTypeValue(type) {
  if (type === "cc") return RecipientTypeValue.Cc;
  if (type === "bcc") return RecipientTypeValue.Bcc;
  return RecipientTypeValue.To;
}
function writeRecipient(cfb, index, recipient) {
  const storage = recipientStorageName(index);
  const displayName = recipient.name ?? recipient.email;
  const props = [
    { id: PidTag.RecipientType, type: MapiType.PT_LONG, value: recipientTypeValue(recipient.type) },
    { id: PidTag.DisplayName, type: MapiType.PT_UNICODE, value: displayName },
    { id: PidTag.AddressType, type: MapiType.PT_UNICODE, value: recipient.addressType ?? "SMTP" },
    { id: PidTag.EmailAddress, type: MapiType.PT_UNICODE, value: recipient.email },
    {
      id: PidTag.SearchKey,
      type: MapiType.PT_BINARY,
      value: Buffer.from(`${recipient.addressType ?? "SMTP"}:${recipient.email.toUpperCase()}\0`, "utf16le")
    }
  ];
  writeVariablePropertyStreams(cfb, props, storage);
  writePropertiesStream(cfb, props, { kind: "attachment-or-recipient" }, storage);
}

// src/create-oft.ts
function normalizeRecipient(value, type) {
  return typeof value === "string" ? { email: value, type } : { ...value, type };
}
function collectRecipients(input) {
  return [
    ...input.recipients ?? [],
    ...(input.to ?? []).map((recipient) => normalizeRecipient(recipient, "to")),
    ...(input.cc ?? []).map((recipient) => normalizeRecipient(recipient, "cc")),
    ...(input.bcc ?? []).map((recipient) => normalizeRecipient(recipient, "bcc"))
  ];
}
function assertCreateOftInput(input) {
  if (!input.html || input.html.trim().length === 0) {
    throw new Error("createOft requires a non-empty html string.");
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
async function createOft(input) {
  assertCreateOftInput(input);
  const html = normalizeHtml(input.html);
  const text = input.text ?? htmlToText(html);
  const props = createBaseMessageProperties({ ...input, html, text });
  const cfb = new CfbWriter();
  const attachmentCount = input.attachments?.length ?? 0;
  const recipients = collectRecipients(input);
  const recipientCount = recipients.length;
  const hasAttach = props.find((prop) => prop.id === PidTag.HasAttach);
  if (hasAttach?.type === 11) {
    hasAttach.value = attachmentCount > 0;
  }
  writeVariablePropertyStreams(cfb, props);
  writePropertiesStream(cfb, props, {
    kind: "top-level",
    nextRecipientId: recipientCount,
    nextAttachmentId: attachmentCount,
    recipientCount,
    attachmentCount
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

// src/cli.ts
function readOption(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : void 0;
}
function readRepeatedOption(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) values.push(args[index + 1]);
  }
  return values;
}
async function main() {
  const args = process.argv.slice(2);
  const inputPath = args.find((arg) => !arg.startsWith("-"));
  const outPath = readOption(args, "--out");
  const subject = readOption(args, "--subject");
  const to = readRepeatedOption(args, "--to");
  const cc = readRepeatedOption(args, "--cc");
  const bcc = readRepeatedOption(args, "--bcc");
  if (!inputPath || !outPath) {
    console.error(
      'Usage: html-to-oft ./email.html --subject "Promo Junio" --to customer@example.com --out promo.oft'
    );
    process.exitCode = 1;
    return;
  }
  const html = await readFile(inputPath, "utf8");
  const oft = await createOft({ subject, html, to, cc, bcc });
  await writeFile(outPath, oft);
  console.log(`Wrote ${outPath}`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
//# sourceMappingURL=cli.js.map