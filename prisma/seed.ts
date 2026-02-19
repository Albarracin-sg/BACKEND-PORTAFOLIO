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
      greeting: 'Hola, soy Juan Perez',
      role: 'Fullstack Developer (Nest.js + React)',
      subtitle: 'Creo aplicaciones web modernas y escalables con las ultimas tecnologias.',
      viewProjects: 'Ver proyectos',
      contactMe: 'Contactarme',
      yearsExperience: 'Anios de experiencia',
      projectsCompleted: 'Proyectos completados',
      technologies: 'Tecnologias',
    },
    about: {
      title: 'Sobre mi',
      bio: 'Soy un desarrollador fullstack apasionado por crear soluciones digitales innovadoras.',
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
          title: 'Senior Fullstack Developer',
          company: 'Tech Solutions Inc.',
          description: 'Desarrollo de aplicaciones web escalables con React, Node.js y PostgreSQL.',
        },
        work2: {
          title: 'Frontend Developer',
          company: 'Digital Agency Madrid',
          description: 'Creacion de interfaces modernas y responsivas con React y TypeScript.',
        },
        education1: {
          title: 'Ingenieria Informatica',
          institution: 'Universidad Politecnica de Madrid',
          description: 'Grado en Ingenieria Informatica con especializacion en desarrollo de software.',
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
      subtitle: 'Tienes un proyecto en mente? Me encantaria conocer mas.',
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
      title: 'Estadisticas',
      subtitle: 'Metricas y datos sobre mi actividad como desarrollador.',
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
      greeting: "Hello, I'm Juan Perez",
      role: 'Fullstack Developer (Nest.js + React)',
      subtitle: 'I create modern and scalable web applications with cutting-edge technologies.',
      viewProjects: 'View projects',
      contactMe: 'Contact me',
      yearsExperience: 'Years of experience',
      projectsCompleted: 'Projects completed',
      technologies: 'Technologies',
    },
    about: {
      title: 'About Me',
      bio: "I'm a fullstack developer passionate about creating innovative digital solutions.",
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
          title: 'Senior Fullstack Developer',
          company: 'Tech Solutions Inc.',
          description: 'Development of scalable web applications using React, Node.js and PostgreSQL.',
        },
        work2: {
          title: 'Frontend Developer',
          company: 'Digital Agency Madrid',
          description: 'Creation of modern and responsive user interfaces with React and TypeScript.',
        },
        education1: {
          title: 'Computer Engineering',
          institution: 'Universidad Politecnica de Madrid',
          description: 'Bachelor degree in Computer Engineering with specialization in software development.',
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
      subtitle: 'Have a project in mind? I would love to hear more.',
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
      title: 'Statistics',
      subtitle: 'Metrics and data about my activity as a developer.',
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
  'React',
  'Node.js',
  'TypeScript',
  'Nest.js',
  'PostgreSQL',
  'MongoDB',
  'Docker',
  'AWS',
  'Git',
  'GraphQL',
  'Jest',
  'Tailwind CSS',
];

const contactInfo = [
  { label: 'Email', value: 'hello@developer.com', link: 'mailto:hello@developer.com' },
  { label: 'Phone', value: '+34 123 456 789', link: 'tel:+34123456789' },
  { label: 'Location', value: 'Madrid, Espana', link: null },
];

const socialLinks = [
  { label: 'GitHub', link: 'https://github.com', color: 'gray' },
  { label: 'LinkedIn', link: 'https://linkedin.com', color: 'blue' },
  { label: 'Email', link: 'mailto:hello@developer.com', color: 'red' },
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
    stats: {
      yearsExperience: '3+',
      projectsCompleted: '15+',
      technologies: '5+',
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
        period: '2022 - Present',
        location: 'Remote',
        description: translations.es.about.timeline.work1.description,
      },
      {
        type: 'work',
        title: translations.es.about.timeline.work2.title,
        company: translations.es.about.timeline.work2.company,
        period: '2021 - 2022',
        location: 'Madrid, Espana',
        description: translations.es.about.timeline.work2.description,
      },
      {
        type: 'education',
        title: translations.es.about.timeline.education1.title,
        company: translations.es.about.timeline.education1.institution,
        period: '2018 - 2022',
        location: 'Madrid, Espana',
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
        title: translations.es.stats.totalProjects,
        value: '25+',
        description: translations.es.stats.projectsDescription,
      },
      {
        title: translations.es.stats.githubCommits,
        value: '1,240',
        description: translations.es.stats.commitsDescription,
      },
      {
        title: translations.es.stats.openSource,
        value: '8',
        description: translations.es.stats.openSourceDescription,
      },
      {
        title: translations.es.stats.collaborations,
        value: '12',
        description: translations.es.stats.collaborationsDescription,
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
  await seedSampleProject();
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
