# html-to-oft

Create Outlook `.oft` template files from HTML in Node.js.

`html-to-oft` generates CFB/OLE structured storage files with MAPI-style message
streams, so templates can be created without Outlook, Windows COM automation, or
platform-specific runtime dependencies.

## Installation

```bash
npm install html-to-oft
```

Requires Node.js 18 or newer.

## Usage

```ts
import { createOft } from 'html-to-oft';
import { writeFile } from 'node:fs/promises';

const oft = await createOft({
  subject: 'Newsletter',
  html: `
    <table role="presentation" width="600" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="https://example.com/header.png" width="600" alt="">
        </td>
      </tr>
    </table>
  `,
});

await writeFile('newsletter.oft', oft);
```

## API

### `createOft(input)`

Creates an Outlook template and returns a `Buffer`.

```ts
const oft = await createOft({
  subject: 'Promo',
  html: '<h1>Hello</h1>',
  text: 'Hello',
  to: ['customer@example.com'],
  cc: [{ email: 'manager@example.com', name: 'Manager' }],
});
```

Input fields:

| Field | Description |
| --- | --- |
| `html` | Required HTML body. |
| `subject` | Message subject. |
| `text` | Plain-text body. Generated from HTML when omitted. |
| `from` | Sender metadata. |
| `recipients` | Explicit recipient list. |
| `to`, `cc`, `bcc` | Recipient shortcuts. |
| `attachments` | Binary attachments. |

### Attachments

```ts
const oft = await createOft({
  subject: 'With attachment',
  html: '<p>See attached.</p>',
  attachments: [
    {
      filename: 'document.pdf',
      content: pdfBuffer,
      mimeType: 'application/pdf',
    },
  ],
});
```

Inline attachments can be referenced with `cid` and `inline`.

```ts
const oft = await createOft({
  subject: 'Inline image',
  html: '<img src="cid:image001.png@example" width="600" alt="">',
  attachments: [
    {
      filename: 'image001.png',
      content: pngBuffer,
      mimeType: 'image/png',
      cid: 'image001.png@example',
      inline: true,
    },
  ],
});
```

### `patchOftTemplate(baseOft, input)`

Updates known subject, body, and HTML streams in an existing template.

```ts
import { patchOftTemplate } from 'html-to-oft';

const patched = await patchOftTemplate(existingOft, {
  subject: 'Updated subject',
  html: '<h1>Updated</h1>',
  text: 'Updated',
});
```

### `inspectOft(buffer)`

Reads a template and returns a structural summary.

```ts
import { inspectOft } from 'html-to-oft';

const info = inspectOft(oft);

console.log(info.hasHtml);
console.log(info.attachmentCount);
```

### HTML Helpers

```ts
import { htmlToText, normalizeHtml } from 'html-to-oft';
```

`normalizeHtml(html)` prepares HTML for Outlook-oriented template generation.

`htmlToText(html)` creates a plain-text fallback from HTML.

## CLI

```bash
html-to-oft ./email.html --subject "Promo" --to customer@example.com --out promo.oft
```

```bash
oft-dump ./promo.oft
```

## Compatibility

The generated files are designed for Outlook `.oft` workflows. Outlook rendering
can vary between Outlook versions, especially around HTML tables and inline
images, so templates should be checked in the target Outlook client.

## License

MIT
