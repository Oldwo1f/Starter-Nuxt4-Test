import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
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
  
  // Custom middleware for academy videos to handle special characters (#, spaces, etc.)
  // This must be registered BEFORE useStaticAssets to intercept requests
  app.use('/uploads/academy', (req, res, next) => {
    const { createReadStream, statSync, existsSync } = require('fs');
    const { join } = require('path');
    const { decodeURIComponent } = require('url');
    
    // Get the path after /uploads/academy
    // Use req.url instead of req.path to get the full URL including query string
    const urlPath = req.url.split('?')[0]; // Remove query string if present
    const relativePath = urlPath.replace(/^\/uploads\/academy/, '');
    
    // Decode the URL to handle %20, %23, etc.
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(relativePath);
    } catch (e) {
      decodedPath = relativePath;
    }
    
    // Remove leading slash if present
    const cleanPath = decodedPath.startsWith('/') ? decodedPath.slice(1) : decodedPath;
    
    // Build the full file path
    const filePath = join(process.cwd(), uploadPath, 'academy', cleanPath);
    
    // Security: ensure the path is within the academy directory
    const academyBasePath = join(process.cwd(), uploadPath, 'academy');
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    const normalizedBasePath = academyBasePath.replace(/\\/g, '/');
    
    if (!normalizedFilePath.startsWith(normalizedBasePath)) {
      return res.status(400).json({ message: 'Invalid file path' });
    }
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ message: `File not found: ${cleanPath}` });
    }
    
    const stat = statSync(filePath);
    if (!stat.isFile()) {
      return res.status(404).json({ message: 'Not a file' });
    }
    
    const fileSize = stat.size;
    const range = req.headers['range'] as string | undefined;
    
    // Get MIME type
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
    const contentType = mimeTypes[ext || ''] || 'video/mp4';
    
    // Set CORS headers
    const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (range) {
      // Parse Range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = createReadStream(filePath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      });
      
      file.pipe(res);
    } else {
      // Send entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });
      
      createReadStream(filePath).pipe(res);
    }
  });
  
  // Serve other static files normally
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
