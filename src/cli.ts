#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createOft } from './create-oft.js';

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readRepeatedOption(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) values.push(args[index + 1]);
  }
  return values;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputPath = args.find((arg) => !arg.startsWith('-'));
  const outPath = readOption(args, '--out');
  const subject = readOption(args, '--subject');
  const to = readRepeatedOption(args, '--to');
  const cc = readRepeatedOption(args, '--cc');
  const bcc = readRepeatedOption(args, '--bcc');

  if (!inputPath || !outPath) {
    console.error(
      'Usage: html-to-oft ./email.html --subject "Promo Junio" --to customer@example.com --out promo.oft',
    );
    process.exitCode = 1;
    return;
  }

  const html = await readFile(inputPath, 'utf8');
  const oft = await createOft({ subject, html, to, cc, bcc });
  await writeFile(outPath, oft);
  console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
