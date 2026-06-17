import { describe, expect, it } from 'vitest';
import { substgStreamName } from '../src/oxmsg/stream-names.js';

describe('substgStreamName', () => {
  it('formats property id and type as an MS-OXMSG substg stream name', () => {
    expect(substgStreamName(0x0037, 0x001f)).toBe('__substg1.0_0037001F');
  });
});
