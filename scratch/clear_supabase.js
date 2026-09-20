const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

async function main() {
  let supabaseUrl = process.env.SUPABASE_URL;
  let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  let dbUrl = process.env.DATABASE_URL || "postgresql://postgres.ucoflqmhvpoqloxcofgz:fundtrace.123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

  try {
    if (fs.existsSync('backend/.env')) {
      const bEnv = dotenv.parse(fs.readFileSync('backend/.env'));
      supabaseUrl = supabaseUrl || bEnv.SUPABASE_URL;
      supabaseKey = supabaseKey || bEnv.SUPABASE_SERVICE_ROLE_KEY || bEnv.SUPABASE_ANON_KEY;
    }
  } catch (e) {}

  console.log("Connecting to Supabase PostgreSQL...");
  const pgClient = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  await pgClient.connect();
  console.log("Connected to PostgreSQL!");

  // List of tables to check & clear
  const tables = [
    'quotations',
    'creator_scores',
    'score_history',
    'automation_settings',
    'audit_events',
    'campaign_updates',
    'proof_documents',
    'spending_requests',
    'campaigns',
    'users'
  ];

  console.log("\n--- CURRENT ROW COUNTS ---");
  for (const table of tables) {
    try {
      const res = await pgClient.query(`SELECT COUNT(*) FROM public."${table}"`);
      console.log(`${table}: ${res.rows[0].count} rows`);
    } catch (err) {
      console.log(`${table}: (does not exist or error: ${err.message})`);
    }
  }

  console.log("\n--- CLEARING DATA (TRUNCATING TABLES) ---");
  for (const table of tables) {
    try {
      await pgClient.query(`TRUNCATE TABLE public."${table}" CASCADE`);
      console.log(`✔ Cleared public."${table}"`);
    } catch (err) {
      console.warn(`Could not truncate ${table}: ${err.message}`);
    }
  }

  console.log("\n--- VERIFYING POST-CLEAR ROW COUNTS ---");
  for (const table of tables) {
    try {
      const res = await pgClient.query(`SELECT COUNT(*) FROM public."${table}"`);
      console.log(`${table}: ${res.rows[0].count} rows`);
    } catch (err) {
      // Table doesn't exist
    }
  }

  // Also check Supabase Storage buckets if client configured
  if (supabaseUrl && supabaseKey) {
    console.log("\n--- CHECKING SUPABASE STORAGE BUCKETS ---");
    const sb = createClient(supabaseUrl, supabaseKey);
    try {
      const { data: buckets, error } = await sb.storage.listBuckets();
      if (buckets && buckets.length > 0) {
        console.log(`Found ${buckets.length} storage buckets:`, buckets.map(b => b.name));
        for (const b of buckets) {
          const { data: files } = await sb.storage.from(b.name).list();
          if (files && files.length > 0) {
            console.log(`Bucket '${b.name}' has ${files.length} files. Removing...`);
            const paths = files.map(f => f.name);
            await sb.storage.from(b.name).remove(paths);
            console.log(`✔ Cleared bucket '${b.name}'`);
          } else {
            console.log(`Bucket '${b.name}' is already empty.`);
          }
        }
      } else {
        console.log("No custom storage buckets found or error:", error?.message);
      }
    } catch (sErr) {
      console.warn("Storage check note:", sErr.message);
    }
  }

  await pgClient.end();
  console.log("\n✅ Supabase data cleared successfully!");
}

main().catch(console.error);
