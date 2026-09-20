import { Client } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.ucoflqmhvpoqloxcofgz:fundtrace.123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

async function main() {
  console.log("Connecting to Supabase PostgreSQL at aws-0-ap-southeast-1.pooler.supabase.com...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("✅ Connected successfully to Supabase PostgreSQL database!");

  // Create tables
  const sql = `
  CREATE TABLE IF NOT EXISTS public.users (
      wallet_address TEXT PRIMARY KEY,
      name TEXT,
      avatar_url TEXT,
      role TEXT CHECK (role IN ('DONOR', 'CREATOR', 'VERIFIER', 'BENEFICIARY')),
      bio TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.campaigns (
      id BIGSERIAL PRIMARY KEY,
      on_chain_id INTEGER UNIQUE NOT NULL,
      creator_address TEXT REFERENCES public.users(wallet_address),
      verifier_address TEXT REFERENCES public.users(wallet_address),
      title TEXT NOT NULL,
      tagline TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Community',
      story TEXT NOT NULL,
      location TEXT DEFAULT 'Global',
      cover_image_url TEXT DEFAULT '',
      canonical_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.spending_requests (
      id BIGSERIAL PRIMARY KEY,
      on_chain_campaign_id INTEGER REFERENCES public.campaigns(on_chain_id),
      on_chain_request_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      vendor_name TEXT NOT NULL,
      vendor_website TEXT DEFAULT '',
      quote_file_name TEXT NOT NULL,
      quote_file_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(on_chain_campaign_id, on_chain_request_id)
  );

  CREATE TABLE IF NOT EXISTS public.proof_documents (
      id BIGSERIAL PRIMARY KEY,
      campaign_id INTEGER REFERENCES public.campaigns(on_chain_id),
      request_id INTEGER NOT NULL,
      document_type TEXT NOT NULL CHECK (document_type IN ('quote', 'invoice_original', 'invoice_tampered', 'receipt')),
      file_name TEXT NOT NULL,
      mime_type TEXT DEFAULT 'application/pdf',
      file_size_bytes INTEGER DEFAULT 0,
      file_hash TEXT NOT NULL,
      storage_path TEXT,
      uploaded_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(campaign_id, request_id, document_type)
  );

  CREATE TABLE IF NOT EXISTS public.campaign_updates (
      id BIGSERIAL PRIMARY KEY,
      campaign_id INTEGER REFERENCES public.campaigns(on_chain_id),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.spending_requests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.proof_documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
  `;

  await client.query(sql);
  console.log("✔ Created tables: public.users, public.campaigns, public.spending_requests, public.proof_documents, public.campaign_updates");

  // Create RLS policies
  const policies = `
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on users') THEN
      CREATE POLICY "Allow public read on users" ON public.users FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on campaigns') THEN
      CREATE POLICY "Allow public read on campaigns" ON public.campaigns FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on requests') THEN
      CREATE POLICY "Allow public read on requests" ON public.spending_requests FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on proofs') THEN
      CREATE POLICY "Allow public read on proofs" ON public.proof_documents FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on updates') THEN
      CREATE POLICY "Allow public read on updates" ON public.campaign_updates FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write on users') THEN
      CREATE POLICY "Allow public write on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write on campaigns') THEN
      CREATE POLICY "Allow public write on campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write on requests') THEN
      CREATE POLICY "Allow public write on requests" ON public.spending_requests FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write on proofs') THEN
      CREATE POLICY "Allow public write on proofs" ON public.proof_documents FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write on updates') THEN
      CREATE POLICY "Allow public write on updates" ON public.campaign_updates FOR ALL USING (true) WITH CHECK (true);
    END IF;
  END $$;
  `;

  await client.query(policies);
  console.log("✔ Applied RLS and public access policies.");

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  console.log("Active public tables:", tables.rows.map((r) => r.table_name));

  await client.end();
  console.log("Migration complete!");
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
