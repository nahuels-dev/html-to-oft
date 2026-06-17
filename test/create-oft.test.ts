import { describe, expect, it } from 'vitest';
import { createOft } from '../src/create-oft.js';
import { listCfbEntries } from '../src/cfb/cfb-reader.js';

describe('createOft', () => {
  it('creates a non-empty CFB buffer with basic MAPI streams', async () => {
    const oft = await createOft({
      subject: 'Promo Junio',
      html: '<html><body><h1>Hello</h1></body></html>',
      text: 'Hello',
    });

    expect(Buffer.isBuffer(oft)).toBe(true);
    expect(oft.length).toBeGreaterThan(0);

    const entryNames = listCfbEntries(oft).map((entry) => entry.name);
    expect(entryNames).toContain('__substg1.0_001A001F');
    expect(entryNames).toContain('__substg1.0_0037001F');
    expect(entryNames).toContain('__substg1.0_1000001F');
    expect(entryNames).not.toContain('__substg1.0_1013001F');
    expect(entryNames).toContain('__substg1.0_10130102');
    expect(entryNames).toContain('__properties_version1.0');
  });
});
