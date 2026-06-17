#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/oft-dump.ts
var import_promises = require("fs/promises");

// src/cfb/cfb-reader.ts
var CFB = __toESM(require("cfb"), 1);
function parseCfb(buffer) {
  return CFB.read(buffer, { type: "buffer" });
}
function stripRoot(fullPath, root) {
  const normalizedRoot = root.endsWith("/") ? root : `${root}/`;
  return fullPath.startsWith(normalizedRoot) ? fullPath.slice(normalizedRoot.length) : fullPath;
}
function listCfbEntries(buffer) {
  const cfb = parseCfb(buffer);
  const root = cfb.FullPaths[0] ?? "";
  return cfb.FullPaths.map((fullPath, index) => {
    const entry = cfb.FileIndex[index];
    return {
      name: stripRoot(fullPath, root),
      size: entry?.size ?? 0,
      type: entry?.type
    };
  }).filter((entry) => entry.name.length > 0 && entry.name !== "/" && entry.name.charCodeAt(0) >= 32);
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

// src/oxmsg/stream-names.ts
function substgStreamName(propertyId, propertyType) {
  const id = propertyId.toString(16).toUpperCase().padStart(4, "0");
  const type = propertyType.toString(16).toUpperCase().padStart(4, "0");
  return `__substg1.0_${id}${type}`;
}
var PROPERTIES_STREAM_NAME = "__properties_version1.0";

// src/inspect-oft.ts
function hasEntry(entries, name) {
  return entries.some((entry) => entry.name === name || entry.name.endsWith(`/${name}`));
}
function inspectOft(buffer) {
  const entries = listCfbEntries(buffer);
  const recipientStorages = /* @__PURE__ */ new Set();
  const attachmentStorages = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    const [storage] = entry.name.split("/");
    if (storage.startsWith("__recip_version1.0_#")) recipientStorages.add(storage);
    if (storage.startsWith("__attach_version1.0_#")) attachmentStorages.add(storage);
  }
  return {
    entries,
    hasSubject: hasEntry(entries, substgStreamName(PidTag.Subject, MapiType.PT_UNICODE)),
    hasHtml: hasEntry(entries, substgStreamName(PidTag.Html, MapiType.PT_BINARY)),
    hasBody: hasEntry(entries, substgStreamName(PidTag.Body, MapiType.PT_UNICODE)),
    hasPropertiesStream: hasEntry(entries, PROPERTIES_STREAM_NAME),
    hasNamedPropertyMapping: entries.some((entry) => entry.name.startsWith("__nameid_version1.0/")),
    recipientCount: recipientStorages.size,
    attachmentCount: attachmentStorages.size
  };
}

// src/oft-dump.ts
async function main() {
  const [inputPath] = process.argv.slice(2);
  if (!inputPath) {
    console.error("Usage: oft-dump ./template.oft");
    process.exitCode = 1;
    return;
  }
  const buffer = await (0, import_promises.readFile)(inputPath);
  const result = inspectOft(buffer);
  console.log(`subject: ${result.hasSubject}`);
  console.log(`body: ${result.hasBody}`);
  console.log(`html: ${result.hasHtml}`);
  console.log(`properties: ${result.hasPropertiesStream}`);
  console.log(`namedProperties: ${result.hasNamedPropertyMapping}`);
  console.log(`recipients: ${result.recipientCount}`);
  console.log(`attachments: ${result.attachmentCount}`);
  console.log("");
  for (const entry of result.entries) {
    console.log(`${entry.name}	${entry.size}`);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
//# sourceMappingURL=oft-dump.cjs.map