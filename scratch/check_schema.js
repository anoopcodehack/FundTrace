const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres.ucoflqmhvpoqloxcofgz:fundtrace.123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const cRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'campaigns'");
  console.log('Campaigns columns:', cRes.rows.map(r => `${r.column_name} (${r.data_type})`));

  const uRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
  console.log('Users columns:', uRes.rows.map(r => `${r.column_name} (${r.data_type})`));

  const aRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_events'");
  console.log('Audit events columns:', aRes.rows.map(r => `${r.column_name} (${r.data_type})`));

  await client.end();
}

main().catch(console.error);
