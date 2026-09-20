import { Client } from "pg";

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.ucoflqmhvpoqloxcofgz:fundtrace.123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  try {
    // 1. Create the bucket
    await client.query(`
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('receipts', 'receipts', true) 
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    
    // 2. Add policy for public access if needed (optional)
    await client.query(`
      CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
    `).catch(() => {}); // ignore if policy exists
    
    console.log('✅ Supabase "receipts" bucket successfully created and configured!');
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
