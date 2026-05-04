import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IStorageDriver } from './drivers/storage.driver.interface';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('STORAGE_DRIVER') private readonly storageDriver: IStorageDriver,
  ) {}

  async createFromUpload(file: Express.Multer.File) {
    const url = await this.storageDriver.upload(file);
    return this.prisma.media.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
      },
    });
  }

  async deleteMedia(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (media) {
      await this.storageDriver.delete(media.url);
      return this.prisma.media.delete({ where: { id } });
    }
  }
}
