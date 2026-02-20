import { PrismaClient, SectionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const translations = {
  es: {
    common: { back: 'Volver' },
    nav: {
      home: 'Inicio',
      about: 'Sobre mi',
      projects: 'Proyectos',
      stats: 'Estadisticas',
      contact: 'Contacto',
      downloadCV: 'Descargar CV',
    },
    hero: {
      greeting: 'Hola, soy Juan Camilo Albarracin',
      role: 'Backend Engineer | Microservices & AI Systems',
      subtitle:
        'Construyo backends escalables con Arquitectura Limpia, DDD y microservicios. Integro agentes MCP y modelos de IA para soluciones reales en entornos academicos y empresariales.',
      viewProjects: 'Ver proyectos',
      contactMe: 'Contactarme',
      yearsExperience: 'Anos de experiencia',
      projectsCompleted: 'Proyectos completados',
      technologies: 'Tecnologias',
    },
    about: {
      title: 'Sobre mi',
      bio:
        'Ingeniero de software enfocado en backend. Trabajo con Arquitectura Limpia (Hexagonal), DDD y microservicios para construir soluciones mantenibles. Experiencia en C# y Node.js, integrando agentes MCP y modelos de IA. Actualmente realizo practicas profesionales en una universidad en Colombia.',
      technicalSkills: 'Habilidades Tecnicas',
      softSkillsTitle: 'Habilidades Blandas',
      softSkills: {
        problemSolving: 'Resolucion de problemas',
        teamwork: 'Trabajo en equipo',
        communication: 'Comunicacion efectiva',
        adaptability: 'Adaptabilidad',
        leadership: 'Liderazgo',
        creativity: 'Creatividad',
      },
      experienceEducation: 'Experiencia y Educacion',
      timeline: {
        work1: {
          title: 'Backend Developer Intern',
          company: 'Universidad en Colombia',
          description:
            'Desarrollo de microservicios con Node.js y C#, implementacion de autenticacion JWT con control de roles (RBAC) y construccion de bots academicos con MCP e integracion de modelos de IA.',
        },
        work2: {
          title: 'SaaS en construccion: Goodgate',
          company: 'Proyecto personal',
          description:
            'Aplicacion de gestion de proveedores con enfoque SaaS. Back-end en Node.js/TypeScript y arquitectura modular para escalar cuando salga al mercado.',
        },
        education1: {
          title: 'Ingenieria de Software',
          institution: 'Universidad en Colombia',
          description:
            'Formacion en arquitectura de software, bases de datos relacionales, patrones de diseno y desarrollo backend.',
        },
      },
    },
    projects: {
      title: 'Mis Proyectos',
      subtitle: 'Proyectos que demuestran mis habilidades en desarrollo fullstack.',
      allProjects: 'Todos los proyectos',
      technologies: 'Tecnologias utilizadas',
      viewMore: 'Ver mas',
      noProjects: 'No hay proyectos que coincidan con el filtro seleccionado.',
      totalProjects: '15+',
      modal: {
        problem: 'Problema',
        challenge: 'Reto',
        solution: 'Solucion',
        viewGithub: 'Ver en GitHub',
        viewLive: 'Ver proyecto',
      },
      filters: {
        searchLabel: 'Buscar',
        searchPlaceholder: 'Buscar proyectos, tecnologias...',
        category: 'Categoria',
        technology: 'Tecnologia',
        sortBy: 'Ordenar',
        showing: 'Mostrando {count} de {total} proyectos',
        viewGrid: 'Vista cuadricula',
        viewList: 'Vista lista',
        clearFilters: 'Limpiar filtros',
        viewDetails: 'Ver detalles',
        projectsFound: 'Proyectos encontrados',
      },
      sortOptions: {
        dateDesc: 'Mas reciente primero',
        dateAsc: 'Mas antiguo primero',
        starsDesc: 'Mas estrellas',
        starsAsc: 'Menos estrellas',
        viewsDesc: 'Mas visitas',
        nameAsc: 'Nombre A-Z',
        nameDesc: 'Nombre Z-A',
      },
      categories: {
        all: 'Todos los proyectos',
        fullstack: 'Full Stack',
        web: 'Web App',
        devops: 'DevOps',
        ml: 'Machine Learning',
        blockchain: 'Blockchain',
        data: 'Data Engineering',
      },
      allTech: 'Todas las tecnologias',
      project1: {
        description: 'Plataforma e-commerce completa.',
        problem: 'Necesidad de una solucion e-commerce escalable.',
        challenge: 'Integrar pasarelas de pago y manejar inventario en tiempo real.',
        solution: 'Arquitectura con React, Node.js, PostgreSQL, Stripe y Redis.',
      },
    },
    contact: {
      title: 'Contacto',
      subtitle: 'Interesado en trabajar conmigo o colaborar en un proyecto?',
      form: {
        title: 'Enviame un mensaje',
        name: 'Nombre',
        email: 'Email',
        message: 'Mensaje',
        send: 'Enviar mensaje',
        sending: 'Enviando...',
        thankYou: 'Gracias por tu mensaje!',
        responseTime: 'Te respondere dentro de las proximas 24 horas.',
        successMessage: 'Mensaje enviado correctamente',
      },
      info: {
        title: 'Informacion de Contacto',
        email: 'Email',
        phone: 'Telefono',
        location: 'Ubicacion',
      },
      social: { title: 'Sigueme' },
    },
    stats: {
      title: 'Estadisticas Tecnicas',
      subtitle: 'Indicadores reales de experiencia tecnica',
      totalProjects: 'Proyectos Totales',
      projectsDescription: 'Proyectos completados exitosamente',
      githubCommits: 'Commits en GitHub',
      commitsDescription: 'Contribuciones en el ultimo anio',
      openSource: 'Proyectos Open Source',
      openSourceDescription: 'Contribuciones a la comunidad',
      collaborations: 'Colaboraciones',
      collaborationsDescription: 'Proyectos en equipo',
      languagesUsed: 'Lenguajes Mas Utilizados',
      projectsTimeline: 'Proyectos por Mes',
      githubActivity: 'Actividad en GitHub (Ultima Semana)',
      codeQuality: 'Calidad del Codigo',
      avgResponseTime: 'Tiempo de Respuesta Promedio',
      projectSuccess: 'Exito de Proyectos',
    },
  },
  en: {
    common: { back: 'Back' },
    nav: {
      home: 'Home',
      about: 'About',
      projects: 'Projects',
      stats: 'Statistics',
      contact: 'Contact',
      downloadCV: 'Download CV',
    },
    hero: {
      greeting: "Hello, I'm Juan Camilo Albarracin",
      role: 'Backend Engineer | Microservices & AI Systems',
      subtitle:
        'I build scalable backends with Clean Architecture, DDD and microservices. I integrate MCP-based agents and AI models for real academic and enterprise use cases.',
      viewProjects: 'View projects',
      contactMe: 'Contact me',
      yearsExperience: 'Years of experience',
      projectsCompleted: 'Projects completed',
      technologies: 'Technologies',
    },
    about: {
      title: 'About Me',
      bio:
        'Backend-focused software engineer. I work with Clean Architecture (Hexagonal), DDD and microservices to build maintainable systems. Experience with C# and Node.js, integrating MCP-based agents and AI models. Currently a software engineering intern in Colombia.',
      technicalSkills: 'Technical Skills',
      softSkillsTitle: 'Soft Skills',
      softSkills: {
        problemSolving: 'Problem solving',
        teamwork: 'Teamwork',
        communication: 'Effective communication',
        adaptability: 'Adaptability',
        leadership: 'Leadership',
        creativity: 'Creativity',
      },
      experienceEducation: 'Experience & Education',
      timeline: {
        work1: {
          title: 'Backend Developer Intern',
          company: 'University in Colombia',
          description:
            'Microservices development with Node.js and C#, JWT authentication with role-based access control (RBAC), and academic bot building using MCP with AI model integration.',
        },
        work2: {
          title: 'SaaS in progress: Goodgate',
          company: 'Personal project',
          description:
            'Supplier management SaaS application. Node.js/TypeScript backend and modular architecture for future scale.',
        },
        education1: {
          title: 'Software Engineering',
          institution: 'University in Colombia',
          description:
            'Training in software architecture, relational databases, design patterns, and backend development.',
        },
      },
    },
    projects: {
      title: 'My Projects',
      subtitle: 'Projects that demonstrate my fullstack development skills.',
      allProjects: 'All projects',
      technologies: 'Technologies used',
      viewMore: 'View more',
      noProjects: 'No projects match the selected filter.',
      totalProjects: '15+',
      modal: {
        problem: 'Problem',
        challenge: 'Challenge',
        solution: 'Solution',
        viewGithub: 'View on GitHub',
        viewLive: 'View project',
      },
      filters: {
        searchLabel: 'Search',
        searchPlaceholder: 'Search projects, technologies...',
        category: 'Category',
        technology: 'Technology',
        sortBy: 'Sort by',
        showing: 'Showing {count} of {total} projects',
        viewGrid: 'Grid view',
        viewList: 'List view',
        clearFilters: 'Clear filters',
        viewDetails: 'View details',
        projectsFound: 'Projects found',
      },
      sortOptions: {
        dateDesc: 'Latest first',
        dateAsc: 'Oldest first',
        starsDesc: 'Most stars',
        starsAsc: 'Least stars',
        viewsDesc: 'Most views',
        nameAsc: 'Name A-Z',
        nameDesc: 'Name Z-A',
      },
      categories: {
        all: 'All projects',
        fullstack: 'Full Stack',
        web: 'Web App',
        devops: 'DevOps',
        ml: 'Machine Learning',
        blockchain: 'Blockchain',
        data: 'Data Engineering',
      },
      allTech: 'All technologies',
      project1: {
        description: 'Complete e-commerce platform.',
        problem: 'Need for a scalable e-commerce solution.',
        challenge: 'Integrate payment gateways and real-time inventory.',
        solution: 'Architecture with React, Node.js, PostgreSQL, Stripe and Redis.',
      },
    },
    contact: {
      title: 'Contact',
      subtitle: 'Interested in working together or collaborating?',
      form: {
        title: 'Send me a message',
        name: 'Name',
        email: 'Email',
        message: 'Message',
        send: 'Send message',
        sending: 'Sending...',
        thankYou: 'Thank you for your message!',
        responseTime: 'I will respond within the next 24 hours.',
        successMessage: 'Message sent successfully',
      },
      info: {
        title: 'Contact Information',
        email: 'Email',
        phone: 'Phone',
        location: 'Location',
      },
      social: { title: 'Follow me' },
    },
    stats: {
      title: 'Technical Statistics',
      subtitle: 'Real technical experience indicators',
      totalProjects: 'Total Projects',
      projectsDescription: 'Projects completed successfully',
      githubCommits: 'GitHub Commits',
      commitsDescription: 'Contributions in the last year',
      openSource: 'Open Source Projects',
      openSourceDescription: 'Community contributions',
      collaborations: 'Collaborations',
      collaborationsDescription: 'Team projects',
      languagesUsed: 'Most Used Languages',
      projectsTimeline: 'Projects per Month',
      githubActivity: 'GitHub Activity (Last Week)',
      codeQuality: 'Code Quality',
      avgResponseTime: 'Average Response Time',
      projectSuccess: 'Project Success',
    },
  },
} as const;

const technicalSkills = [
  'C#',
  '.NET',
  'Node.js',
  'TypeScript',
  'JavaScript',
  'Python',
  'Express',
  'Prisma',
  'Entity Framework Core',
  'PostgreSQL',
  'MariaDB',
  'SQL',
  'Docker',
  'Git',
  'GitFlow',
  'JWT Authentication',
  'Clean Architecture (Hexagonal)',
  'DDD',
  'CQRS',
  'Microservices',
  'MCP (Model Context Protocol)',
  'AI Agent Orchestration',
  'OpenAI & Anthropic SDKs',
  'Jest',
  'CI/CD (Jenkins)',
  'Railway',
  'React (Vite)',
  'CORS',
];

const contactInfo = [
  {
    label: 'Email',
    value: 'albarrajuan5@gmail.com',
    link: 'mailto:albarrajuan5@gmail.com',
  },
  { label: 'Location', value: 'Bogota, Colombia', link: null },
];

const socialLinks = [
  { label: 'GitHub', link: 'https://github.com/Albarracin-sg', color: 'gray' },
];

async function seedTranslations() {
  for (const [lang, namespaces] of Object.entries(translations)) {
    for (const [namespace, content] of Object.entries(namespaces)) {
      await prisma.translation.upsert({
        where: { lang_namespace: { lang, namespace } },
        update: { content },
        create: { lang, namespace, content },
      });
    }
  }
}

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
    greeting: translations.es.hero.greeting,
    role: translations.es.hero.role,
    subtitle: translations.es.hero.subtitle,
    primaryImage:
      'https://images.unsplash.com/photo-1666875758376-25755544ba8d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXZlbG9wZXIlMjBpbGx1c3RyYXRpb24lMjBjYXJ0b29uJTIwcGVyc29uJTIwY29kaW5nfGVufDF8fHx8MTc1NzIyMDk0N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    secondaryImage:
      'https://images.unsplash.com/photo-1737574107736-9e02ca5d5387?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBkZXZlbG9wZXIlMjBwb3J0cmFpdCUyMHNvZnR3YXJlJTIwZW5naW5lZXJ8ZW58MXx8fHwxNzU3MjIwOTUwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    stats: {
      yearsExperience: '1+',
      projectsCompleted: '10+',
      technologies: '18+',
    },
    cta: {
      viewProjects: translations.es.hero.viewProjects,
      contactMe: translations.es.hero.contactMe,
    },
  };

  const aboutContent = {
    title: translations.es.about.title,
    bio: translations.es.about.bio,
    technicalSkills,
    softSkills: Object.values(translations.es.about.softSkills),
    timeline: [
      {
        type: 'work',
        title: translations.es.about.timeline.work1.title,
        company: translations.es.about.timeline.work1.company,
        period: '2024 - Present',
        location: 'Bogota, Colombia',
        description: translations.es.about.timeline.work1.description,
      },
      {
        type: 'work',
        title: translations.es.about.timeline.work2.title,
        company: translations.es.about.timeline.work2.company,
        period: '2024 - Present',
        location: 'Bogota, Colombia',
        description: translations.es.about.timeline.work2.description,
      },
      {
        type: 'education',
        title: translations.es.about.timeline.education1.title,
        company: translations.es.about.timeline.education1.institution,
        period: 'En curso',
        location: 'Colombia',
        description: translations.es.about.timeline.education1.description,
      },
    ],
  };

  const projectsContent = {
    title: translations.es.projects.title,
    subtitle: translations.es.projects.subtitle,
    cta: translations.es.projects.allProjects,
  };

  const contactContent = {
    title: translations.es.contact.title,
    subtitle: translations.es.contact.subtitle,
    form: translations.es.contact.form,
    info: contactInfo,
    social: socialLinks,
  };

  const statsContent = {
    title: translations.es.stats.title,
    subtitle: translations.es.stats.subtitle,
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
        description: 'Proyectos academicos y profesionales',
      },
    ],
    charts: {
      languageData: [
        { name: 'JavaScript', value: 35, color: '#f7df1e' },
        { name: 'TypeScript', value: 25, color: '#3178c6' },
        { name: 'Python', value: 15, color: '#3776ab' },
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
      title: 'E-Commerce Platform',
      description: 'Full-stack e-commerce solution with microservices architecture',
      problem: 'Small businesses need affordable e-commerce solutions that scale.',
      challenge: 'High traffic with consistent data across services.',
      solution: 'Event-driven architecture with caching and horizontal scaling.',
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      githubUrl: 'https://github.com/username/ecommerce-platform',
      liveUrl: 'https://ecommerce-demo.com',
      category: 'fullstack',
      status: 'production',
      featured: true,
      stars: 156,
      forks: 43,
      views: 2340,
      date: new Date('2024-01-15'),
      technologies: {
        create: [
          'React',
          'Node.js',
          'PostgreSQL',
          'Redis',
          'Docker',
          'AWS',
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
  await seedTranslations();
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
