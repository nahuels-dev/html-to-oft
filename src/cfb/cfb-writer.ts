import * as CFB from 'cfb';

export class CfbWriter {
  private readonly cfb: CFB.CFB$Container;

  constructor(base?: CFB.CFB$Container) {
    this.cfb = base ?? CFB.utils.cfb_new();
  }

  addStream(path: string, content: Buffer): void {
    CFB.utils.cfb_add(this.cfb, path, content);
  }

  write(): Buffer {
    return Buffer.from(CFB.write(this.cfb, { type: 'buffer', fileType: 'cfb' }));
  }
}
