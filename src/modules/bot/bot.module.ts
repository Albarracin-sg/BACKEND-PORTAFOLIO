import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotController } from './controllers/bot.controller';
import { HuggingFaceService } from './services/huggingface.service';

@Module({
  imports: [ConfigModule],
  controllers: [BotController],
  providers: [HuggingFaceService],
  exports: [HuggingFaceService],
})
export class BotModule {}