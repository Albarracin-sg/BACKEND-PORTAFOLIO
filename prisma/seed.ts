import { PrismaClient, SectionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const technicalSkillGroups = [
  {
    title: 'Backend & Lenguajes',
    items: ['Node.js', 'NestJS', 'Python', 'TypeScript', 'C#', 'Java', 'REST APIs', 'gRPC', 'WebSockets'],
  },
  {
    title: 'Arquitectura',
    items: ['Microservices', 'DDD', 'CQRS', 'Clean Architecture', 'Webhooks', 'Cron Jobs', 'Prisma', 'Entity Framework'],
  },
  {
    title: 'IA & MCP',
    items: ['MCP (Model Context Protocol)', 'Tool Calling dinámico', 'Agentes', 'Orquestadores', 'OpenAI API', 'Anthropic API'],
  },
  {
    title: 'Data · Infra · QA',
    items: ['PostgreSQL', 'MySQL', 'Redis', 'Docker', 'GitHub Actions', 'CI/CD', 'Prometheus', 'Grafana', 'Jest', 'Cypress', 'Swagger', 'Linux (Arch, Ubuntu Server)'],
  },
  {
    title: 'Frontend (secundario)',
    items: ['React', 'React Native', 'Next.js', 'Astro', 'Tailwind CSS'],
  },
];

const technicalSkills = technicalSkillGroups.flatMap((group) => group.items);

const softSkills = [
  'Mentoría y transferencia de conocimiento',
  'Comunicación técnica con equipos y stakeholders',
  'Trabajo colaborativo en Scrum',
  'Autonomía y autogestión',
  'Pensamiento crítico orientado a soluciones',
  'Adaptabilidad ante cambios de requerimientos',
  'Documentación clara y precisa',
];

const professionalExperience = [
  {
    type: 'work',
    title: 'Desarrollador Backend & Arquitectura (Prácticas Profesionales)',
    company: 'Universitaria de Colombia – Área de Innovación',
    period: 'Ene 2025 – 2026',
    location: 'Bogotá, Colombia',
    highlights: [
      'Arquitectura: Diseñé sistemas de microservicios con NestJS, gRPC y PostgreSQL aplicando DDD, CQRS y Clean Architecture en entornos productivos.',
      'Desacoplé servicios mediante eventos, WebSockets y Webhooks; implementé cron jobs para automatización de procesos backend.',
      'Implementé pipelines CI/CD, testing integral (unit, integration, regression, smoke) y documentación Swagger/OpenAPI.',
      'Mentoricé a 2 practicantes con revisión técnica de PRs y GitFlow; participé en ciclos Scrum completos (sprints, daily stand-ups, retrospectivas).',
      'Orquestador MCP — Atención Inteligente (Universidad & IPS): ANTES: atención manual, alto volumen de preguntas repetitivas, respuestas inconsistentes. Diseñé e implementé un orquestador basado en MCP: el usuario escribe en lenguaje natural → MCP interpreta intención → selecciona tool adecuada → ejecuta consulta real → responde con información precisa. Implementé tool calling dinámico conectado a datos reales (certificados, precios, procesos) e integré canal WhatsApp. Impacto: reemplacé flujos manuales por ejecución programática de tools, estandaricé respuestas y reduje la carga operativa administrativa.',
      'Evaluación Docente con IA: ANTES: formulario estático de 40 preguntas, sin contexto, análisis manual. Reemplacé el sistema por un modelo dinámico: preguntas base → IA detecta score bajo → genera pregunta contextual → almacena feedback estructurado → resúmenes automáticos por corte. Impacto: transformé feedback no estructurado en datos accionables y automaticé análisis global por docente.',
      'Integración CRM (Conexia) + Telnyx: ANTES: sin automatización de llamadas, contacto manual. Diseñé microservicio intermedio: CRM dispara eventos → microservicio procesa → Telnyx ejecuta llamadas y campañas. Impacto: automatización completa de flujos de atención y eliminación de procesos manuales de contacto.',
      'Sistema de Asignación Round Robin: ANTES: asignación manual con desbalance de carga. Implementé lógica de distribución equitativa tipo Round Robin. Impacto: asignación optimizada de estudiantes y reducción de desequilibrios operativos.',
    ],
  },
];

const personalProjects = [
  {
    type: 'project',
    title: 'Track Vault',
    company: 'React Native · NestJS · WebSockets · JWT · Open Source',
    highlights: [
      'App móvil open source de streaming y descarga local de música. Backend con WebSockets para reproducción en tiempo real, autenticación JWT e integración con APIs externas.',
      'Funcionalidades propias: descarga a almacenamiento local, sesiones tipo jam colaborativas y conexión a servidor privado.',
    ],
  },
  {
    type: 'project',
    title: 'Servidor Self-Hosted',
    company: 'Ubuntu Server · Linux · Nextcloud · Administración',
    highlights: [
      'Configuración y administración de Ubuntu Server con despliegue de servicios productivos (Nextcloud); gestión completa de almacenamiento, seguridad y entorno Linux.',
    ],
  },
];

const education = [
  {
    title: 'Ingeniería de Software',
    institution: 'Universitaria de Colombia',
    location: 'Bogotá, Colombia',
    description: 'Prácticas profesionales completadas y certificadas en la misma institución.',
  },
];

const contactInfo = [
  {
    label: 'Email',
    value: 'albarrajuan5@gmail.com',
    link: 'mailto:albarrajuan5@gmail.com',
  },
  { label: 'Location', value: 'Bogotá, Colombia', link: null },
];

const socialLinks = [
  { label: 'GitHub', link: 'https://github.com/Albarracin-sg', color: 'gray' },
];

async function seedPages() {
  const pages = [
    { slug: 'home', title: 'Home', isPublished: true },
    { slug: 'projects', title: 'Projects', isPublished: true },
    { slug: 'stats', title: 'Stats', isPublished: true },
  ];

  const pageRecords = await Promise.all(
    pages.map((page) =>
      prisma.page.upsert({
        where: { slug: page.slug },
        update: { title: page.title, isPublished: page.isPublished },
        create: page,
      }),
    ),
  );

  const pageMap = Object.fromEntries(pageRecords.map((page) => [page.slug, page]));

  for (const page of pageRecords) {
    await prisma.section.deleteMany({ where: { pageId: page.id } });
  }

  const heroContent = {
    greeting: 'Hola, soy Juan Camilo Albarracín Urrego',
    role: 'Full-Stack Engineer (Backend Focus) | Microservices & Distributed Architecture | AI & MCP Integration',
    subtitle:
      'Diseño orquestadores basados en MCP, microservicios con NestJS/gRPC y pipelines de automatización que eliminan carga operativa real — no optimizo procesos, los transformo.',
    primaryImage:
      'https://images.unsplash.com/photo-1666875758376-25755544ba8d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXZlbG9wZXIlMjBpbGx1c3RyYXRpb24lMjBjYXJ0b29uJTIwcGVyc29uJTIwY29kaW5nfGVufDF8fHx8MTc1NzIyMDk0N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    secondaryImage:
      'https://images.unsplash.com/photo-1737574107736-9e02ca5d5387?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBkZXZlbG9wZXIlMjBwb3J0cmFpdCUyMHNvZnR3YXJlJTIwZW5naW5lZXJ8ZW58MXx8fHwxNzU3MjIwOTUwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    stats: {
      yearsExperience: '1+',
      projectsCompleted: '10+',
      technologies: '30+',
    },
    cta: {
      viewProjects: 'Ver proyectos',
      contactMe: 'Contactarme',
    },
  };

  const aboutContent = {
    title: 'Sobre mí',
    bio:
      'Full-Stack Engineer con foco en backend, especializado en reemplazar procesos manuales por sistemas inteligentes usando arquitectura distribuida e IA. Diseña orquestadores basados en MCP (Model Context Protocol), microservicios con NestJS/gRPC y pipelines de automatización que eliminan carga operativa real — no optimiza procesos, los transforma. Aplica DDD, CQRS y Clean Architecture en entornos productivos. Capacidad full-stack con React, Next.js y React Native. Metodología Scrum en equipos de desarrollo. Uso estratégico de Python para datos y automatización.',
    technicalSkillsTitle: 'Habilidades Técnicas',
    technicalSkills,
    technicalSkillGroups,
    softSkillsTitle: 'Habilidades Blandas',
    softSkills,
    experienceEducation: 'Experiencia Profesional',
    professionalExperience,
    personalProjectsTitle: 'Proyectos Personales',
    personalProjects,
    educationTitle: 'Educación',
    education,
    timeline: [
      {
        type: 'work',
        title: 'Desarrollador Backend & Arquitectura (Prácticas Profesionales)',
        company: 'Universitaria de Colombia – Área de Innovación',
        period: 'Ene 2025 – 2026',
        location: 'Bogotá, Colombia',
        description:
          'Diseñé microservicios con NestJS, gRPC y PostgreSQL aplicando DDD, CQRS y Clean Architecture. También implementé orquestadores MCP, automatización con IA, integración CRM + Telnyx y lógica de asignación Round Robin.',
      },
      {
        type: 'work',
        title: 'Track Vault — App móvil open source',
        company: 'Proyecto personal',
        period: '2024 - Present',
        location: 'Remoto',
        description:
          'App de streaming y descarga local de música con React Native y NestJS. Backend con WebSockets para reproducción en tiempo real, autenticación JWT, sesiones tipo jam colaborativas y conexión a servidor privado.',
      },
      {
        type: 'education',
        title: 'Ingeniería de Software',
        company: 'Universitaria de Colombia',
        period: 'En curso',
        location: 'Bogotá, Colombia',
        description:
          'Prácticas profesionales completadas y certificadas. Formación en arquitectura de software, bases de datos relacionales, patrones de diseño y desarrollo backend.',
      },
    ],
  };

  const projectsContent = {
    title: 'Mis Proyectos',
    subtitle: 'Proyectos que demuestran mis habilidades en desarrollo backend y arquitectura distribuida.',
    cta: 'Todos los proyectos',
  };

  const contactContent = {
    title: 'Contacto',
    subtitle: '¿Interesado en trabajar conmigo o colaborar en un proyecto?',
    form: {
      title: 'Envíame un mensaje',
      name: 'Nombre',
      email: 'Email',
      message: 'Mensaje',
      send: 'Enviar mensaje',
      sending: 'Enviando...',
      thankYou: '¡Gracias por tu mensaje!',
      responseTime: 'Te responderé dentro de las próximas 24 horas.',
      successMessage: 'Mensaje enviado correctamente',
    },
    info: contactInfo,
    social: socialLinks,
  };

  const statsContent = {
    title: 'Estadísticas Técnicas',
    subtitle: 'Indicadores reales de experiencia técnica',
    cards: [
      {
        title: 'Microservices Built',
        value: '8+',
        description: 'Servicios backend desarrollados y desplegados',
      },
      {
        title: 'AI Agents Designed',
        value: '5+',
        description: 'Agentes MCP implementados',
      },
      {
        title: 'Authentication Systems',
        value: '6+',
        description: 'Implementaciones JWT con control de roles',
      },
      {
        title: 'Projects Delivered',
        value: '10+',
        description: 'Proyectos académicos y profesionales',
      },
    ],
    charts: {
      languageData: [
        { name: 'TypeScript', value: 35, color: '#3178c6' },
        { name: 'Python', value: 25, color: '#3776ab' },
        { name: 'C#', value: 15, color: '#68217a' },
        { name: 'Java', value: 10, color: '#ed8b00' },
        { name: 'Other', value: 15, color: '#6b7280' },
      ],
      projectsData: [
        { month: 'Jan', projects: 2 },
        { month: 'Feb', projects: 3 },
        { month: 'Mar', projects: 1 },
        { month: 'Apr', projects: 4 },
        { month: 'May', projects: 2 },
        { month: 'Jun', projects: 3 },
      ],
      githubActivity: [
        { day: 'Mon', commits: 4 },
        { day: 'Tue', commits: 6 },
        { day: 'Wed', commits: 8 },
        { day: 'Thu', commits: 5 },
        { day: 'Fri', commits: 7 },
        { day: 'Sat', commits: 3 },
        { day: 'Sun', commits: 2 },
      ],
    },
    quality: {
      codeQuality: '98%',
      avgResponseTime: '24h',
      projectSuccess: '100%',
    },
  };

  await prisma.section.createMany({
    data: [
      {
        pageId: pageMap.home.id,
        type: SectionType.HERO,
        order: 1,
        content: heroContent,
      },
      {
        pageId: pageMap.home.id,
        type: SectionType.ABOUT,
        order: 2,
        content: aboutContent,
      },
      {
        pageId: pageMap.home.id,
        type: SectionType.PROJECTS,
        order: 3,
        content: projectsContent,
      },
      {
        pageId: pageMap.home.id,
        type: SectionType.CONTACT,
        order: 4,
        content: contactContent,
      },
      {
        pageId: pageMap.projects.id,
        type: SectionType.PROJECTS,
        order: 1,
        content: projectsContent,
      },
      {
        pageId: pageMap.stats.id,
        type: SectionType.STATS,
        order: 1,
        content: statsContent,
      },
    ],
  });
}

async function seedSampleProject() {
  const count = await prisma.project.count();
  if (count > 0) return;

  const project = await prisma.project.create({
    data: {
      title: 'Track Vault',
      description: 'Open source music streaming and local download app',
      problem: 'Users need offline music access without subscription barriers.',
      challenge: 'Real-time streaming with WebSockets and local storage sync.',
      solution: 'React Native frontend, NestJS backend with WebSockets, JWT auth, and private server connection.',
      imageUrl: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=800',
      githubUrl: 'https://github.com/Albarracin-sg/track-vault',
      liveUrl: null,
      category: 'fullstack',
      status: 'development',
      featured: true,
      stars: 24,
      forks: 5,
      views: 890,
      date: new Date('2024-06-01'),
      technologies: {
        create: [
          'React Native', 'NestJS', 'WebSockets', 'JWT', 'PostgreSQL',
        ].map((name) => ({
          technology: {
            connectOrCreate: {
              where: { name },
              create: { name },
            },
          },
        })),
      },
    },
  });

  return project;
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: 'ADMIN',
    },
  });
}

async function main() {
  await seedPages();
  await seedAdminUser();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
