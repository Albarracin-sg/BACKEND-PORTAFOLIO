import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubPublicController } from './github.public.controller';

@Module({
  controllers: [GithubPublicController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
