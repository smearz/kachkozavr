export type StoredObject = {
  objectKey: string;
  absolutePath: string;
  sizeBytes: number;
};

export interface StorageProvider {
  save(input: { objectKey: string; bytes: Buffer }): Promise<StoredObject>;
  getPath(input: { objectKey: string }): string;
}
