import { MapiType } from './property-types.js';

export type MapiProperty =
  | { id: number; type: typeof MapiType.PT_STRING8; value: string }
  | { id: number; type: typeof MapiType.PT_UNICODE; value: string }
  | { id: number; type: typeof MapiType.PT_BINARY; value: Buffer | Uint8Array }
  | { id: number; type: typeof MapiType.PT_SHORT; value: number }
  | { id: number; type: typeof MapiType.PT_LONG; value: number }
  | { id: number; type: typeof MapiType.PT_BOOLEAN; value: boolean }
  | { id: number; type: typeof MapiType.PT_SYSTIME; value: Date | Buffer | Uint8Array };
