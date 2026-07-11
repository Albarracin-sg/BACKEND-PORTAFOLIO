import { ContentGenerationService, type ContentGenerationResult } from './content-generation.service';

describe('ContentGenerationService', () => {
  describe('validateDiagramNodes', () => {
    const service = new ContentGenerationService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    );

    it('passes through valid typed nodes', () => {
      const input = [
        { id: '1', type: 'database', position: { x: 0, y: 0 }, data: { label: 'PostgreSQL', description: 'Primary database' } },
        { id: '2', type: 'service', position: { x: 250, y: 0 }, data: { label: 'API', description: 'REST endpoint' } },
        { id: '3', type: 'external', position: { x: 500, y: 0 }, data: { label: 'GitHub', description: 'External API' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('database');
      expect(result[1].type).toBe('service');
      expect(result[2].type).toBe('external');
    });

    it('falls back to service for unknown types', () => {
      const input = [
        { id: '1', type: 'banana', position: { x: 0, y: 0 }, data: { label: 'Test' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].type).toBe('service');
    });

    it('defaults type to service when missing', () => {
      const input = [
        { id: '1', position: { x: 0, y: 0 }, data: { label: 'Test' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].type).toBe('service');
    });

    it('assigns default position when missing', () => {
      const input = [
        { id: '1', type: 'api', data: { label: 'Test' } },
        { id: '2', type: 'api', data: { label: 'Test 2' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].position).toEqual({ x: 0, y: 0 });
      expect(result[1].position).toEqual({ x: 250, y: 0 });
    });

    it('populates empty description from data', () => {
      const input = [
        { id: '1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'Svc' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].data.description).toBe('');
    });

    it('handles all supported node types', () => {
      const types = ['database', 'service', 'api', 'client', 'queue', 'cache', 'external', 'gateway'];
      const input = types.map((t, i) => ({
        id: String(i + 1),
        type: t,
        position: { x: 0, y: 0 },
        data: { label: `Node ${t}`, description: `desc ${t}` },
      }));
      const result = (service as any).validateDiagramNodes(input);
      expect(result.map((n: any) => n.type)).toEqual(types);
    });
  });

  describe('validateDiagramEdges', () => {
    const service = new ContentGenerationService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    );

    const nodes = [
      { id: '1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'A', description: '' } },
      { id: '2', type: 'database', position: { x: 250, y: 0 }, data: { label: 'B', description: '' } },
    ];

    it('passes through valid edges', () => {
      const input = [
        { id: 'e1-2', source: '1', target: '2', animated: true, label: 'queries / consultas' },
      ];
      const result = (service as any).validateDiagramEdges(input, nodes);
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('1');
      expect(result[0].target).toBe('2');
      expect(result[0].animated).toBe(true);
      expect(result[0].label).toBe('queries / consultas');
    });

    it('drops edges referencing non-existent nodes', () => {
      const input = [
        { id: 'e1-99', source: '1', target: '99', label: 'broken' },
      ];
      const result = (service as any).validateDiagramEdges(input, nodes);
      expect(result).toHaveLength(0);
    });

    it('defaults animated to false', () => {
      const input = [
        { id: 'e1-2', source: '1', target: '2' },
      ];
      const result = (service as any).validateDiagramEdges(input, nodes);
      expect(result[0].animated).toBe(false);
    });

    it('omits label when not provided', () => {
      const input = [
        { id: 'e1-2', source: '1', target: '2', animated: false },
      ];
      const result = (service as any).validateDiagramEdges(input, nodes);
      expect(result[0].label).toBeUndefined();
    });
  });

  describe('generateForAllMissing skip logic', () => {
    it('skips projects that already have both diagram and article', async () => {
      const mockPrisma = {
        project: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'p1', title: 'Project 1', githubUrl: 'https://github.com/u/r1' },
          ]),
        },
        architectureDiagram: {
          count: jest.fn().mockResolvedValue(1),
        },
        article: {
          count: jest.fn().mockResolvedValue(1),
        },
      };

      const service = new ContentGenerationService(
        mockPrisma as any,
        null as any,
        null as any,
        null as any,
        null as any,
      );

      const results = await service.generateForAllMissing();
      expect(results).toHaveLength(0);
      expect(mockPrisma.architectureDiagram.count).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
      expect(mockPrisma.article.count).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
    });

    it('attempts generation when diagram is missing but article exists', async () => {
      const mockPrisma = {
        project: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'p1', title: 'Project 1', githubUrl: 'https://github.com/u/r1' },
          ]),
          findUnique: jest.fn().mockResolvedValue({
            id: 'p1', title: 'Project 1', githubUrl: 'https://github.com/u/r1',
            description: {}, category: 'web', technologies: [],
          }),
        },
        architectureDiagram: {
          count: jest.fn().mockResolvedValue(0),
          findFirst: jest.fn().mockResolvedValue(null),
        },
        article: {
          count: jest.fn().mockResolvedValue(1),
          findFirst: jest.fn().mockResolvedValue({ id: 'existing-article' }),
        },
      };

      const mockGithub = {
        getRepoTree: jest.fn().mockResolvedValue({ tree: [] }),
        getRepoFile: jest.fn().mockResolvedValue(null),
      };

      const mockAi = {
        callModel: jest.fn().mockResolvedValue(JSON.stringify({
          nodes: [{ id: '1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'App', description: 'Main app' } }],
          edges: [],
        })),
      };

      const mockDiagrams = {
        createDiagram: jest.fn().mockResolvedValue({ id: 'd1', title: 'Test' }),
      };

      const service = new ContentGenerationService(
        mockPrisma as any,
        mockAi as any,
        mockGithub as any,
        null as any,
        mockDiagrams as any,
      );

      const results = await service.generateForAllMissing();
      expect(mockDiagrams.createDiagram).toHaveBeenCalled();
    });

    it('does not attempt diagram when one already exists', async () => {
      const mockPrisma = {
        project: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'p1', title: 'Project 1', githubUrl: 'https://github.com/u/r1' },
          ]),
          findUnique: jest.fn().mockResolvedValue({
            id: 'p1', title: 'Project 1', githubUrl: 'https://github.com/u/r1',
            description: {}, category: 'web', technologies: [],
          }),
        },
        architectureDiagram: {
          count: jest.fn().mockResolvedValue(1),
          findFirst: jest.fn().mockResolvedValue({ id: 'existing' }),
        },
        article: {
          count: jest.fn().mockResolvedValue(0),
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };

      const mockBlog = {
        create: jest.fn().mockResolvedValue({ id: 'a1', slug: 'test-article' }),
      };

      const mockAi = {
        callModel: jest.fn().mockResolvedValue(JSON.stringify({
          title: { es: 'Test', en: 'Test' },
          content: { es: 'Content', en: 'Content' },
        })),
      };

      const service = new ContentGenerationService(
        mockPrisma as any,
        mockAi as any,
        { getRepoTree: jest.fn().mockResolvedValue({ tree: [] }), getRepoFile: jest.fn().mockResolvedValue(null) } as any,
        mockBlog as any,
        null as any,
      );

      const results = await service.generateForAllMissing();
      expect(mockPrisma.architectureDiagram.findFirst).toHaveBeenCalled();
      expect(mockBlog.create).toHaveBeenCalled();
    });
  });

  describe('parseGithubUrl', () => {
    const service = new ContentGenerationService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    );

    it('parses standard GitHub URLs', () => {
      expect((service as any).parseGithubUrl('https://github.com/user/repo')).toEqual({ owner: 'user', repo: 'repo' });
    });

    it('parses URLs with .git suffix', () => {
      expect((service as any).parseGithubUrl('https://github.com/user/repo.git')).toEqual({ owner: 'user', repo: 'repo' });
    });

    it('returns nulls for invalid URLs', () => {
      expect((service as any).parseGithubUrl('https://gitlab.com/user/repo')).toEqual({ owner: null, repo: null });
    });
  });

  describe('hasValidMermaidBlock', () => {
    it('accepts a valid flowchart LR mermaid block', () => {
      const content = `# Title

## Architecture

\`\`\`mermaid
flowchart LR
    Client["Browser"] -- request --> API["api.ts"]
    API -- queries --> DB["PostgreSQL"]
\`\`\`

Some prose after.`;
      expect(ContentGenerationService.hasValidMermaidBlock(content)).toBe(true);
    });

    it('rejects content with no mermaid block', () => {
      const content = '# Title\n\nJust prose, no diagram.';
      expect(ContentGenerationService.hasValidMermaidBlock(content)).toBe(false);
    });

    it('rejects content with flowchart TD instead of LR', () => {
      const content = '```mermaid\nflowchart TD\n    A --> B\n```';
      expect(ContentGenerationService.hasValidMermaidBlock(content)).toBe(false);
    });

    it('rejects content with graph LR (non-flowchart syntax)', () => {
      const content = '```mermaid\ngraph LR\n    A --> B\n```';
      expect(ContentGenerationService.hasValidMermaidBlock(content)).toBe(false);
    });

    it('rejects content with multiple mermaid blocks', () => {
      const content = `\`\`\`mermaid
flowchart LR
    A --> B
\`\`\`

And another:

\`\`\`mermaid
flowchart LR
    C --> D
\`\`\``;
      expect(ContentGenerationService.hasValidMermaidBlock(content)).toBe(false);
    });

    it('rejects empty string', () => {
      expect(ContentGenerationService.hasValidMermaidBlock('')).toBe(false);
    });

    it('rejects null/undefined', () => {
      expect(ContentGenerationService.hasValidMermaidBlock(null as any)).toBe(false);
      expect(ContentGenerationService.hasValidMermaidBlock(undefined as any)).toBe(false);
    });

    it('accepts block with node labels containing newlines', () => {
      const content = `\`\`\`mermaid
flowchart LR
    Bot["main.py\nbot/handler.py"] -- message --> Handler["handler.ts"]
\`\`\``;
      expect(ContentGenerationService.hasValidMermaidBlock(content)).toBe(true);
    });

    it('accepts block with edge labels', () => {
      const content = `\`\`\`mermaid
flowchart LR
    Client -- "HTTP request" --> API["api/routes.ts"]
    API -- "SQL query" --> DB["PostgreSQL"]
\`\`\``;
      expect(ContentGenerationService.hasValidMermaidBlock(content)).toBe(true);
    });
  });

  describe('sanitizeMermaidContent', () => {
    it('repairs graph LR to flowchart LR', () => {
      const input = `\`\`\`mermaid
graph LR
    A --> B
\`\`\``;
      const result = ContentGenerationService.sanitizeMermaidContent(input);
      expect(result).toContain('flowchart LR');
      expect(result).not.toContain('graph LR');
    });

    it('repairs flowchart TD to flowchart LR', () => {
      const input = `\`\`\`mermaid
flowchart TD
    A --> B
\`\`\``;
      const result = ContentGenerationService.sanitizeMermaidContent(input);
      expect(result).toContain('flowchart LR');
      expect(result).not.toContain('flowchart TD');
    });

    it('repairs flowchart TB to flowchart LR', () => {
      const input = `\`\`\`mermaid
flowchart TB
    A --> B
\`\`\``;
      const result = ContentGenerationService.sanitizeMermaidContent(input);
      expect(result).toContain('flowchart LR');
    });

    it('preserves existing flowchart LR unchanged', () => {
      const input = `\`\`\`mermaid
flowchart LR
    Client["Browser"] -- request --> API["api.ts"]
\`\`\``;
      const result = ContentGenerationService.sanitizeMermaidContent(input);
      expect(result).toContain('flowchart LR');
      expect(result).toBe(input);
    });

    it('collapses multiple mermaid blocks into one', () => {
      const input = `Text before

\`\`\`mermaid
flowchart LR
    A --> B
\`\`\`

Middle text

\`\`\`mermaid
flowchart LR
    C --> D
\`\`\`

End`;
      const result = ContentGenerationService.sanitizeMermaidContent(input);
      const mermaidMatches = [...result.matchAll(/```mermaid/g)];
      expect(mermaidMatches).toHaveLength(1);
      expect(result).toContain('flowchart LR');
    });

    it('returns content unchanged when no mermaid block exists', () => {
      const input = 'No diagram here at all.';
      expect(ContentGenerationService.sanitizeMermaidContent(input)).toBe(input);
    });

    it('returns empty string as-is', () => {
      expect(ContentGenerationService.sanitizeMermaidContent('')).toBe('');
    });

    it('preserves prose around the mermaid block', () => {
      const input = `# Title

## Architecture

\`\`\`mermaid
flowchart LR
    A --> B
\`\`\`

The diagram above shows the flow.`;
      const result = ContentGenerationService.sanitizeMermaidContent(input);
      expect(result).toContain('# Title');
      expect(result).toContain('## Architecture');
      expect(result).toContain('The diagram above shows the flow.');
    });
  });
});
