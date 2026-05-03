import { createHttpApp } from './app.factory';

let appInstance = null;

export async function startServer() {
  if (!appInstance) {
    const { app, env } = await createHttpApp();
    await app.listen(env.PORT);
    appInstance = app;
  }
  return appInstance;
}

async function bootstrap() {
  await startServer();
}

// Only run bootstrap if not in Netlify
if (!process.env.NETLIFY) {
  bootstrap();
}