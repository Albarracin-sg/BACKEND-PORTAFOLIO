import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {}

  async callModel(
    messages: { role: string; content: string }[],
    options?: {
      maxTokens?: number;
      temperature?: number;
      timeout?: number;
    },
  ): Promise<string> {
    const apiKey = this.configService.get<string>('HUGGINGFACE_API_KEY');
    const model = this.configService.get<string>('HUGGINGFACE_MODEL');
    const apiUrl = this.configService.get<string>('HUGGINGFACE_API_URL');
    
    if (!apiKey || !apiUrl || !model) {
      this.logger.error('AI configuration incomplete');
      return '';
    }

    const maxTokens = options?.maxTokens || 1024;
    const temperature = options?.temperature || 0.7;
    const timeout = options?.timeout || 60000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`AI error: ${response.status} - ${errorBody}`);
        return '';
      }

      const result = await response.json();
      // Handle both standard OpenAI-like format and some HF specific ones
      return result.choices?.[0]?.message?.content?.trim() || result[0]?.generated_text || '';
    } catch (error) {
      clearTimeout(timeoutId);
      this.logger.error(`Error calling AI model: ${error.message}`);
      return '';
    }
  }
}
