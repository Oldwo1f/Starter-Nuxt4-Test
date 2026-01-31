import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  // Serve static files from uploads directory
  const uploadPath = process.env.UPLOAD_DEST || 'uploads';
  app.useStaticAssets(join(process.cwd(), uploadPath), {
    prefix: '/uploads',
  });
  
  // Enable validation
  app.useGlobalPipes(new ValidationPipe());
  
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
  
  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation available at: ${await app.getUrl()}/api`);
  console.log(`Static files served from: ${join(process.cwd(), uploadPath)}`);
}
bootstrap();
