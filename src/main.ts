// Load environment variables first before any other imports
import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from '@app/app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Increase body size limit for chart images in exports
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(configService.get<string>('app.swagger.title') || 'Measura API')
    .setDescription(
      configService.get<string>('app.swagger.description') ||
        'API for Measura - Software Measurement Tool',
    )
    .setVersion(configService.get<string>('app.swagger.version') || '1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerPath = configService.get<string>('app.swagger.path') || 'api';
  SwaggerModule.setup(swaggerPath, app, document);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://*.azurewebsites.net',
      'https://measura.xyz',
      'https://www.measura.xyz',
      configService.get<string>('app.email.frontendUrl') ||
        'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Bearer',
      'sec-ch-ua',
      'sec-ch-ua-mobile',
      'sec-ch-ua-platform',
    ],
    credentials: true,
  });

  // Azure App Service provides PORT via environment variable
  const port =
    process.env.PORT || configService.get<number>('app.port') || 8080;

  await app.listen(port);
  const serverUrl = await app.getUrl();
  console.log(`Application is running on: ${serverUrl}`);
  console.log(
    `Swagger documentation is available at: ${serverUrl}/${swaggerPath}`,
  );
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
