import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService, AiCreditsExhaustedError } from '../ai/ai.service';
import { GithubService } from '../github/github.service';
import { BlogService } from '../blog/blog.service';
import { DiagramsService } from '../diagrams/diagrams.service';
import { DiagramType } from '@prisma/client';

export interface ContentGenerationResult {
  project: { id: string; title: string };
  diagram: { id: string; title: string } | null;
  article: { id: string; slug: string; title: string } | null;
  errors: string[];
}

@Injectable()
export class ContentGenerationService {
  private readonly logger = new Logger(ContentGenerationService.name);
  private creditsExhausted = false; // Early-stop flag for 402

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly githubService: GithubService,
    private readonly blogService: BlogService,
    private readonly diagramsService: DiagramsService,
  ) {}

  async generateForProject(projectId: string): Promise<ContentGenerationResult> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { technologies: { include: { technology: true } } },
    });

    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    const result: ContentGenerationResult = {
      project: { id: project.id, title: project.title },
      diagram: null,
      article: null,
      errors: [],
    };

    const githubUrl = project.githubUrl;
    if (!githubUrl) {
      result.errors.push('No GitHub URL associated with this project');
      return result;
    }

    const { owner, repo } = this.parseGithubUrl(githubUrl);
    if (!owner || !repo) {
      result.errors.push('Could not parse owner/repo from GitHub URL');
      return result;
    }

    // Generate diagram
    try {
      result.diagram = await this.generateDiagram(project, owner, repo);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Diagram generation failed for ${project.title}: ${msg}`);
      result.errors.push(`Diagram: ${msg}`);
      // If we hit credits exhausted in diagram, skip article too
      if (this.creditsExhausted) return result;
    }

    // Generate blog article
    try {
      result.article = await this.generateBlogArticle(project, owner, repo);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Article generation failed for ${project.title}: ${msg}`);
      result.errors.push(`Article: ${msg}`);
    }

    return result;
  }

  async generateForAllMissing(): Promise<ContentGenerationResult[]> {
    this.creditsExhausted = false; // Reset flag at start

    const projects = await this.prisma.project.findMany({
      where: { githubUrl: { not: '' } },
    });

    const results: ContentGenerationResult[] = [];

    for (let i = 0; i < projects.length; i++) {
      // Early stop: credits exhausted, no point continuing
      if (this.creditsExhausted) {
        this.logger.warn(`⚠️ Credits exhausted — stopping content generation after ${results.length} projects`);
        break;
      }

      const project = projects[i];

      // Check if project already has diagrams AND articles
      const [diagramCount, articleCount] = await Promise.all([
        this.prisma.architectureDiagram.count({ where: { projectId: project.id } }),
        this.prisma.article.count({ where: { projectId: project.id } }),
      ]);

      if (diagramCount > 0 && articleCount > 0) {
        this.logger.log(`Skipping ${project.title} — already has diagram and article`);
        continue;
      }

      this.logger.log(`Generating content for ${project.title} (${i + 1}/${projects.length})...`);
      const result = await this.generateForProject(project.id);
      results.push(result);

      // Rate limiting delay between projects (1.5s)
      if (i < projects.length - 1) {
        await this.delay(1500);
      }
    }

    return results;
  }

  private async generateDiagram(
    project: { id: string; title: string; description: any; category: string | null; technologies: any },
    owner: string,
    repo: string,
  ): Promise<{ id: string; title: string } | null> {
    const [tree, readme] = await Promise.all([
      this.githubService.getRepoTree(owner, repo),
      this.githubService.getRepoFile(owner, repo, 'README.md'),
    ]);

    const fileList = tree?.tree
      ? tree.tree.slice(0, 80).map((f: any) => f.path).join('\n')
      : 'Unable to retrieve file tree';

    const systemPrompt = `You are a senior software architect creating a System Context architecture diagram.
You MUST return ONLY valid JSON. No markdown code fences, no explanation, no text outside the JSON.
The JSON must have exactly this structure:

{
  "nodes": [
    { "id": "1", "type": "default", "position": { "x": 0, "y": 0 }, "data": { "label": "System Name" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "animated": false, "label": "description" }
  ]
}

RULES:
- Create 4-8 nodes representing the main components/systems
- Nodes must be laid out in a logical top-to-bottom or left-to-right flow
- Use the "default" node type for all nodes
- Position nodes with clear spacing (150-250px apart)
- Edge labels should describe the relationship or data flow
- Labels MUST be bilingual format: "Label EN / Label ES"
- Keep labels concise (max 3-4 words)
- One central node should be the project itself
- Surrounding nodes represent external systems, databases, APIs, users, etc.`;

    const techNames = Array.isArray(project.technologies)
      ? project.technologies.map((t: any) => t.technology?.name ?? t.name ?? 'unknown')
      : [];
    const descStr = typeof project.description === 'object' ? JSON.stringify(project.description) : String(project.description ?? '');

    const userPrompt = `Create a System Context architecture diagram for this project.

PROJECT: ${project.title}
CATEGORY: ${project.category ?? 'Unknown'}
TECHNOLOGIES: ${techNames.join(', ')}

FILE STRUCTURE:
${fileList}

README:
${readme?.substring(0, 3000) ?? 'No README available'}

Generate the React Flow diagram JSON. Return ONLY the JSON object, nothing else.`;

    const response = await this.callModelWithRetry(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 2048, temperature: 0.7, timeout: 120000 },
    );

    const parsed = this.extractJson(response);
    if (!parsed || !parsed.nodes || !parsed.edges) {
      throw new Error('AI returned invalid diagram structure');
    }

    // Normalize node positions and ensure valid structure
    const nodes = parsed.nodes.map((node: any, idx: number) => ({
      id: String(node.id ?? idx + 1),
      type: 'default',
      position: {
        x: Number(node.position?.x ?? (idx % 3) * 250),
        y: Number(node.position?.y ?? Math.floor(idx / 3) * 150),
      },
      data: { label: String(node.data?.label ?? `Component ${idx + 1}`) },
    }));

    const edges = parsed.edges.map((edge: any, idx: number) => ({
      id: String(edge.id ?? `e${idx}`),
      source: String(edge.source),
      target: String(edge.target),
      animated: Boolean(edge.animated),
      label: edge.label ? String(edge.label) : undefined,
    }));

    const title = {
      es: `Diagrama de Contexto: ${project.title}`,
      en: `Context Diagram: ${project.title}`,
    };
    const description = {
      es: `Diagrama de arquitectura de nivel de contexto del sistema para ${project.title}`,
      en: `System context level architecture diagram for ${project.title}`,
    };

    const diagram = await this.diagramsService.createDiagram(project.id, {
      title,
      description,
      type: DiagramType.SYSTEM_CONTEXT,
      source: { nodes, edges } as any,
      position: 0,
      published: true,
    });

    return { id: diagram.id, title: title.es };
  }

  private async generateBlogArticle(
    project: { id: string; title: string; description: any; category: string | null; technologies: any },
    owner: string,
    repo: string,
  ): Promise<{ id: string; slug: string; title: string } | null> {
    const [tree, readme] = await Promise.all([
      this.githubService.getRepoTree(owner, repo),
      this.githubService.getRepoFile(owner, repo, 'README.md'),
    ]);

    const fileList = tree?.tree
      ? tree.tree.slice(0, 80).map((f: any) => f.path).join('\n')
      : 'Unable to retrieve file tree';

    const systemPrompt = `You are Juan Camilo Albarracín Urrego, a senior backend architect and developer. You write technical blog articles about your projects with a personal, narrative tone. You write in first person, as if telling someone how you built something and why.

You MUST return ONLY valid JSON. No markdown code fences, no explanation, no text outside the JSON.
The JSON must have exactly this structure:

{
  "title": { "es": "Spanish title", "en": "English title" },
  "excerpt": { "es": "Short excerpt in Spanish", "en": "Short excerpt in English" },
  "content": { "es": "Full article in Spanish (Markdown)", "en": "Full article in English (Markdown)" },
  "metaTitle": { "es": "SEO title Spanish", "en": "SEO title English" },
  "metaDescription": { "es": "Meta description Spanish", "en": "Meta description English" },
  "tags": ["tag1", "tag2", "tag3"]
}

The "content" field (both es and en) MUST follow this EXACT article structure in Markdown:

# [Title]

## El problema / The problem
Describe the real-world problem or manual process that motivated the project. Be specific about the pain points. Write as if explaining to a fellow developer why you built this.

## Por qué [Technology/Approach] / Why [Technology/Approach]
Explain why you chose this specific technology or approach over alternatives. Compare with the traditional way and explain the concrete reason your case needed something different. Be opinionated — state your reasoning clearly.

## Arquitectura / Architecture
Include a text-based architecture diagram (using arrows and labels, like: Component A → Component B → Component C). Then list 2-4 key architectural decisions with bold labels and clear explanations of WHY each decision was made.

## El trade-off que nadie te cuenta / The trade-off nobody tells you about
Describe ONE real trade-off you faced during implementation. This is the most important section — it shows honesty and deep understanding. Explain what went wrong or what you had to compromise on, and how you solved it.

## Resultado / Results
List 2-4 concrete outcomes as bullet points. Use specific metrics or observations where possible (response times, reduced manual work, error rates, etc.).

## Lo que haría diferente / What I'd do differently
One honest reflection about what you would change if starting over. This builds trust — show vulnerability and learning.

---

END with: "¿Querés profundizar en algún componente? Contactame o revisá el código en [GitHub link]."

IMPORTANT RULES for content:
- Write 800-1500 words per language
- Tone: personal, narrative, first-person ("yo", "I"). NOT corporate or generic.
- Include the project author as: "Juan Camilo Albarracín Urrego"
- Include code examples in fenced blocks when relevant to explain a concept
- Spanish must use "voseo" (Argentine Spanish: usás, podés, tenés, etc.)
- Be specific and technical — mention real tools, real patterns, real decisions
- Tags should be 3-6 relevant technical keywords
- Meta titles under 60 characters
- Meta descriptions under 160 characters`;

    const techNames = Array.isArray(project.technologies)
      ? project.technologies.map((t: any) => t.technology?.name ?? t.name ?? 'unknown')
      : [];
    const descStr = typeof project.description === 'object' ? JSON.stringify(project.description) : String(project.description ?? '');

    const userPrompt = `Write a technical blog article about this project.

PROJECT: ${project.title}
DESCRIPTION: ${descStr}
CATEGORY: ${project.category ?? 'Unknown'}
TECHNOLOGIES: ${techNames.join(', ')}

FILE STRUCTURE:
${fileList}

README:
${readme?.substring(0, 4000) ?? 'No README available'}

Generate the blog article JSON. Return ONLY the JSON object, nothing else.`;

    const response = await this.callModelWithRetry(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 4096, temperature: 0.7, timeout: 180000 },
    );

    const parsed = this.extractJson(response);
    if (!parsed || !parsed.title || !parsed.content) {
      throw new Error('AI returned invalid article structure');
    }

    const title = {
      es: String(parsed.title?.es ?? project.title),
      en: String(parsed.title?.en ?? project.title),
    };
    const content = {
      es: String(parsed.content?.es ?? ''),
      en: String(parsed.content?.en ?? ''),
    };
    const excerpt = {
      es: String(parsed.excerpt?.es ?? ''),
      en: String(parsed.excerpt?.en ?? ''),
    };
    const metaTitle = {
      es: String(parsed.metaTitle?.es ?? title.es),
      en: String(parsed.metaTitle?.en ?? title.en),
    };
    const metaDescription = {
      es: String(parsed.metaDescription?.es ?? excerpt.es),
      en: String(parsed.metaDescription?.en ?? excerpt.en),
    };
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map(String)
      : [];

    const slug = this.generateSlug(title.es);

    const article = await this.blogService.create({
      title,
      content,
      excerpt,
      slug,
      author: 'Juan Camilo Albarracín Urrego',
      published: true,
      featured: false,
      metaTitle,
      metaDescription,
      projectId: project.id,
      tags,
    });

    return { id: article.id, slug: article.slug, title: title.es };
  }

  private parseGithubUrl(url: string): { owner: string | null; repo: string | null } {
    try {
      // Handle both https://github.com/owner/repo and https://github.com/owner/repo.git
      const match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
      return { owner: null, repo: null };
    } catch {
      return { owner: null, repo: null };
    }
  }

  private extractJson(text: string): any {
    if (!text) { this.logger.warn('extractJson: empty response'); return null; }

    // Sanitize common AI hallucinations before parsing
    let cleaned = text
      // Replace em-dash and en-dash with regular hyphen-minus
      .replace(/[\u2013\u2014\u2212]/g, '-')
      // Remove backslash-pipe patterns like (\|200\|)
      .replace(/\\\|(\d+)\\\|/g, '$1')
      // Replace curly quotes with straight quotes
      .replace(/[\u201C\u201D\u2018\u2019]/g, '"')
      // Remove zero-width characters
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
      // Replace unicode "usere" or similar garbage at position values
      .trim();

    // Try to find JSON block wrapped in ```json ... ```
    const codeFenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeFenceMatch) {
      try {
        return JSON.parse(codeFenceMatch[1].trim());
      } catch {
        // Fall through to other methods
      }
    }

    // Try to find a JSON object by matching braces
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch {
        // Try to fix common issues: trailing commas, missing quotes
        try {
          const fixed = cleaned
            .substring(firstBrace, lastBrace + 1)
            .replace(/,\s*([}\]])/g, '$1') // trailing commas
            .replace(/(\w+)\s*:/g, '"$1":'); // unquoted keys
          return JSON.parse(fixed);
        } catch {
          // Fall through
        }
      }
    }

    // Try the whole text
    try {
      return JSON.parse(cleaned);
    } catch {
      this.logger.warn(`extractJson: failed to parse response (first 300 chars): ${cleaned.substring(0, 300)}`);
      return null;
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);
  }

  /** Call AI with retry on transient failures (504, network). Throws on 402 (credits). */
  private async callModelWithRetry(
    messages: { role: string; content: string }[],
    options: { maxTokens?: number; temperature?: number; timeout?: number },
    maxRetries = 2,
  ): Promise<string> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.aiService.callModel(messages, options);

        // Empty response = likely transient failure (504 timeout)
        if (!response && attempt < maxRetries) {
          const backoff = (attempt + 1) * 5000; // 5s, 10s
          this.logger.warn(`AI returned empty response, retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await this.delay(backoff);
          continue;
        }

        return response;
      } catch (error) {
        if (error instanceof AiCreditsExhaustedError) {
          this.creditsExhausted = true;
          throw error; // Don't retry credits exhausted
        }
        if (attempt < maxRetries) {
          const backoff = (attempt + 1) * 5000;
          this.logger.warn(`AI call failed, retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await this.delay(backoff);
          continue;
        }
        throw error;
      }
    }
    return '';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
