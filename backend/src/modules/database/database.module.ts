import { Module, Global } from '@nestjs/common';
import { databaseProviders } from './database.provider';
import { supabaseProviders } from './supabase.provider';

@Global()
@Module({
  providers: [...databaseProviders, ...supabaseProviders],
  exports: [...databaseProviders, ...supabaseProviders],
})
export class DatabaseModule {}
