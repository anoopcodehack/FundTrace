import { Client } from "pg";
import crypto from "crypto";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.ucoflqmhvpoqloxcofgz:fundtrace.123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

// Simple hasher that mimics the backend canonical.ts logic
function computeHash(data: any): string {
  const jsonString = JSON.stringify(data);
  return "0x" + crypto.createHash("sha256").update(jsonString).digest("hex");
}

async function main() {
  console.log("Connecting to Supabase PostgreSQL to seed data...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const creator = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const verifier = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  // 1. Insert users
  await client.query(
    "INSERT INTO public.users (wallet_address, name, role, bio) VALUES ($1, $2, $3, $4) ON CONFLICT (wallet_address) DO NOTHING",
    [creator, "Alice (Creator)", "CREATOR", "A passionate teacher."]
  );
  await client.query(
    "INSERT INTO public.users (wallet_address, name, role, bio) VALUES ($1, $2, $3, $4) ON CONFLICT (wallet_address) DO NOTHING",
    [verifier, "Global STEM Org", "VERIFIER", "Official verifier for education grants."]
  );

  // 2. Insert Campaign
  const demoPayload = {
    title: "Build Rural STEM Lab",
    story: "Equipping 10 rural schools with robotics starter kits, sensors, and microcontrollers.",
    category: "Education",
    location: "Rural District",
  };
  const metadataHash = computeHash(demoPayload);

  await client.query(
    `INSERT INTO public.campaigns (
      on_chain_id, creator_address, verifier_address, title, category, story, location, canonical_hash, cover_image_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
    ON CONFLICT (on_chain_id) DO NOTHING`,
    [
      1,
      creator,
      verifier,
      demoPayload.title,
      demoPayload.category,
      demoPayload.story,
      demoPayload.location,
      metadataHash,
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80"
    ]
  );

  console.log("✅ Seeded demo data successfully!");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
