import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { BOT_PERSONALITY } from '../../../config/prompts/bot.personality';

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
}

@Injectable()
export class HuggingFaceService {
  private readonly logger = new Logger(HuggingFaceService.name);
  
  // In-memory conversation storage (for simplicity - can be replaced with DB)
  private readonly conversations = new Map<string, ConversationMessage[]>();
  
  // Request tracking
  private requestCount = 0;
  private requestTimestamps: number[] = [];
  
  // Personality prompt for Juan Camilo (imported from config)
  private readonly personalityPrompt = BOT_PERSONALITY.systemPrompt;

  constructor(private configService: ConfigService) {}

  /**
   * Detect if the message is in English or Spanish
   * Simple heuristic based on common words
   */
  private detectLanguage(text: string): 'en' | 'es' {
    const englishWords = [
      'the', 'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 'does', 
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'what', 'how', 'why', 'when', 'where', 'who', 'which', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
      'them', 'my', 'your', 'his', 'its', 'our', 'their', 'a', 'an', 'and', 'or', 'but',
      'if', 'then', 'so', 'because', 'since', 'for', 'with', 'about', 'into', 'from',
      'project', 'code', 'stack', 'technology', 'help', 'thanks', 'thank', 'please',
      'hello', 'hi', 'hey', 'can', 'would', 'could', 'know', 'tell', 'show', 'give',
      'make', 'need', 'want', 'think', 'see', 'look', 'work', 'using', 'built', 'create'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    const englishCount = words.filter(w => englishWords.includes(w)).length;
    const threshold = Math.max(3, words.length * 0.2);
    
    return englishCount >= threshold ? 'en' : 'es';
  }

  /**
   * Add language-specific instructions to the system prompt
   */
  private getLanguageInstruction(language: 'en' | 'es'): string {
    return language === 'en'
      ? `\n\nIMPORTANT: The user is writing in English. Respond in English with the same warm, direct tone as always. Use words like "bro", "dude", "cool", "nice" naturally.`
      : `\n\nIMPORTANTE: El usuario escribe en español. Responde en español con el mismo tono cálido y directo de siempre. Usá palabras como "chavalín", "brother", "dale", "pillé" naturalmente.`;
  }

  /**
   * Track request for metrics
   */
  private trackRequest() {
    const now = Date.now();
    this.requestCount++;
    this.requestTimestamps.push(now);
    
    // Keep only last 60 seconds of timestamps
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
    
    const requestsPerMinute = this.requestTimestamps.length;
    this.logger.log(`📊 Requests: ${this.requestCount} total | ${requestsPerMinute}/min`);
  }

  /**
   * Get request stats
   */
  getStats() {
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo).length;
    
    return {
      totalRequests: this.requestCount,
      requestsPerMinute: recentRequests,
      activeConversations: this.conversations.size,
    };
  }

  /**
   * Send a chat message to HuggingFace and get a response
   */
  async chat(message: string, conversationId?: string): Promise<ChatResponse> {
    // Track this request
    this.trackRequest();
    
    const apiKey = this.configService.get<string>('HUGGINGFACE_API_KEY');
    const model = this.configService.get<string>('HUGGINGFACE_MODEL');
    const apiUrl = this.configService.get<string>('HUGGINGFACE_API_URL');
    const maxTokens = this.configService.get<number>('HUGGINGFACE_MAX_TOKENS') || 512;
    const timeout = this.configService.get<number>('HUGGINGFACE_TIMEOUT_MS') || 30000;

    if (!apiKey) {
      throw new HttpException(
        'Configuración de HuggingFace incompleta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Sanitize user message to prevent prompt injection
    const sanitizedMessage = this.sanitizeInput(message);

    // Detect language
    const language = this.detectLanguage(sanitizedMessage);
    const languageInstruction = this.getLanguageInstruction(language);

    // Get or create conversation
    const convId = conversationId || randomUUID();
    const conversation = this.conversations.get(convId) || [];

    try {
      // Build messages for the chat API
      const chatMessages = this.buildChatMessages(
        this.personalityPrompt,
        languageInstruction,
        conversation,
        sanitizedMessage,
      );

      const response = await this.callHuggingFace(
        apiUrl!, 
        model!, 
        apiKey, 
        chatMessages, 
        maxTokens, 
        timeout
      );
      
      const reply = this.extractChatReply(response);

      // Store the conversation
      conversation.push({ role: 'user', content: sanitizedMessage });
      conversation.push({ role: 'assistant', content: reply });
      this.conversations.set(convId, conversation);

      return {
        reply,
        conversationId: convId,
      };
    } catch (error) {
      this.logger.error(`Error chatting with HuggingFace: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Error al comunicarse con el servicio de IA',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Call HuggingFace Chat Completions API
   */
  private async callHuggingFace(
    apiUrl: string,
    model: string,
    apiKey: string,
    messages: { role: string; content: string }[],
    maxTokens: number,
    timeout: number,
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Use URL directly - already configured for chat completions in .env
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
          temperature: 0.7,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new HttpException(
          `Error de HuggingFace: ${response.status} - ${errorBody}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new HttpException(
          'Tiempo de espera excedido al comunicarse con la IA',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      
      throw error;
    }
  }

  /**
   * Build messages for the chat API
   */
  private buildChatMessages(
    personalityPrompt: string,
    languageInstruction: string,
    conversation: ConversationMessage[],
    userMessage: string,
  ): { role: string; content: string }[] {
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: personalityPrompt + languageInstruction },
    ];

    // Add conversation history
    for (const msg of conversation.slice(-10)) {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * Extract reply from chat completions response
   */
  private extractChatReply(response: any): string {
    if (!response?.choices?.[0]?.message?.content) {
      return 'Lo siento, no pude generar una respuesta.';
    }

    return response.choices[0].message.content.trim();
  }

  /**
   * Sanitize user input to prevent prompt injection
   */
  private sanitizeInput(input: string): string {
    // Remove potential prompt injection patterns
    return input
      .replace(/<\|system\|>/gi, '')
      .replace(/<\|user\|>/gi, '')
      .replace(/<\|assistant\|>/gi, '')
      .replace(/\x00/g, '') // Remove null bytes
      .trim();
  }

  /**
   * Sanitize output to ensure clean response
   */
  private sanitizeOutput(output: string): string {
    return output
      .replace(/<\|.*?\|>/g, '') // Remove any remaining special tokens
      .replace(/\n{3,}/g, '\n\n') // Normalize excessive newlines
      .trim();
  }

  /**
   * Clear conversation history (for testing or reset)
   */
  clearConversation(conversationId: string): boolean {
    return this.conversations.delete(conversationId);
  }
}