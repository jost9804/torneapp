import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { IMAGES_DIR, IMAGES_ROUTE } from './images/images';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Native apps ignore CORS; this only limits which websites may call the API.
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors(origins.length ? { origin: origins } : undefined);
  // Every upload gets a new file name, so pictures can be cached for good
  app.useStaticAssets(IMAGES_DIR, { prefix: IMAGES_ROUTE, immutable: true, maxAge: '365d' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
