import { Injectable, Logger, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { BOT_PERSONALITY } from '../../../config/prompts/bot.personality';
import { GithubService } from '../../github/github.service';
import { ProjectsService } from '../../projects/projects.service';
import { AdminStatsService } from '../../admin/services/admin-stats.service';
import { PrismaService } from '../../../prisma/prisma.service';

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
}

@Injectable()
export class HuggingFaceService implements OnModuleInit {
  private readonly logger = new Logger(HuggingFaceService.name);
  
  // Request tracking
  private requestCount = 0;
  private requestTimestamps: number[] = [];
  
  // Personality prompt for Juan Camilo
  private readonly personalityPrompt = BOT_PERSONALITY.systemPrompt;
  private defaultPersonaId: string;

  constructor(
    private configService: ConfigService,
    private readonly githubService: GithubService,
    private readonly projectsService: ProjectsService,
    private readonly statsService: AdminStatsService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultPersona();
  }

  /**
   * Ensure a default persona exists in the database
   */
  private async ensureDefaultPersona() {
    try {
      let persona = await this.prisma.persona.findFirst({
        where: { name: 'Juan Camilo' }
      });

      if (!persona) {
        persona = await this.prisma.persona.create({
          data: {
            name: 'Juan Camilo',
            prompt: this.personalityPrompt,
            model: this.configService.get('HUGGINGFACE_MODEL') || 'mistralai/Mistral-7B-Instruct-v0.2',
            settings: {},
            isActive: true,
          }
        });
        this.logger.log('✅ Default bot persona created');
      }

      this.defaultPersonaId = persona.id;
    } catch (error) {
      this.logger.error(`Error ensuring default persona: ${error.message}`);
    }
  }

  /**
   * Get real-time context about Juan's work, projects and site navigation
   */
  private async getJuanContext(): Promise<string> {
    try {
      const [githubStats, projects, apiStats] = await Promise.all([
        this.githubService.getStats().catch(() => null),
        this.projectsService.listPublicProjects({}).catch(() => []),
        this.statsService.getStats().catch(() => null),
      ]);

      let context = '\n\nDATOS REALES EN TIEMPO REAL (Úsalos para responder preguntas específicas):\n';

      // Navigation & Sections
      context += `SECCIONES DEL SITIO Y NAVEGACIÓN:\n`;
      context += `- Inicio: #home\n`;
      context += `- Sobre mí: #about\n`;
      context += `- Proyectos: #projects (Página completa en /projects)\n`;
      context += `- Estadísticas: /stats (O sección #stats)\n`;
      context += `- Contacto: #contact\n`;
      context += `INSTRUCCIÓN: Si el usuario quiere ir a una sección, indícale el link o el ancla (ej: "Podés ver mis proyectos en /projects").\n\n`;

      if (githubStats) {
        context += `GITHUB STATS:\n`;
        context += `- Username: ${githubStats.username}\n`;
        context += `- Repos: ${githubStats.totalRepos} (Public: ${githubStats.publicRepos}, Private: ${githubStats.privateRepos})\n`;
        context += `- Stars: ${githubStats.stars} | Followers: ${githubStats.followers}\n`;
        context += `- Tech: ${githubStats.languageData.map(l => l.name).join(', ')}\n\n`;
      }

      if (projects && projects.length > 0) {
        context += `\nDETALLE DE PROYECTOS Y REPOSITORIOS:\n`;
        projects.slice(0, 10).forEach((p: any) => {
          const techs = p.technologies?.map((t: any) => t.technology.name).join(', ') || 'N/A';
          context += `- ${p.title}: ${p.description} (Tech: ${techs})\n`;
          if (p.problem) context += `  Problema: ${p.problem}\n`;
          if (p.solution) context += `  Solución: ${p.solution}\n`;
        });
        context += `\n`;
      }

      if (apiStats) {
        context += `API PERFORMANCE (Estado del Servidor):\n`;
        context += `- Uptime: ${apiStats.uptime}\n`;
        context += `- Server Restarts: ${apiStats.restartCount}\n`;
        context += `- Total Requests: ${apiStats.totalRequests}\n`;
        context += `- Avg Response: ${apiStats.avgResponseTimeMs}ms\n`;
        context += `- Requests/min: ${apiStats.requestsPerMinute}\n`;
      }

      return context;
    } catch (error) {
      this.logger.warn(`Failed to fetch Juan context: ${error.message}`);
      return '';
    }
  }

  /**
   * Detect if the message is in English or Spanish
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
      'hello', 'hi', 'hey', 'know', 'tell', 'show', 'give', 'make', 'need', 'want', 
      'work', 'using', 'built', 'create', 'awesome', 'great', 'wow'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    const englishCount = words.filter(w => englishWords.includes(w)).length;
    const threshold = Math.max(2, words.length * 0.15);
    
    return englishCount >= threshold ? 'en' : 'es';
  }

  /**
   * Add language-specific instructions to the system prompt
   */
  private getLanguageInstruction(language: 'en' | 'es'): string {
    return language === 'en'
      ? `\n\nLANGUAGE INSTRUCTION (MANDATORY): The user is speaking English. You MUST respond in English. Do not use Spanish words unless specifically asked. Keep the Juan Camilo persona: warm, direct, expert but approachable. Use "dude", "bro", "cool" naturally.`
      : `\n\nINSTRUCCIÓN DE IDIOMA (MANDATORIA): El usuario habla español. Respondé en español (voseo rioplatense/colombiano según el tono de Juan). NO respondas en inglés. Mantené el personaje: directo, apasionado por el backend, experto. Usá "brother", "dale", "de una", "fantástico" naturalmente.`;
  }

  /**
   * Track request for metrics
   */
  private trackRequest() {
    const now = Date.now();
    this.requestCount++;
    this.requestTimestamps.push(now);
    
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
    
    const requestsPerMinute = this.requestTimestamps.length;
    this.logger.log(`📊 Requests: ${this.requestCount} total | ${requestsPerMinute}/min`);
  }

  /**
   * Get request stats
   */
  async getStats() {
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo).length;
    const activeThreads = await this.prisma.aIThread.count();
    
    return {
      totalRequests: this.requestCount,
      requestsPerMinute: recentRequests,
      activeConversations: activeThreads,
    };
  }

  /**
   * Send a chat message to HuggingFace and get a response
   */
  async chat(message: string, conversationId?: string): Promise<ChatResponse> {
    this.trackRequest();
    
    const apiKey = this.configService.get<string>('HUGGINGFACE_API_KEY');
    const model = this.configService.get<string>('HUGGINGFACE_MODEL');
    const apiUrl = this.configService.get<string>('HUGGINGFACE_API_URL');
    const maxTokens = this.configService.get<number>('HUGGINGFACE_MAX_TOKENS') || 512;
    const timeout = this.configService.get<number>('HUGGINGFACE_TIMEOUT_MS') || 30000;

    if (!apiKey) {
      throw new HttpException('HuggingFace config incomplete', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const sanitizedMessage = this.sanitizeInput(message);
    const language = this.detectLanguage(sanitizedMessage);
    const languageInstruction = this.getLanguageInstruction(language);

    // Fetch dynamic context about Juan
    const juanContext = await this.getJuanContext();

    let threadId = conversationId;
    let history: ConversationMessage[] = [];

    if (threadId) {
      const thread = await this.prisma.aIThread.findUnique({
        where: { id: threadId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 10 } }
      });
      if (thread) {
        history = thread.messages.map(m => ({
          role: m.role as any,
          content: m.content
        }));
      } else {
        threadId = undefined; // Thread not found, will create new
      }
    }

    try {
      const chatMessages = this.buildChatMessages(
        this.personalityPrompt + juanContext,
        languageInstruction,
        history,
        sanitizedMessage,
      );

      const response = await this.callHuggingFace(apiUrl!, model!, apiKey, chatMessages, maxTokens, timeout);
      const reply = this.extractChatReply(response);

      // Save to database
      if (!threadId) {
        const newThread = await this.prisma.aIThread.create({
          data: {
            personaId: this.defaultPersonaId,
            title: sanitizedMessage.substring(0, 50),
          }
        });
        threadId = newThread.id;
      }

      await this.prisma.aIMessage.createMany({
        data: [
          { threadId, role: 'user', content: sanitizedMessage },
          { threadId, role: 'assistant', content: reply },
        ]
      });

      return { reply, conversationId: threadId };
    } catch (error) {
      this.logger.error(`Error chatting: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException('IA Service Error', HttpStatus.SERVICE_UNAVAILABLE);
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
        throw new HttpException(`HuggingFace error: ${response.status} - ${errorBody}`, HttpStatus.BAD_GATEWAY);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') throw new HttpException('IA Timeout', HttpStatus.GATEWAY_TIMEOUT);
      throw error;
    }
  }

  /**
   * Build messages for the chat API
   */
  private buildChatMessages(
    fullSystemPrompt: string,
    languageInstruction: string,
    conversation: ConversationMessage[],
    userMessage: string,
  ): { role: string; content: string }[] {
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: fullSystemPrompt + languageInstruction },
    ];

    for (const msg of conversation) {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

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
   * Sanitize user input
   */
  private sanitizeInput(input: string): string {
    return input
      .replace(/<\|system\|>/gi, '')
      .replace(/<\|user\|>/gi, '')
      .replace(/<\|assistant\|>/gi, '')
      .replace(/\x00/g, '')
      .trim();
  }

  /**
   * List bot threads for admin
   */
  async listThreads(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.aIThread.count(),
      this.prisma.aIThread.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { messages: true } },
          messages: { orderBy: { createdAt: 'asc' } }
        }
      })
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Clear conversation
   */
  async clearConversation(conversationId: string): Promise<boolean> {
    try {
      await this.prisma.aIMessage.deleteMany({ where: { threadId: conversationId } });
      await this.prisma.aIThread.delete({ where: { id: conversationId } });
      return true;
    } catch (error) {
      this.logger.error(`Error clearing conversation: ${error.message}`);
      return false;
    }
  }
}