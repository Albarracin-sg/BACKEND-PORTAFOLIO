import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

const BASE_URL = 'https://jcalbarracin.vercel.app';

const escapeXml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

interface SitemapUrl {
  loc: string;
  lastmod: string;
  priority: string;
}

@Controller()
export class SeoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('sitemap.xml')
  async getSitemap(@Res() res: Response): Promise<void> {
    const [projects, articles] = await Promise.all([
      this.prisma.project.findMany({
        where: { githubUrl: { not: '' } },
        select: { title: true, updatedAt: true },
      }),
      this.prisma.article.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const urls: SitemapUrl[] = [
      { loc: '/', lastmod: new Date().toISOString(), priority: '1.0' },
      {
        loc: '/projects',
        lastmod: new Date().toISOString(),
        priority: '0.9',
      },
      { loc: '/blog', lastmod: new Date().toISOString(), priority: '0.8' },
      ...projects.map((p) => ({
        loc: `/projects/${slugify(p.title)}`,
        lastmod: p.updatedAt.toISOString(),
        priority: '0.8',
      })),
      ...articles.map((a) => ({
        loc: `/blog/${a.slug}`,
        lastmod: a.updatedAt.toISOString(),
        priority: '0.7',
      })),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...urls.map(
        (url) => `  <url>
    <loc>${escapeXml(BASE_URL + url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.priority}</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${escapeXml(BASE_URL + '/es' + url.loc)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(BASE_URL + '/en' + url.loc)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(BASE_URL + '/es' + url.loc)}" />
  </url>`,
      ),
      '</urlset>',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader(
      'Cache-Control',
      'public, max-age=3600, stale-while-revalidate=7200',
    );
    res.send(xml);
  }
}
