import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UPLOAD_DIR } from './admin/admin.module';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('v1');
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') ?? true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Admin yuklagan mahsulot rasmlari. Ishlab chiqarishda S3 yoki CDN bilan almashtiriladi.
  app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads/', maxAge: '30d' });

  const config = new DocumentBuilder().setTitle('Vet Products API').setVersion('1').addBearerAuth().build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(Number(process.env.PORT ?? 4000));
}
bootstrap();
