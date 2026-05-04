import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HuggingFaceService, ChatResponse } from '../services/huggingface.service';
import { BotChatDto } from '../dto/chat.dto';

@Controller({
  path: 'bot',
  version: '1',
})
export class BotController {
  constructor(private readonly huggingFaceService: HuggingFaceService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body() dto: { message: string; conversationId?: string },
  ): Promise<ChatResponse> {
    // Validate with Zod
    const validated = BotChatDto.parse(dto);
    return this.huggingFaceService.chat(validated.message, validated.conversationId);
  }
}