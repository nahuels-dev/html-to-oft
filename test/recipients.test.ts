import { describe, expect, it } from 'vitest';
import { createOft } from '../src/create-oft.js';
import { listCfbEntries, readCfbStream } from '../src/cfb/cfb-reader.js';
import { decodePropertiesStream } from '../src/oxmsg/properties-stream-writer.js';
import { PidTag } from '../src/mapi/property-tags.js';

describe('recipients', () => {
  it('writes recipient storages and updates the top-level recipient count', async () => {
    const oft = await createOft({
      subject: 'Recipients',
      html: '<h1>Hello</h1>',
      to: [{ email: 'to@example.com', name: 'To User' }],
      cc: ['cc@example.com'],
    });

    const names = listCfbEntries(oft).map((entry) => entry.name);
    expect(names).toContain('__recip_version1.0_#00000000/__properties_version1.0');
    expect(names).toContain('__recip_version1.0_#00000000/__substg1.0_3001001F');
    expect(names).toContain('__recip_version1.0_#00000000/__substg1.0_3003001F');
    expect(names).toContain('__recip_version1.0_#00000001/__properties_version1.0');

    const topProperties = readCfbStream(oft, '__properties_version1.0')!;
    expect(topProperties.readUInt32LE(8)).toBe(2);
    expect(topProperties.readUInt32LE(16)).toBe(2);

    const recipientProperties = readCfbStream(
      oft,
      '__recip_version1.0_#00000001/__properties_version1.0',
    )!;
    const entries = decodePropertiesStream(recipientProperties, 'attachment-or-recipient');
    const recipientType = entries.find((entry) => entry.id === PidTag.RecipientType);
    expect(recipientType?.data.readInt32LE(0)).toBe(2);
  });
});
