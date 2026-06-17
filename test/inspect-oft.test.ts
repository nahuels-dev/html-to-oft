import { describe, expect, it } from 'vitest';
import { createOft } from '../src/create-oft.js';
import { inspectOft } from '../src/inspect-oft.js';

describe('inspectOft', () => {
  it('detects basic OFT streams', async () => {
    const oft = await createOft({
      subject: 'Subject',
      html: '<h1>Hello</h1>',
      text: 'Hello',
      to: ['to@example.com'],
      attachments: [{ filename: 'a.txt', content: Buffer.from('a') }],
    });

    const result = inspectOft(oft);
    expect(result.hasSubject).toBe(true);
    expect(result.hasHtml).toBe(true);
    expect(result.hasBody).toBe(true);
    expect(result.hasPropertiesStream).toBe(true);
    expect(result.hasNamedPropertyMapping).toBe(true);
    expect(result.recipientCount).toBe(1);
    expect(result.attachmentCount).toBe(1);
  });
});
