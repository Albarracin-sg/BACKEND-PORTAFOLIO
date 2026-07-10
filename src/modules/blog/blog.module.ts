import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogPublicController } from './blog.public.controller';
import { BlogAdminController } from './blog.admin.controller';

@Module({
  controllers: [BlogPublicController, BlogAdminController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
