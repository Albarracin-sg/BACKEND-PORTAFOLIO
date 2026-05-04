import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { HuggingFaceService, ChatResponse } from '../services/huggingface.service';
import { BotChatDto } from '../dto/chat.dto';
import { RateLimitGuard } from '../../../common/guards/rate-limit.guard';
import { RateLimit } from '../../../common/decorators/rate-limit.decorator';

@Controller({
  path: 'bot',
  version: '1',
})
export class BotController {
  constructor(private readonly huggingFaceService: HuggingFaceService) {}

  @Post('chat')
  @RateLimit({ limit: 10, windowMs: 60000 })
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body() dto: { message: string; conversationId?: string },
    @Ip() ip: string,
  ): Promise<ChatResponse> {
    // Validate with Zod
    const validated = BotChatDto.parse(dto);
    return this.huggingFaceService.chat(validated.message, validated.conversationId);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  getStats() {
    return this.huggingFaceService.getStats();
  }
}