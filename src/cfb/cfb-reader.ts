import * as CFB from 'cfb';

export interface CfbEntryInfo {
  name: string;
  size: number;
  type?: number;
}

function parseCfb(buffer: Buffer): CFB.CFB$Container {
  return CFB.read(buffer, { type: 'buffer' });
}

function stripRoot(fullPath: string, root: string): string {
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
  return fullPath.startsWith(normalizedRoot) ? fullPath.slice(normalizedRoot.length) : fullPath;
}

export function listCfbEntries(buffer: Buffer): CfbEntryInfo[] {
  const cfb = parseCfb(buffer);
  const root = cfb.FullPaths[0] ?? '';

  return cfb.FullPaths.map((fullPath, index) => {
    const entry = cfb.FileIndex[index];
    return {
      name: stripRoot(fullPath, root),
      size: entry?.size ?? 0,
      type: entry?.type,
    };
  }).filter((entry) => entry.name.length > 0 && entry.name !== '/' && entry.name.charCodeAt(0) >= 32);
}

export function readCfbStream(buffer: Buffer, name: string): Buffer | null {
  const cfb = parseCfb(buffer);
  const root = cfb.FullPaths[0] ?? '';
  const entry =
    CFB.find(cfb, name) ??
    cfb.FileIndex.find((fileEntry, index) => stripRoot(cfb.FullPaths[index] ?? '', root) === name);
  if (!entry?.content) return null;
  return Buffer.from(entry.content);
}

export function readCfbContainer(buffer: Buffer): CFB.CFB$Container {
  return parseCfb(buffer);
}
