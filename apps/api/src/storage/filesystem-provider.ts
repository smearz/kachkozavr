import { promises as fs } from "node:fs";
import path from "node:path";
import { StorageProvider, StoredObject } from "./provider.js";

export class FilesystemStorageProvider implements StorageProvider {
  constructor(private readonly rootDir: string) {}

  async save(input: { objectKey: string; bytes: Buffer }): Promise<StoredObject> {
    const fullPath = this.getPath({ objectKey: input.objectKey });
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, input.bytes);
    return {
      objectKey: input.objectKey,
      absolutePath: fullPath,
      sizeBytes: input.bytes.byteLength
    };
  }

  getPath(input: { objectKey: string }): string {
    return path.resolve(this.rootDir, input.objectKey);
  }
}
