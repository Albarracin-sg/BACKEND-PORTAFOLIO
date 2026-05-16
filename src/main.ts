import { createHttpApp } from './app.factory';

async function bootstrap() {
  const { app, env } = await createHttpApp();
  await app.listen(env.PORT);
}

bootstrap();