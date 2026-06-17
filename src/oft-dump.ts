#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { inspectOft } from './inspect-oft.js';

async function main(): Promise<void> {
  const [inputPath] = process.argv.slice(2);

  if (!inputPath) {
    console.error('Usage: oft-dump ./template.oft');
    process.exitCode = 1;
    return;
  }

  const buffer = await readFile(inputPath);
  const result = inspectOft(buffer);

  console.log(`subject: ${result.hasSubject}`);
  console.log(`body: ${result.hasBody}`);
  console.log(`html: ${result.hasHtml}`);
  console.log(`properties: ${result.hasPropertiesStream}`);
  console.log(`namedProperties: ${result.hasNamedPropertyMapping}`);
  console.log(`recipients: ${result.recipientCount}`);
  console.log(`attachments: ${result.attachmentCount}`);
  console.log('');

  for (const entry of result.entries) {
    console.log(`${entry.name}\t${entry.size}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
