import { Injectable, NotImplementedException } from '@nestjs/common';
import { IStorageDriver } from './storage.driver.interface';

@Injectable()
export class S3StorageDriver implements IStorageDriver {
  async upload(file: Express.Multer.File): Promise<string> {
    // Here you would implement AWS S3 SDK logic
    throw new NotImplementedException('S3 Storage Driver not implemented yet');
  }

  async delete(url: string): Promise<void> {
    // Here you would implement AWS S3 SDK delete logic
    throw new NotImplementedException('S3 Storage Driver not implemented yet');
  }
}
