import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('FundTraceBackend');
  const app = await NestFactory.create(AppModule);

  // Set global API route prefix
  app.setGlobalPrefix('api');

  // Enable CORS for Next.js frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // Swagger OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('FundTrace API')
    .setDescription(
      'FundTrace Backend API for campaign metadata management, cryptographic Keccak-256 proof validation, and smart contract event ledger.'
    )
    .setVersion('1.0')
    .addTag('Campaigns')
    .addTag('Proofs & Quotes')
    .addTag('Audit Ledger')
    .addTag('Health & System')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 FundTrace NestJS API running at: http://localhost:${port}/api`);
  logger.log(`📖 Swagger API Docs accessible at: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during NestJS bootstrap:', err);
  process.exit(1);
});
