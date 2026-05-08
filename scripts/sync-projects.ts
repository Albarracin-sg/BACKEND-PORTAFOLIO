import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('SyncScript');
  logger.log('🚀 Starting automated GitHub sync...');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const projectsService = app.get(ProjectsService);

    logger.log('📡 Fetching and enriching projects from GitHub (this may take a while)...');
    const result = await projectsService.syncGithubProjects();
    
    logger.log('✅ Sync completed successfully!');
    logger.log(`📊 Total repos: ${result.total} | Created: ${result.created} | Updated: ${result.updated}`);
    
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

bootstrap();
