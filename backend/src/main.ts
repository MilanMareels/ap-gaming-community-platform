import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';
import { PrismaModel } from './_gen/prisma-class/index.js';
import configuration from './common/config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = configuration();

  if (config.nodeEnv === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', true);
  }

  app.use(json());
  app.use(urlencoded({ extended: true }));
  app.use(cookieParser(config.session.secret));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (process.env.SWAGGER_ENABLED === 'true') {
    const swaggerConfig = new DocumentBuilder().setTitle('API Documentation').addServer('/api').setDescription('API Documentation').build();

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      ignoreGlobalPrefix: true,
      extraModels: [...PrismaModel.extraModels],
    });
    SwaggerModule.setup('swagger', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  Logger.log(`🎉 Server running on port ${port}`, 'Application');
}

void bootstrap();
