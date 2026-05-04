import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { S3StorageDriver } from './drivers/s3-storage.driver';
import { PrismaModule } from '../../prisma/prisma.module';

const StorageDriverProvider: Provider = {
  provide: 'STORAGE_DRIVER',
  useFactory: (configService: ConfigService) => {
    const driver = configService.get('STORAGE_DRIVER');
    return driver === 's3' ? new S3StorageDriver() : new LocalStorageDriver();
  },
  inject: [ConfigService],
};

@Module({
  imports: [PrismaModule],
  controllers: [MediaController],
  providers: [MediaService, StorageDriverProvider],
  exports: [MediaService],
})
export class MediaModule {}
