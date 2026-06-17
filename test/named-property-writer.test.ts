import { describe, expect, it } from 'vitest';
import { createOft } from '../src/create-oft.js';
import { listCfbEntries } from '../src/cfb/cfb-reader.js';
import { NamedPropertyStreamName } from '../src/oxmsg/named-property-writer.js';

describe('named property mapping storage', () => {
  it('writes the required empty base streams when no named properties are used', async () => {
    const oft = await createOft({ html: '<h1>Hello</h1>' });
    const names = listCfbEntries(oft).map((entry) => entry.name);

    expect(names).toContain(NamedPropertyStreamName.Guid);
    expect(names).toContain(NamedPropertyStreamName.Entry);
    expect(names).toContain(NamedPropertyStreamName.String);
  });
});
