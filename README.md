# Portfolio CMS Backend

Nucleo del portafolio. API con **NestJS** para gestionar contenido, proyectos, mensajes de contacto y archivos multimedia.

## Stack

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Docs**: Swagger / OpenAPI
- **Auth**: JWT + Roles (Admin/User)
- **Email**: Nodemailer + Handlebars
- **Storage**: Local / AWS S3
- **Validation**: class-validator + class-transformer
- **Containers**: Docker + Docker Compose
- **Package**: pnpm

## Features

- **Projects** — CRUD, categories, technologies, GitHub stats, featured
- **Contact** — receive messages, strict validation, auto-reply email
- **CMS** — dynamic sections and pages for the frontend
- **Media** — file upload with MIME/size validation, unique names
- **Auth** — admin login, role-based access control
- **Validation** — global pipes, whitelist, forbidNonWhitelisted
- **Stats** — endpoint analytics, request logging

## Quick Start

```bash
pnpm install
cp .env.example .env   # configurar credenciales
docker-compose -f infra/docker/docker-compose.yml up -d   # base de datos
npx prisma migrate dev
pnpm run start:dev     # http://localhost:3000
```

## API Docs

With the server running:

```
http://localhost:3000/api/v1/docs
```

## Docker

```bash
docker build -t portfolio-backend -f infra/docker/Dockerfile .
```

---

Desarrollado por [Juan Albarracin](https://github.com/Albarracin-sg)
