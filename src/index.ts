export {
  createOft,
  type CreateOftInput,
  type OftAttachment,
  type OftRecipient,
  type RecipientLike,
} from './create-oft.js';
export {
  patchOftTemplate,
  type PatchOftTemplateInput,
} from './patch-oft-template.js';
export { inspectOft, type InspectOftResult } from './inspect-oft.js';
export { listCfbEntries, readCfbStream, type CfbEntryInfo } from './cfb/cfb-reader.js';
export { CfbWriter } from './cfb/cfb-writer.js';
export { MapiType, type MapiTypeValue } from './mapi/property-types.js';
export { PidTag } from './mapi/property-tags.js';
export { type MapiProperty } from './mapi/property.js';
export { encodePropertyValue } from './mapi/property-writer.js';
export { normalizeHtml } from './html/normalize-html.js';
export { htmlToText } from './html/html-to-text.js';
export { substgStreamName } from './oxmsg/stream-names.js';
export {
  NamedPropertyStreamName,
  writeEmptyNamedPropertyMappingStorage,
} from './oxmsg/named-property-writer.js';
export { RecipientTypeValue, recipientStorageName } from './oxmsg/recipient-writer.js';
export {
  createPropertiesStream,
  decodePropertiesStream,
  type DecodedPropertyStreamEntry,
  type PropertiesStreamKind,
  type PropertiesStreamOptions,
} from './oxmsg/properties-stream-writer.js';
