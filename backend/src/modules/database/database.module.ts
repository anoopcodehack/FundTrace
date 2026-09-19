import { Module, Global } from '@nestjs/common';
import { supabaseProviders } from './supabase.provider';

@Global()
@Module({
  providers: [...supabaseProviders],
  exports: [...supabaseProviders],
})
export class DatabaseModule {}
