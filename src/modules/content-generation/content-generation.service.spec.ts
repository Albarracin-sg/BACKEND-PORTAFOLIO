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
        { id: '1', type: 'database', data: { label: 'PostgreSQL', description: 'Primary database' } },
        { id: '2', type: 'service', data: { label: 'API', description: 'REST endpoint' } },
        { id: '3', type: 'external', data: { label: 'GitHub', description: 'External API' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('database');
      expect(result[1].type).toBe('service');
      expect(result[2].type).toBe('external');
    });

    it('falls back to service for unknown types', () => {
      const input = [
        { id: '1', type: 'banana', data: { label: 'Test' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].type).toBe('service');
    });

    it('defaults type to service when missing', () => {
      const input = [
        { id: '1', data: { label: 'Test' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].type).toBe('service');
    });

    it('always assigns deterministic positions regardless of model input', () => {
      const input = [
        { id: '1', type: 'api', data: { label: 'Test' } },
        { id: '2', type: 'api', data: { label: 'Test 2' } },
        { id: '3', type: 'api', data: { label: 'Test 3' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].position).toEqual({ x: 0, y: 0 });
      expect(result[1].position).toEqual({ x: 250, y: 0 });
      expect(result[2].position).toEqual({ x: 500, y: 0 });
    });

    it('ignores model-provided positions and assigns deterministic ones', () => {
      const input = [
        { id: '1', type: 'api', position: { x: 999, y: 888 }, data: { label: 'Test' } },
        { id: '2', type: 'api', position: { x: 777, y: 666 }, data: { label: 'Test 2' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].position).toEqual({ x: 0, y: 0 });
      expect(result[1].position).toEqual({ x: 250, y: 0 });
    });

    it('survives NaN/non-finite positions from hostile AI output', () => {
      const input = [
        { id: '1', type: 'api', position: { x: 'some Chinese text', y: NaN }, data: { label: 'Test' } },
        { id: '2', type: 'service', position: { x: Infinity, y: undefined }, data: { label: 'Test 2' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].position).toEqual({ x: 0, y: 0 });
      expect(result[1].position).toEqual({ x: 250, y: 0 });
      expect(Number.isFinite(result[0].position.x)).toBe(true);
      expect(Number.isFinite(result[1].position.x)).toBe(true);
    });

    it('populates empty description from data', () => {
      const input = [
        { id: '1', type: 'service', data: { label: 'Svc' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].data.description).toBe('');
    });

    it('handles all supported node types', () => {
      const types = ['database', 'service', 'api', 'client', 'queue', 'cache', 'external', 'gateway'];
      const input = types.map((t, i) => ({
        id: String(i + 1),
        type: t,
        data: { label: `Node ${t}`, description: `desc ${t}` },
      }));
      const result = (service as any).validateDiagramNodes(input);
      expect(result.map((n: any) => n.type)).toEqual(types);
    });

    it('assigns fallback id when node id is empty', () => {
      const input = [
        { id: '', type: 'service', data: { label: 'Test' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].id).toBe('node-1');
    });

    it('deduplicates node ids', () => {
      const input = [
        { id: '1', type: 'service', data: { label: 'A' } },
        { id: '1', type: 'database', data: { label: 'B' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('1-2');
    });

    it('assigns fallback label when label is empty', () => {
      const input = [
        { id: '1', type: 'service', data: { label: '' } },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].data.label).toBe('Component 1');
    });

    it('assigns fallback label when data is missing', () => {
      const input = [
        { id: '1', type: 'service' },
      ];
      const result = (service as any).validateDiagramNodes(input);
      expect(result[0].data.label).toBe('Component 1');
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
    ] as any[];

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
          nodes: [{ id: '1', type: 'service', data: { label: 'App', description: 'Main app' } }],
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

  describe('isValidDiagramPayload', () => {
    const service = new ContentGenerationService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    );

    it('accepts valid payload with nodes and edges', () => {
      expect((service as any).isValidDiagramPayload({ nodes: [{}], edges: [] })).toBe(true);
    });

    it('rejects null', () => {
      expect((service as any).isValidDiagramPayload(null)).toBe(false);
    });

    it('rejects non-object', () => {
      expect((service as any).isValidDiagramPayload('string')).toBe(false);
    });

    it('rejects missing nodes', () => {
      expect((service as any).isValidDiagramPayload({ edges: [] })).toBe(false);
    });

    it('rejects empty nodes array', () => {
      expect((service as any).isValidDiagramPayload({ nodes: [], edges: [] })).toBe(false);
    });

    it('rejects missing edges', () => {
      expect((service as any).isValidDiagramPayload({ nodes: [{}] })).toBe(false);
    });

    it('rejects non-array nodes', () => {
      expect((service as any).isValidDiagramPayload({ nodes: 'not-array', edges: [] })).toBe(false);
    });
  });

  describe('generateDiagram corrective retry', () => {
    it('retries once on malformed response and throws after retry fails', async () => {
      const mockPrisma = {
        project: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const mockAi = {
        callModel: jest.fn()
          .mockResolvedValueOnce('This is not JSON at all, just prose about architecture')
          .mockResolvedValueOnce('Also not JSON, just random text'),
      };
      const mockGithub = {
        getRepoTree: jest.fn().mockResolvedValue({ tree: [] }),
        getRepoFile: jest.fn().mockResolvedValue(null),
      };
      const mockDiagrams = {
        createDiagram: jest.fn(),
      };

      const service = new ContentGenerationService(
        mockPrisma as any,
        mockAi as any,
        mockGithub as any,
        null as any,
        mockDiagrams as any,
      );

      await expect(
        (service as any).generateDiagram(
          { id: 'p1', title: 'Test', description: {}, category: null, technologies: [] },
          'owner',
          'repo',
        ),
      ).rejects.toThrow('AI returned invalid diagram structure after retry');

      expect(mockAi.callModel).toHaveBeenCalledTimes(2);
      expect(mockDiagrams.createDiagram).not.toHaveBeenCalled();
    });

    it('succeeds on retry when first response is malformed', async () => {
      const validResponse = JSON.stringify({
        nodes: [{ id: '1', type: 'service', data: { label: 'App', description: 'Main app' } }],
        edges: [],
      });

      const mockPrisma = {
        project: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const mockAi = {
        callModel: jest.fn()
          .mockResolvedValueOnce('Not valid JSON')
          .mockResolvedValueOnce(validResponse),
      };
      const mockGithub = {
        getRepoTree: jest.fn().mockResolvedValue({ tree: [] }),
        getRepoFile: jest.fn().mockResolvedValue(null),
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

      const result = await (service as any).generateDiagram(
        { id: 'p1', title: 'Test', description: {}, category: null, technologies: [] },
        'owner',
        'repo',
      );

      expect(result).toEqual({ id: 'd1', title: expect.any(String) });
      expect(mockAi.callModel).toHaveBeenCalledTimes(2);
      expect(mockDiagrams.createDiagram).toHaveBeenCalled();
    });

    it('never creates a diagram when all retries fail', async () => {
      const mockPrisma = {
        project: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const mockAi = {
        callModel: jest.fn()
          .mockResolvedValueOnce('garbage')
          .mockResolvedValueOnce('more garbage'),
      };
      const mockGithub = {
        getRepoTree: jest.fn().mockResolvedValue({ tree: [] }),
        getRepoFile: jest.fn().mockResolvedValue(null),
      };
      const mockDiagrams = {
        createDiagram: jest.fn(),
      };

      const service = new ContentGenerationService(
        mockPrisma as any,
        mockAi as any,
        mockGithub as any,
        null as any,
        mockDiagrams as any,
      );

      await expect(
        (service as any).generateDiagram(
          { id: 'p1', title: 'Test', description: {}, category: null, technologies: [] },
          'owner',
          'repo',
        ),
      ).rejects.toThrow();

      expect(mockDiagrams.createDiagram).not.toHaveBeenCalled();
    });

    it('handles hostile AI output with prose in positions', async () => {
      const hostileResponse = JSON.stringify({
        nodes: [
          { id: '1', type: 'service', position: { x: 'Chinese text here', y: NaN }, data: { label: 'App', description: 'Main' } },
          { id: '2', type: 'database', position: { x: Infinity, y: undefined }, data: { label: 'DB', description: 'Data' } },
        ],
        edges: [{ id: 'e1-2', source: '1', target: '2', label: 'queries' }],
      });

      const mockPrisma = {
        project: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const mockAi = {
        callModel: jest.fn().mockResolvedValue(hostileResponse),
      };
      const mockGithub = {
        getRepoTree: jest.fn().mockResolvedValue({ tree: [] }),
        getRepoFile: jest.fn().mockResolvedValue(null),
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

      const result = await (service as any).generateDiagram(
        { id: 'p1', title: 'Test', description: {}, category: null, technologies: [] },
        'owner',
        'repo',
      );

      expect(result).toEqual({ id: 'd1', title: expect.any(String) });
      const savedSource = mockDiagrams.createDiagram.mock.calls[0][1].source;
      expect(Number.isFinite(savedSource.nodes[0].position.x)).toBe(true);
      expect(Number.isFinite(savedSource.nodes[1].position.x)).toBe(true);
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

    it('does not leave placeholder text when collapsing multiple blocks', () => {
      const input = `Before

\`\`\`mermaid
flowchart LR
    A --> B
\`\`\`

Middle

\`\`\`mermaid
flowchart LR
    C --> D
\`\`\`

After`;
      const result = ContentGenerationService.sanitizeMermaidContent(input);
      expect(result).not.toContain('___MERMAID_PLACEHOLDER___');
      expect(result).toContain('Before');
      expect(result).toContain('Middle');
      expect(result).toContain('After');
    });

    it('collapses three mermaid blocks into one without leftover placeholders', () => {
      const input = `\`\`\`mermaid
flowchart LR
    A --> B
\`\`\`
text
\`\`\`mermaid
flowchart LR
    C --> D
\`\`\`
text
\`\`\`mermaid
flowchart LR
    E --> F
\`\`\``;
      const result = ContentGenerationService.sanitizeMermaidContent(input);
      const mermaidMatches = [...result.matchAll(/```mermaid/g)];
      expect(mermaidMatches).toHaveLength(1);
      expect(result).not.toContain('___MERMAID_PLACEHOLDER___');
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

  describe('repairArticleContent', () => {
    it('skips articles that already have valid mermaid blocks', async () => {
      const mermaidContent = `\`\`\`mermaid\nflowchart LR\n    A --> B\n\`\`\``;
      const mockPrisma = {
        article: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'a1', slug: 'good-article', content: { es: mermaidContent, en: mermaidContent }, projectId: 'p1' },
          ]),
        },
      };

      const service = new ContentGenerationService(
        mockPrisma as any, null as any, null as any, null as any, null as any,
      );

      const result = await service.repairArticleContent();
      expect(result.repaired).toBe(0);
      expect(result.slugs).toHaveLength(0);
      expect(mockPrisma.article.findMany).toHaveBeenCalled();
    });

    it('skips articles without projectId', async () => {
      const noMermaid = 'Just some text, no diagram.';
      const mockPrisma = {
        article: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'a1', slug: 'no-project', content: { es: noMermaid, en: noMermaid }, projectId: null },
          ]),
        },
      };

      const service = new ContentGenerationService(
        mockPrisma as any, null as any, null as any, null as any, null as any,
      );

      const result = await service.repairArticleContent();
      expect(result.repaired).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('repairs article when AI returns content with mermaid', async () => {
      const noMermaid = 'Just text.';
      const goodMermaid = `\`\`\`mermaid\nflowchart LR\n    A --> B\n\`\`\``;

      const mockPrisma = {
        article: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'a1', slug: 'needs-repair', content: { es: noMermaid, en: noMermaid }, projectId: 'p1' },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
        project: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'p1', title: 'Test', githubUrl: 'https://github.com/u/r',
            description: {}, category: 'web', technologies: [],
          }),
        },
      };

      const mockAi = {
        callModel: jest.fn().mockResolvedValue(JSON.stringify({
          title: { es: 'Test', en: 'Test' },
          content: { es: goodMermaid, en: goodMermaid },
          excerpt: { es: 'exc', en: 'exc' },
          metaTitle: { es: 'meta', en: 'meta' },
          metaDescription: { es: 'desc', en: 'desc' },
          tags: ['tag1'],
        })),
      };

      const service = new ContentGenerationService(
        mockPrisma as any, mockAi as any,
        { getRepoTree: jest.fn().mockResolvedValue({ tree: [] }), getRepoFile: jest.fn().mockResolvedValue(null) } as any,
        null as any, null as any,
      );

      const result = await service.repairArticleContent();
      expect(result.repaired).toBe(1);
      expect(result.slugs).toContain('needs-repair');
      expect(mockPrisma.article.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { content: { es: goodMermaid, en: goodMermaid } },
      });
    });

    it('skips when AI still returns content without mermaid', async () => {
      const noMermaid = 'Just text.';

      const mockPrisma = {
        article: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'a1', slug: 'still-bad', content: { es: noMermaid, en: noMermaid }, projectId: 'p1' },
          ]),
          update: jest.fn(),
        },
        project: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'p1', title: 'Test', githubUrl: 'https://github.com/u/r',
            description: {}, category: 'web', technologies: [],
          }),
        },
      };

      const mockAi = {
        callModel: jest.fn().mockResolvedValue(JSON.stringify({
          title: { es: 'Test', en: 'Test' },
          content: { es: 'Still no mermaid here.', en: 'Still no mermaid here.' },
          excerpt: { es: 'exc', en: 'exc' },
          tags: [],
        })),
      };

      const service = new ContentGenerationService(
        mockPrisma as any, mockAi as any,
        { getRepoTree: jest.fn().mockResolvedValue({ tree: [] }), getRepoFile: jest.fn().mockResolvedValue(null) } as any,
        null as any, null as any,
      );

      const result = await service.repairArticleContent();
      expect(result.repaired).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockPrisma.article.update).not.toHaveBeenCalled();
    });

    it('continues to next article when one fails', async () => {
      const noMermaid = 'text';
      const goodMermaid = `\`\`\`mermaid\nflowchart LR\n    A --> B\n\`\`\``;

      const mockPrisma = {
        article: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'a1', slug: 'will-fail', content: { es: noMermaid, en: noMermaid }, projectId: 'p1' },
            { id: 'a2', slug: 'will-succeed', content: { es: noMermaid, en: noMermaid }, projectId: 'p2' },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
        project: {
          findUnique: jest.fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({
              id: 'p2', title: 'Test2', githubUrl: 'https://github.com/u/r2',
              description: {}, category: 'web', technologies: [],
            }),
        },
      };

      const mockAi = {
        callModel: jest.fn().mockResolvedValue(JSON.stringify({
          title: { es: 'Test', en: 'Test' },
          content: { es: goodMermaid, en: goodMermaid },
          excerpt: { es: 'e', en: 'e' },
          tags: [],
        })),
      };

      const service = new ContentGenerationService(
        mockPrisma as any, mockAi as any,
        { getRepoTree: jest.fn().mockResolvedValue({ tree: [] }), getRepoFile: jest.fn().mockResolvedValue(null) } as any,
        null as any, null as any,
      );

      const result = await service.repairArticleContent();
      expect(result.repaired).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.slugs).toContain('will-succeed');
    });
  });
});
