import { Injectable } from '@nestjs/common';
import { IStorageDriver } from './storage.driver.interface';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class LocalStorageDriver implements IStorageDriver {
  private readonly uploadsPath = join(process.cwd(), 'uploads');

  async upload(file: Express.Multer.File): Promise<string> {
    // In local storage, Multer already saved the file.
    // We just return the URL.
    return `/uploads/${file.filename}`;
  }

  async delete(url: string): Promise<void> {
    const filename = url.replace('/uploads/', '');
    const filePath = join(this.uploadsPath, filename);
    try {
      await unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete file: ${filePath}`, error);
    }
  }
}
