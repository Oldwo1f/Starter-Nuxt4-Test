import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Configure raw body for Stripe webhook
  app.use('/stripe/webhook', express.raw({ type: 'application/json' }));
  
  // Global exception filter for better error logging
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  });
  
  // Serve static files from uploads directory with proper headers for video streaming
  const uploadPath = process.env.UPLOAD_DEST || 'uploads';
  app.useStaticAssets(join(process.cwd(), uploadPath), {
    prefix: '/uploads',
    setHeaders: (res, path, stat) => {
      // Set proper headers for video files to enable streaming
      if (path.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
        res.setHeader('Content-Type', getVideoMimeType(path));
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        // Set Content-Length for proper Range request support
        if (stat) {
          res.setHeader('Content-Length', stat.size);
        }
      }
    },
  });

  // Helper function to get MIME type for video files
  function getVideoMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      ogg: 'video/ogg',
      ogv: 'video/ogg',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
    };
    return mimeTypes[ext || ''] || 'video/mp4';
  }
  
  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform payloads to DTO instances
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
    }),
  );
  
  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Nuna Heritage API')
    .setDescription('API documentation for Nuna Heritage application')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('blog', 'Blog post endpoints')
    .addTag('users', 'User management endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation available at: ${await app.getUrl()}/api`);
  console.log(`Static files served from: ${join(process.cwd(), uploadPath)}`);
}
bootstrap();
