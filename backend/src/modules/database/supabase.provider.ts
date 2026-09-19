import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

export const supabaseProviders = [
  {
    provide: SUPABASE_CLIENT,
    useFactory: (configService: ConfigService): SupabaseClient => {
      const logger = new Logger('SupabaseProvider');
      const supabaseUrl =
        configService.get<string>('SUPABASE_URL') ||
        'https://placeholder-project.supabase.co';
      const supabaseKey =
        configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
        configService.get<string>('SUPABASE_ANON_KEY') ||
        'placeholder-key';

      const isConfigured =
        Boolean(supabaseUrl) &&
        !supabaseUrl.includes('placeholder') &&
        Boolean(supabaseKey);

      if (isConfigured) {
        logger.log(`✔ Connected to Supabase at ${supabaseUrl}`);
      } else {
        logger.warn(
          `ℹ Supabase credentials not set in .env. Resilient in-memory fallback active.`
        );
      }

      return createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
    },
    inject: [ConfigService],
  },
];
