import { describe, expect, it } from 'vitest';
import { htmlToText } from '../src/html/html-to-text.js';

describe('htmlToText', () => {
  it('removes scripts/styles, preserves basic line breaks, and decodes common entities', () => {
    expect(
      htmlToText(
        '<style>h1{}</style><script>alert(1)</script><p>Hello&nbsp;&amp;</p><br><div>&lt;World&gt;</div>',
      ),
    ).toBe('Hello &\n\n<World>');
  });

  it('removes MSO conditional XML blocks from fallback text', () => {
    expect(
      htmlToText(`
        <h1>Hello</h1>
        <!--[if gte mso 9]>
          <xml>
            <o:OfficeDocumentSettings>
              <o:AllowPNG/>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        <![endif]-->
      `),
    ).toBe('Hello');
  });
});
