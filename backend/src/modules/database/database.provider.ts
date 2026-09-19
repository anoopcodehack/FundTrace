import * as mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProviders = [
  {
    provide: DATABASE_CONNECTION,
    useFactory: (configService: ConfigService) => {
      const logger = new Logger('DatabaseProvider');
      const uri = configService.get<string>('MONGODB_URI') || 'mongodb://127.0.0.1:27017/fundtrace';

      // Connect asynchronously so startup is immediate
      mongoose
        .connect(uri, {
          serverSelectionTimeoutMS: 2000,
          connectTimeoutMS: 2000,
        })
        .then(() => {
          logger.log(`✔ Connected to MongoDB at ${uri}`);
        })
        .catch((err: any) => {
          logger.warn(`ℹ MongoDB is not active (${err.message}). In-memory fallback mode active.`);
        });

      return mongoose;
    },
    inject: [ConfigService],
  },
];
