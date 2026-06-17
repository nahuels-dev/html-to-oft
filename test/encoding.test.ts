import { describe, expect, it } from 'vitest';
import { encodeInt32, encodeUnicode } from '../src/utils/encoding.js';

describe('encoding helpers', () => {
  it('encodes unicode as UTF-16LE with a null terminator', () => {
    expect(encodeUnicode('Hi')).toEqual(Buffer.from('H\u0000i\u0000\u0000\u0000', 'binary'));
  });

  it('encodes int32 little-endian', () => {
    expect(encodeInt32(1)).toEqual(Buffer.from([1, 0, 0, 0]));
  });
});
