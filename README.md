# 🚀 Portfolio CMS Backend

Este es el núcleo de mi portafolio profesional. Una API robusta, escalable y segura construida con **NestJS**, diseñada para gestionar contenido, proyectos, mensajes de contacto y archivos multimedia de manera eficiente.

## 🛠️ Stack Tecnológico

- **Framework:** [NestJS](https://nestjs.com/) (Node.js)
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL
- **ORM:** [Prisma](https://www.prisma.io/)
- **Documentación:** [Swagger/OpenAPI](https://swagger.io/)
- **Seguridad:** JWT + Roles (Admin/User)
- **Correo:** Nodemailer + Handlebars (Templates dinámicos)
- **Multimedia:** Soporte para Local Storage y AWS S3
- **Validación:** Class-validator & Class-transformer
- **Contenedores:** Docker & Docker Compose

## ✨ Características Principales

- **Gestión de Proyectos:** CRUD completo con soporte para categorías, tecnologías, estadísticas de GitHub y destacados.
- **Sistema de Contacto:** Recepción de mensajes con validación estricta y notificaciones automáticas por mail tanto al admin como al usuario.
- **CMS de Contenido:** Manejo dinámico de secciones y páginas para el frontend.
- **Búnker de Multimedia:** Sistema de carga de archivos con filtros de seguridad (MIME types, tamaño) y generación de nombres únicos.
- **Validación E2E:** Pipes globales que aseguran que no entre "basura" al sistema (`whitelist`, `forbidNonWhitelisted`).
- **Arquitectura Modular:** Código organizado por dominios, fácil de mantener y testear.

## 🚀 Instalación Rápida

### Requisitos previos

- Node.js (v18+)
- pnpm (recomendado)
- Docker (opcional, para la base de datos)

### Pasos

1. **Clonar el repo:**
   ```bash
   git clone <tu-repo-url>
   cd BACKEND-PORTAFOLIO
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Editá el .env con tus credenciales
   ```

3. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

4. **Levantar la base de datos (Docker):**
   ```bash
   docker-compose -f infra/docker/docker-compose.yml up -d
   ```

5. **Correr migraciones de Prisma:**
   ```bash
   npx prisma migrate dev
   ```

6. **Iniciar en modo desarrollo:**
   ```bash
   pnpm run start:dev
   ```

## 📖 Documentación de la API

Una vez que el servidor esté corriendo, podés explorar y probar todos los endpoints desde la interfaz de Swagger:

🔗 `http://localhost:3000/api/v1/docs`

## 🐳 Docker

El proyecto está preparado para correr en contenedores. Podés construir la imagen de producción con:

```bash
docker build -t portfolio-backend -f infra/docker/Dockerfile .
```

---
Desarrollado con ❤️ por [Juan Albarracín](https://juanalbarracin.dev)
