import * as CFB from 'cfb';

interface CreateOftInput {
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
interface OftAttachment {
    filename: string;
    content: Buffer | Uint8Array;
    mimeType?: string;
    cid?: string;
    inline?: boolean;
}
interface OftRecipient {
    email: string;
    name?: string;
    type?: 'to' | 'cc' | 'bcc';
    addressType?: string;
}
type RecipientLike = string | Omit<OftRecipient, 'type'>;
declare function createOft(input: CreateOftInput): Promise<Buffer>;

interface PatchOftTemplateInput {
    subject?: string;
    html?: string;
    text?: string;
}
declare function patchOftTemplate(baseOft: Buffer, input: PatchOftTemplateInput): Promise<Buffer>;

interface CfbEntryInfo {
    name: string;
    size: number;
    type?: number;
}
declare function listCfbEntries(buffer: Buffer): CfbEntryInfo[];
declare function readCfbStream(buffer: Buffer, name: string): Buffer | null;

interface InspectOftResult {
    entries: CfbEntryInfo[];
    hasSubject: boolean;
    hasHtml: boolean;
    hasBody: boolean;
    hasPropertiesStream: boolean;
    hasNamedPropertyMapping: boolean;
    recipientCount: number;
    attachmentCount: number;
}
declare function inspectOft(buffer: Buffer): InspectOftResult;

declare class CfbWriter {
    private readonly cfb;
    constructor(base?: CFB.CFB$Container);
    addStream(path: string, content: Buffer): void;
    write(): Buffer;
}

declare const MapiType: {
    readonly PT_SHORT: 2;
    readonly PT_LONG: 3;
    readonly PT_BOOLEAN: 11;
    readonly PT_SYSTIME: 64;
    readonly PT_STRING8: 30;
    readonly PT_UNICODE: 31;
    readonly PT_BINARY: 258;
};
type MapiTypeValue = (typeof MapiType)[keyof typeof MapiType];

declare const PidTag: {
    readonly MessageClass: 26;
    readonly Importance: 23;
    readonly Priority: 38;
    readonly Sensitivity: 54;
    readonly Subject: 55;
    readonly ClientSubmitTime: 57;
    readonly MessageDeliveryTime: 3590;
    readonly MessageFlags: 3591;
    readonly MessageSize: 3592;
    readonly HasAttach: 3611;
    readonly AttachSize: 3616;
    readonly AttachNumber: 3617;
    readonly Access: 4084;
    readonly AccessLevel: 4087;
    readonly RecordKey: 4089;
    readonly ObjectType: 4094;
    readonly EntryId: 4095;
    readonly Body: 4096;
    readonly Html: 4115;
    readonly NativeBody: 4118;
    readonly MessageEditorFormat: 22793;
    readonly StoreSupportMask: 13325;
    readonly RecipientType: 3093;
    readonly SenderName: 3098;
    readonly SenderEmailAddress: 3103;
    readonly DisplayName: 12289;
    readonly AddressType: 12290;
    readonly EmailAddress: 12291;
    readonly CreationTime: 12295;
    readonly LastModificationTime: 12296;
    readonly SearchKey: 12299;
    readonly AttachDataBinary: 14081;
    readonly AttachEncoding: 14082;
    readonly AttachExtension: 14083;
    readonly AttachFilename: 14084;
    readonly AttachMethod: 14085;
    readonly AttachLongFilename: 14087;
    readonly RenderingPosition: 14091;
    readonly AttachMimeTag: 14094;
    readonly AttachContentId: 14098;
    readonly AttachContentLocation: 14099;
    readonly AttachFlags: 14100;
    readonly AttachmentFlags: 32765;
    readonly AttachmentHidden: 32766;
};

type MapiProperty = {
    id: number;
    type: typeof MapiType.PT_STRING8;
    value: string;
} | {
    id: number;
    type: typeof MapiType.PT_UNICODE;
    value: string;
} | {
    id: number;
    type: typeof MapiType.PT_BINARY;
    value: Buffer | Uint8Array;
} | {
    id: number;
    type: typeof MapiType.PT_SHORT;
    value: number;
} | {
    id: number;
    type: typeof MapiType.PT_LONG;
    value: number;
} | {
    id: number;
    type: typeof MapiType.PT_BOOLEAN;
    value: boolean;
} | {
    id: number;
    type: typeof MapiType.PT_SYSTIME;
    value: Date | Buffer | Uint8Array;
};

declare function encodePropertyValue(prop: MapiProperty): Buffer;

declare function normalizeHtml(html: string): string;

declare function htmlToText(html: string): string;

declare function substgStreamName(propertyId: number, propertyType: number): string;

declare const NamedPropertyStreamName: {
    readonly Guid: "__nameid_version1.0/__substg1.0_00020102";
    readonly Entry: "__nameid_version1.0/__substg1.0_00030102";
    readonly String: "__nameid_version1.0/__substg1.0_00040102";
};
declare function writeEmptyNamedPropertyMappingStorage(cfb: CfbWriter): void;

declare const RecipientTypeValue: {
    readonly To: 1;
    readonly Cc: 2;
    readonly Bcc: 3;
};
declare function recipientStorageName(index: number): string;

type PropertiesStreamKind = 'top-level' | 'embedded-message' | 'attachment-or-recipient';
interface PropertiesStreamOptions {
    kind: PropertiesStreamKind;
    nextRecipientId?: number;
    nextAttachmentId?: number;
    recipientCount?: number;
    attachmentCount?: number;
}
interface DecodedPropertyStreamEntry {
    propertyTag: number;
    id: number;
    type: number;
    flags: number;
    data: Buffer;
    byteCount?: number;
}
declare function createPropertiesStream(props: MapiProperty[], options: PropertiesStreamOptions): Buffer;
declare function decodePropertiesStream(stream: Buffer, kind: PropertiesStreamKind): DecodedPropertyStreamEntry[];

export { type CfbEntryInfo, CfbWriter, type CreateOftInput, type DecodedPropertyStreamEntry, type InspectOftResult, type MapiProperty, MapiType, type MapiTypeValue, NamedPropertyStreamName, type OftAttachment, type OftRecipient, type PatchOftTemplateInput, PidTag, type PropertiesStreamKind, type PropertiesStreamOptions, type RecipientLike, RecipientTypeValue, createOft, createPropertiesStream, decodePropertiesStream, encodePropertyValue, htmlToText, inspectOft, listCfbEntries, normalizeHtml, patchOftTemplate, readCfbStream, recipientStorageName, substgStreamName, writeEmptyNamedPropertyMappingStorage };
