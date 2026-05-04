export interface IStorageDriver {
  /**
   * Uploads a file to the storage provider.
   * @param file The file to upload.
   * @returns The public URL of the uploaded file.
   */
  upload(file: Express.Multer.File): Promise<string>;

  /**
   * Deletes a file from the storage provider.
   * @param url The public URL of the file to delete.
   */
  delete(url: string): Promise<void>;
}
