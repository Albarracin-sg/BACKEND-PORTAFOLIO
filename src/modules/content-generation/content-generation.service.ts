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

const SUPPORTED_NODE_TYPES = new Set([
  'database',
  'service',
  'api',
  'client',
  'queue',
  'cache',
  'external',
  'gateway',
]);

interface ValidatedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { label: string; description: string };
}

interface ValidatedEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  label?: string;
}

@Injectable()
export class ContentGenerationService {
  private readonly logger = new Logger(ContentGenerationService.name);
  private creditsExhausted = false;

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

    // Check what already exists — idempotent per artifact
    const [existingDiagram, existingArticle] = await Promise.all([
      this.prisma.architectureDiagram.findFirst({ where: { projectId: project.id } }),
      this.prisma.article.findFirst({ where: { projectId: project.id } }),
    ]);

    if (!existingDiagram) {
      try {
        result.diagram = await this.generateDiagram(project, owner, repo);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Diagram generation failed for ${project.title}: ${msg}`);
        result.errors.push(`Diagram: ${msg}`);
        if (this.creditsExhausted) return result;
      }
    } else {
      this.logger.log(`Diagram already exists for ${project.title}, skipping`);
    }

    if (!existingArticle) {
      try {
        result.article = await this.generateBlogArticle(project, owner, repo);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Article generation failed for ${project.title}: ${msg}`);
        result.errors.push(`Article: ${msg}`);
      }
    } else {
      this.logger.log(`Article already exists for ${project.title}, skipping`);
    }

    return result;
  }

  async generateForAllMissing(): Promise<ContentGenerationResult[]> {
    this.creditsExhausted = false;

    const projects = await this.prisma.project.findMany({
      where: { githubUrl: { not: '' } },
    });

    const results: ContentGenerationResult[] = [];

    for (let i = 0; i < projects.length; i++) {
      if (this.creditsExhausted) {
        this.logger.warn(`Credits exhausted — stopping content generation after ${results.length} projects`);
        break;
      }

      const project = projects[i];

      const [diagramCount, articleCount] = await Promise.all([
        this.prisma.architectureDiagram.count({ where: { projectId: project.id } }),
        this.prisma.article.count({ where: { projectId: project.id } }),
      ]);

      if (diagramCount > 0 && articleCount > 0) {
        this.logger.log(`Skipping ${project.title} — already has diagram and article`);
        continue;
      }

      if (diagramCount === 0 && articleCount === 0) {
        this.logger.log(`Generating both diagram + article for ${project.title} (${i + 1}/${projects.length})...`);
      } else if (diagramCount === 0) {
        this.logger.log(`Generating missing diagram for ${project.title} (${i + 1}/${projects.length})...`);
      } else {
        this.logger.log(`Generating missing article for ${project.title} (${i + 1}/${projects.length})...`);
      }

      const result = await this.generateForProject(project.id);
      results.push(result);

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
    const evidence = await this.gatherRepoEvidence(owner, repo);

    const systemPrompt = `You are a senior software architect. Analyze the repository evidence below and create an architecture diagram that accurately models THIS specific project.

You MUST return ONLY valid JSON. No markdown fences, no explanation, no text outside the JSON.

REQUIRED JSON STRUCTURE:
{
  "nodes": [
    {
      "id": "1",
      "type": "<one of: database, service, api, client, queue, cache, external, gateway>",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Component Name",
        "description": "What this component does (1 sentence)"
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "animated": false,
      "label": "Relationship description"
    }
  ]
}

NODE TYPE RULES — you MUST assign each node one of these types based on what it actually is:
- "database": Any data store — PostgreSQL, MongoDB, SQLite, Redis, file storage, etc.
- "service": Backend processing unit — NestJS modules, microservices, workers, cron jobs
- "api": Exposed HTTP/WebSocket/gRPC endpoints — REST controllers, GraphQL resolvers
- "client": Frontend consumer — browsers, mobile apps, CLI tools, SPAs
- "queue": Async message passing — job queues, pub/sub, event buses, RabbitMQ, SQS
- "cache": In-memory or distributed cache — Redis, Memcached, in-memory maps
- "external": Third-party services — GitHub API, email providers, payment gateways, OAuth
- "gateway": Traffic entry point — reverse proxies, load balancers, API gateways, CDNs

EDGE RULES:
- Every edge MUST have a descriptive label explaining the relationship
- Use bilingual format: "English / Español" for labels
- Describe the data flow direction and protocol if evident from the evidence

NODE DATA RULES:
- Every node MUST have a "description" field (not just a label) explaining what the component does
- "label" should be the component name (max 3-4 words)
- "description" should explain responsibility (1 sentence, max 60 chars)

LAYOUT RULES:
- Position nodes in a logical top-to-bottom or left-to-right flow
- Space nodes 200-300px apart
- Place the client/user at the top or left
- Place databases at the bottom or right
- Gateways between client and backend

EVIDENCE-BASED RULES:
- ONLY include components you can identify from the evidence below
- If the evidence shows a specific framework (e.g. NestJS, Express), name the service accordingly
- If you see Prisma, name the database "PostgreSQL (Prisma)" or similar
- If you see Docker/docker-compose, include the gateway/proxy
- Do NOT invent components that are not supported by the evidence
- If you are unsure about something, note it in the node description as "(inferred)"

Return ONLY the JSON object.`;

    const userPrompt = `Analyze this project and create an accurate architecture diagram.

PROJECT: ${project.title}
CATEGORY: ${project.category ?? 'Unknown'}
TECHNOLOGIES: ${evidence.techNames.join(', ')}

REPOSITORY STRUCTURE:
${evidence.fileTree}

KEY CONFIGURATION FILES:
${evidence.configFiles}

README (first 3000 chars):
${evidence.readme}

FRAMEWORK/DEPENDENCY EVIDENCE:
${evidence.dependencyEvidence}

DEPLOYMENT EVIDENCE:
${evidence.deploymentEvidence}

Based on this evidence, generate the architecture diagram JSON. Return ONLY the JSON object.`;

    const response = await this.callModelWithRetry(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 3072, temperature: 0.5, timeout: 120000 },
    );

    const parsed = this.extractJson(response);
    if (!parsed || !parsed.nodes || !parsed.edges) {
      throw new Error('AI returned invalid diagram structure');
    }

    const validatedNodes = this.validateDiagramNodes(parsed.nodes);
    const validatedEdges = this.validateDiagramEdges(parsed.edges, validatedNodes);

    const title = {
      es: `Diagrama de Arquitectura: ${project.title}`,
      en: `Architecture Diagram: ${project.title}`,
    };
    const description = {
      es: `Diagrama de arquitectura del sistema para ${project.title}`,
      en: `System architecture diagram for ${project.title}`,
    };

    const diagram = await this.diagramsService.createDiagram(project.id, {
      title,
      description,
      type: DiagramType.SYSTEM_CONTEXT,
      source: { nodes: validatedNodes, edges: validatedEdges } as any,
      position: 0,
      published: true,
    });

    return { id: diagram.id, title: title.es };
  }

  private async gatherRepoEvidence(owner: string, repo: string) {
    const [tree, readme, packageJson, dockerCompose, prismaSchema, envExample] = await Promise.all([
      this.githubService.getRepoTree(owner, repo),
      this.githubService.getRepoFile(owner, repo, 'README.md'),
      this.githubService.getRepoFile(owner, repo, 'package.json'),
      this.githubService.getRepoFile(owner, repo, 'docker-compose.yml').catch(() => null)
        .then((r) => r ?? this.githubService.getRepoFile(owner, repo, 'docker-compose.yaml')),
      this.githubService.getRepoFile(owner, repo, 'prisma/schema.prisma'),
      this.githubService.getRepoFile(owner, repo, '.env.example'),
    ]);

    const fileTree = tree?.tree
      ? tree.tree.slice(0, 120).map((f: any) => f.path).join('\n')
      : 'Unable to retrieve file tree';

    const configFiles: string[] = [];
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        configFiles.push(`package.json dependencies: ${Object.keys(deps).join(', ')}`);
        if (pkg.scripts) {
          configFiles.push(`scripts: ${Object.keys(pkg.scripts).join(', ')}`);
        }
      } catch {
        configFiles.push('package.json: (could not parse)');
      }
    }
    if (dockerCompose) {
      configFiles.push(`docker-compose.yml:\n${dockerCompose.substring(0, 1500)}`);
    }
    if (prismaSchema) {
      configFiles.push(`prisma/schema.prisma:\n${prismaSchema.substring(0, 2000)}`);
    }
    if (envExample) {
      configFiles.push(`.env.example:\n${envExample.substring(0, 1000)}`);
    }

    const techNames: string[] = [];
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };
        const knownFrameworks = [
          'next', 'nuxt', 'react', 'vue', 'angular', 'svelte',
          '@nestjs/core', 'express', 'fastify', 'hono',
          'prisma', '@prisma/client', 'drizzle-orm', 'typeorm', 'mongoose',
          'redis', 'ioredis', 'bull', 'bullmq',
          'docker-compose', 'typescript', 'vite', 'webpack',
        ];
        for (const fw of knownFrameworks) {
          if (deps[fw]) techNames.push(fw);
        }
      } catch {
        // ignore
      }
    }

    const dependencyEvidence: string[] = [];
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        const deps = { ...pkg.dependencies };
        if (deps['@nestjs/core']) dependencyEvidence.push('Backend: NestJS framework');
        if (deps['express']) dependencyEvidence.push('Backend: Express framework');
        if (deps['fastify']) dependencyEvidence.push('Backend: Fastify framework');
        if (deps['@prisma/client'] || deps['prisma']) dependencyEvidence.push('ORM: Prisma (database access layer)');
        if (deps['redis'] || deps['ioredis']) dependencyEvidence.push('Cache/Queue: Redis');
        if (deps['bull'] || deps['bullmq']) dependencyEvidence.push('Queue: Bull/BullMQ (job processing)');
        if (deps['passport']) dependencyEvidence.push('Auth: Passport.js (authentication)');
        if (deps['@nestjs/swagger']) dependencyEvidence.push('API docs: Swagger/OpenAPI');
        if (deps['resend']) dependencyEvidence.push('Email: Resend service');
        if (deps['nodemailer']) dependencyEvidence.push('Email: Nodemailer');
        if (deps['zod']) dependencyEvidence.push('Validation: Zod schemas');
      } catch {
        // ignore
      }
    }

    const deploymentEvidence: string[] = [];
    if (dockerCompose) {
      deploymentEvidence.push('Docker Compose detected — containerized deployment');
    }
    if (prismaSchema) {
      const dbMatch = prismaSchema.match(/provider\s*=\s*"(\w+)"/);
      if (dbMatch) {
        deploymentEvidence.push(`Database provider: ${dbMatch[1]}`);
      }
    }
    if (envExample) {
      if (envExample.includes('DATABASE_URL')) deploymentEvidence.push('Requires DATABASE_URL env var');
      if (envExample.includes('GITHUB_TOKEN')) deploymentEvidence.push('Integrates with GitHub API');
      if (envExample.includes('SMTP_')) deploymentEvidence.push('Uses SMTP email sending');
      if (envExample.includes('JWT_')) deploymentEvidence.push('JWT-based authentication');
    }

    return {
      fileTree,
      readme: readme?.substring(0, 3000) ?? 'No README available',
      configFiles: configFiles.join('\n\n'),
      techNames,
      dependencyEvidence: dependencyEvidence.length > 0
        ? dependencyEvidence.join('\n')
        : 'No clear framework evidence from package.json',
      deploymentEvidence: deploymentEvidence.length > 0
        ? deploymentEvidence.join('\n')
        : 'No deployment configuration detected',
    };
  }

  private validateDiagramNodes(rawNodes: any[]): ValidatedNode[] {
    const nodes: ValidatedNode[] = [];
    for (let i = 0; i < rawNodes.length; i++) {
      const raw = rawNodes[i];
      const rawType = String(raw.type ?? 'service').toLowerCase();
      const type = SUPPORTED_NODE_TYPES.has(rawType) ? rawType : 'service';
      nodes.push({
        id: String(raw.id ?? String(i + 1)),
        type,
        position: {
          x: Number(raw.position?.x ?? (i % 3) * 250),
          y: Number(raw.position?.y ?? Math.floor(i / 3) * 200),
        },
        data: {
          label: String(raw.data?.label ?? `Component ${i + 1}`),
          description: String(raw.data?.description ?? ''),
        },
      });
    }
    return nodes;
  }

  private validateDiagramEdges(rawEdges: any[], nodes: ValidatedNode[]): ValidatedEdge[] {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges: ValidatedEdge[] = [];
    for (let i = 0; i < rawEdges.length; i++) {
      const raw = rawEdges[i];
      const source = String(raw.source);
      const target = String(raw.target);
      if (!nodeIds.has(source) || !nodeIds.has(target)) {
        this.logger.warn(`Edge ${i} references missing node: ${source} -> ${target}, skipping`);
        continue;
      }
      edges.push({
        id: String(raw.id ?? `e${i}`),
        source,
        target,
        animated: Boolean(raw.animated ?? false),
        label: raw.label ? String(raw.label) : undefined,
      });
    }
    return edges;
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
Include a Mermaid flowchart diagram showing the real system/data flow, then list 2-4 key architectural decisions with bold labels and clear explanations of WHY each decision was made.

MERMAID DIAGRAM REQUIREMENTS (CRITICAL — you MUST follow these exactly):
- The diagram MUST be a fenced code block with the language tag "mermaid"
- The diagram MUST start with "flowchart LR" (left-to-right layout)
- Use quoted labels with concise component names and responsibilities, for example: Bot["main.py\\nbot/handler.py"]
- Edge labels MUST describe data or control flow, for example: -- message -->, -- polling -->, -- response -->
- Derive ALL nodes and edges ONLY from the repository evidence provided. Do NOT invent Telegram bots, LLMs, databases, message queues, or any other technology unless the evidence explicitly shows it.
- If evidence is insufficient for some components, omit them and add a comment node like NOTE["Evidence gap: ..."] explaining what is missing.
- Ensure Mermaid syntax is valid: safe node IDs (alphanumeric, no spaces), quoted labels, exactly one "flowchart LR" block.

Example of correct Mermaid syntax:
\`\`\`mermaid
flowchart LR
    Client["Browser\nFrontend"] -- HTTP request --> API["api/routes.ts\nRequest handler"]
    API -- queries --> DB["PostgreSQL\nPrisma ORM"]
    API -- calls --> Ext["GitHub API\nExternal service"]
\`\`\`

IMPORTANT: The blog prose MUST reference the diagram and explain the flow depicted in it.

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
      es: ContentGenerationService.sanitizeMermaidContent(String(parsed.content?.es ?? '')),
      en: ContentGenerationService.sanitizeMermaidContent(String(parsed.content?.en ?? '')),
    };

    for (const lang of ['es', 'en'] as const) {
      if (!ContentGenerationService.hasValidMermaidBlock(content[lang])) {
        this.logger.warn(`Article ${lang} content missing valid mermaid flowchart LR block — content saved but diagram may need manual review`);
      }
    }
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

    let cleaned = text
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/\\\|(\d+)\\\|/g, '$1')
      .replace(/[\u201C\u201D\u2018\u2019]/g, '"')
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
      .trim();

    const codeFenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeFenceMatch) {
      try {
        return JSON.parse(codeFenceMatch[1].trim());
      } catch {
        // Fall through
      }
    }

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch {
        try {
          const fixed = cleaned
            .substring(firstBrace, lastBrace + 1)
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/(\w+)\s*:/g, '"$1":');
          return JSON.parse(fixed);
        } catch {
          // Fall through
        }
      }
    }

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

  /**
   * Validates that article content contains exactly one fenced ```mermaid block
   * using `flowchart LR`. Returns true if the block is present and valid.
   */
  static hasValidMermaidBlock(content: string): boolean {
    if (!content) return false;
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;
    const matches = [...content.matchAll(mermaidRegex)];
    return matches.length === 1 && matches[0][1].trimStart().startsWith('flowchart LR');
  }

  /**
   * Sanitizes article content by:
   * 1. Collapsing multiple mermaid blocks into one
   * 2. Forcing the diagram type to `flowchart LR` (repairs graph/flowchart TD/etc.)
   * 3. Wrapping un-fenced mermaid code in proper fences if a flowchart LR line exists
   * Returns sanitized content, or original content if no repairable mermaid found.
   */
  static sanitizeMermaidContent(content: string): string {
    if (!content) return content;

    const mermaidBlockRegex = /```mermaid\s*\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = mermaidBlockRegex.exec(content)) !== null) {
      blocks.push(match[1]);
    }

    if (blocks.length === 0) return content;

    const firstBlock = blocks[0];

    let diagramBody = firstBlock.trimEnd();

    diagramBody = diagramBody.replace(
      /^(graph\s+(?:TD|TB|BT|RL|LR))/m,
      'flowchart LR',
    );
    diagramBody = diagramBody.replace(
      /^(flowchart\s+(?:TD|TB|BT|RL))/m,
      'flowchart LR',
    );

    const sanitizedBlock = `\`\`\`mermaid\n${diagramBody}\n\`\`\``;

    let result = content.replace(mermaidBlockRegex, '___MERMAID_PLACEHOLDER___');
    result = result.replace('___MERMAID_PLACEHOLDER___', sanitizedBlock);

    return result;
  }

  private async callModelWithRetry(
    messages: { role: string; content: string }[],
    options: { maxTokens?: number; temperature?: number; timeout?: number },
    maxRetries = 2,
  ): Promise<string> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.aiService.callModel(messages, options);

        if (!response && attempt < maxRetries) {
          const backoff = (attempt + 1) * 5000;
          this.logger.warn(`AI returned empty response, retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await this.delay(backoff);
          continue;
        }

        return response;
      } catch (error) {
        if (error instanceof AiCreditsExhaustedError) {
          this.creditsExhausted = true;
          throw error;
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
