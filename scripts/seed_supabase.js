const { Client } = require('pg');
const { ethers } = require('ethers');
const crypto = require('crypto');

function computeHash(data) {
  const jsonString = JSON.stringify(data);
  return '0x' + crypto.createHash('sha256').update(jsonString).digest('hex');
}

async function main() {
  const dbUrl = process.env.DATABASE_URL || "postgresql://postgres.ucoflqmhvpoqloxcofgz:fundtrace.123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
  console.log("Connecting to Supabase PostgreSQL at", dbUrl.split('@')[1] || dbUrl);

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Connected to Supabase PostgreSQL!");

  // Step 1: Ensure columns on campaigns table
  await client.query(`
    ALTER TABLE public.campaigns 
    ADD COLUMN IF NOT EXISTS planned_budget JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS funding_deadline TIMESTAMPTZ;
  `);

  // Ensure role constraint on users table accommodates ADMIN
  try {
    await client.query(`ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;`);
    await client.query(`
      ALTER TABLE public.users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('DONOR', 'CREATOR', 'VERIFIER', 'BENEFICIARY', 'ADMIN'));
    `);
  } catch (cErr) {
    console.warn("Role constraint note:", cErr.message);
  }

  // Step 2: Seed Users
  console.log("\n--- SEEDING USERS ---");
  const users = [
    {
      wallet_address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase(),
      name: "FundTrace System Foundation",
      role: "ADMIN",
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
      bio: "Core protocol administrator and deployer governance authority."
    },
    {
      wallet_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(),
      name: "Dr. Sarah Chen",
      role: "CREATOR",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      bio: "STEM education director and lead researcher for rural educational equity."
    },
    {
      wallet_address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f".toLowerCase(),
      name: "Ramesh Patel",
      role: "CREATOR",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=ramesh",
      bio: "Clean water infrastructure project manager with 12+ years field experience in arid regions."
    },
    {
      wallet_address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720".toLowerCase(),
      name: "Maria Santos",
      role: "CREATOR",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
      bio: "Renewable energy coordinator for primary health centers and cold-chain vaccine storage."
    },
    {
      wallet_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
      name: "Global Impact Auditor",
      role: "VERIFIER",
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=verifier",
      bio: "Accredited non-governmental verifier ensuring rigorous proposal and proof verification."
    },
    {
      wallet_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
      name: "Alice Vandermeer",
      role: "DONOR",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
      bio: "Lead philanthropic contributor backing transparent high-impact humanitarian campaigns."
    },
    {
      wallet_address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65".toLowerCase(),
      name: "Bob Martinez",
      role: "DONOR",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
      bio: "Tech entrepreneur and angel donor focused on open governance and verifiable milestone tracking."
    },
    {
      wallet_address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc".toLowerCase(),
      name: "Charlie Zhang",
      role: "DONOR",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
      bio: "Community donor participating in decentralized governance."
    },
    {
      wallet_address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9".toLowerCase(),
      name: "Rural Community Trust",
      role: "BENEFICIARY",
      avatar_url: "https://api.dicebear.com/7.x/identicon/svg?seed=beneficiary",
      bio: "Local community development trust and verified milestone recipient."
    }
  ];

  for (const u of users) {
    await client.query(`
      INSERT INTO public.users (wallet_address, name, role, avatar_url, bio)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (wallet_address) DO UPDATE 
      SET name = EXCLUDED.name, role = EXCLUDED.role, avatar_url = EXCLUDED.avatar_url, bio = EXCLUDED.bio
    `, [u.wallet_address, u.name, u.role, u.avatar_url, u.bio]);
    console.log(`✔ Seeded user: ${u.name} (${u.role}) - ${u.wallet_address}`);
  }

  // Step 3: Seed Campaigns
  console.log("\n--- SEEDING CAMPAIGNS ---");
  const campaigns = [
    {
      on_chain_id: 1,
      title: "Build Rural STEM Lab & Robotics Center",
      tagline: "Equipping 10 rural schools with robotics starter kits, sensors, and microcontrollers",
      category: "Education",
      location: "Maharashtra, India",
      creator_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(),
      verifier_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
      cover_image_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80",
      story: "Across rural regions, underfunded schools lack access to modern science kits and technology tools. This audited initiative equips 10 rural schools with programmable robotics starter kits, digital microscopes, sensors, and solar power units. Verified milestone spending releases ensure funds directly purchase certified learning equipment.",
      planned_budget: [
        { category: "Microcontrollers & Robotics Hardware", amount: 120000 },
        { category: "Sensors, Breadboards & Circuitry", amount: 80000 },
        { category: "Certified Curriculum & Trainer Workshops", amount: 40000 }
      ],
      funding_deadline: new Date(Date.now() + 86400000 * 30).toISOString()
    },
    {
      on_chain_id: 2,
      title: "Clean Drinking Water Well Initiative",
      tagline: "Solar-powered deep aquifer well and filtration system for 2,500 villagers",
      category: "Health",
      location: "Rajasthan, India",
      creator_address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f".toLowerCase(),
      verifier_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
      cover_image_url: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&q=80",
      story: "Over 2,500 villagers in remote arid regions walk more than 8 kilometers every day to collect untreated groundwater. This project constructs a high-capacity solar borewell and multi-stage reverse osmosis filtration facility. All milestone payments require vendor invoices and verified delivery receipts.",
      planned_budget: [
        { category: "Solar Deep Well Drilling & Submersible Pump", amount: 100000 },
        { category: "Reverse Osmosis Commercial Filtration Unit", amount: 60000 },
        { category: "Community Distribution Pipelining", amount: 40000 }
      ],
      funding_deadline: new Date(Date.now() + 86400000 * 45).toISOString()
    },
    {
      on_chain_id: 3,
      title: "Rural Solar Microgrid & Health Clinic Power",
      tagline: "Continuous electricity for primary health centers and cold-chain vaccine storage",
      category: "Energy",
      location: "Odisha, India",
      creator_address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720".toLowerCase(),
      verifier_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
      cover_image_url: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80",
      story: "Frequent grid power failures in remote healthcare facilities compromise sensitive medicines and infant vaccines. This project provides a dedicated 15kW rooftop solar microgrid with lithium-iron-phosphate battery backup to ensure uninterrupted power for vaccine refrigerators and diagnostic equipment.",
      planned_budget: [
        { category: "High-Efficiency Monocrystalline Solar Panels", amount: 60000 },
        { category: "LiFePO4 Cold-Chain Battery Bank", amount: 30000 },
        { category: "Surge Protection & Installation", amount: 10000 }
      ],
      funding_deadline: new Date(Date.now() + 86400000 * 60).toISOString()
    }
  ];

  for (const c of campaigns) {
    const canonical_hash = computeHash(c);
    await client.query(`
      INSERT INTO public.campaigns (
        on_chain_id, title, tagline, category, location, creator_address, verifier_address, 
        cover_image_url, story, planned_budget, funding_deadline, canonical_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (on_chain_id) DO UPDATE SET
        title = EXCLUDED.title,
        tagline = EXCLUDED.tagline,
        category = EXCLUDED.category,
        location = EXCLUDED.location,
        creator_address = EXCLUDED.creator_address,
        verifier_address = EXCLUDED.verifier_address,
        cover_image_url = EXCLUDED.cover_image_url,
        story = EXCLUDED.story,
        planned_budget = EXCLUDED.planned_budget,
        funding_deadline = EXCLUDED.funding_deadline,
        canonical_hash = EXCLUDED.canonical_hash,
        updated_at = NOW()
    `, [
      c.on_chain_id, c.title, c.tagline, c.category, c.location, c.creator_address, c.verifier_address,
      c.cover_image_url, c.story, JSON.stringify(c.planned_budget), c.funding_deadline, canonical_hash
    ]);
    console.log(`✔ Seeded campaign #${c.on_chain_id}: "${c.title}"`);
  }

  // Step 4: Seed Audit Events
  console.log("\n--- SEEDING AUDIT EVENTS ---");
  const auditEvents = [
    {
      event_name: "CampaignCreated",
      campaign_id: 1,
      quotation_id: null,
      actor_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(),
      amount_ftu: 3.0,
      tx_hash: "0xa1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1",
      block_number: 101,
      event_data: { goal: "3.0 ETH", deadline: "30 days", category: "Education" },
      recorded_at: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      event_name: "CampaignVerified",
      campaign_id: 1,
      quotation_id: null,
      actor_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
      amount_ftu: null,
      tx_hash: "0xb2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef12",
      block_number: 105,
      event_data: { verifier: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", status: "VERIFIED" },
      recorded_at: new Date(Date.now() - 86400000 * 4.8).toISOString()
    },
    {
      event_name: "Donated",
      campaign_id: 1,
      quotation_id: null,
      actor_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
      amount_ftu: 1.5,
      tx_hash: "0xc3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef123",
      block_number: 110,
      event_data: { donor: "Alice", amount: "1.5 ETH", totalDonated: "1.5 ETH", votingWeight: "46.9%" },
      recorded_at: new Date(Date.now() - 86400000 * 4.5).toISOString()
    },
    {
      event_name: "Donated",
      campaign_id: 1,
      quotation_id: null,
      actor_address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65".toLowerCase(),
      amount_ftu: 1.0,
      tx_hash: "0xd4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1234",
      block_number: 115,
      event_data: { donor: "Bob", amount: "1.0 ETH", totalDonated: "2.5 ETH", votingWeight: "31.3%" },
      recorded_at: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    {
      event_name: "FundingClosed",
      campaign_id: 1,
      quotation_id: null,
      actor_address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc".toLowerCase(),
      amount_ftu: 3.2,
      tx_hash: "0xe5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef12345",
      block_number: 120,
      event_data: { totalRaised: "3.2 ETH", goal: "3.0 ETH", progressPct: "107%" },
      recorded_at: new Date(Date.now() - 86400000 * 3.5).toISOString()
    },
    {
      event_name: "CampaignCreated",
      campaign_id: 2,
      quotation_id: null,
      actor_address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f".toLowerCase(),
      amount_ftu: 2.0,
      tx_hash: "0xf60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef123456",
      block_number: 125,
      event_data: { goal: "2.0 ETH", title: "Clean Drinking Water Well Initiative" },
      recorded_at: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      event_name: "CampaignVerified",
      campaign_id: 2,
      quotation_id: null,
      actor_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
      amount_ftu: null,
      tx_hash: "0x0718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1234567",
      block_number: 128,
      event_data: { verifier: "Global Impact Auditor", status: "VERIFIED" },
      recorded_at: new Date(Date.now() - 86400000 * 2.8).toISOString()
    },
    {
      event_name: "Donated",
      campaign_id: 2,
      quotation_id: null,
      actor_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
      amount_ftu: 2.0,
      tx_hash: "0x18293a4b5c6d7e8f90123456789abcdef0123456789abcdef12345678",
      block_number: 132,
      event_data: { donor: "Alice", amount: "2.0 ETH", totalDonated: "2.0 ETH", votingWeight: "100%" },
      recorded_at: new Date(Date.now() - 86400000 * 2.5).toISOString()
    },
    {
      event_name: "QuotationRegistered",
      campaign_id: 2,
      quotation_id: 1,
      actor_address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f".toLowerCase(),
      amount_ftu: 0.5,
      tx_hash: "0x293a4b5c6d7e8f90123456789abcdef0123456789abcdef123456789",
      block_number: 140,
      event_data: { purpose: "Solar Deep Well Drilling Equipment", vendor: "AquaTech Borewells" },
      recorded_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      event_name: "AutomationToggled",
      campaign_id: 2,
      quotation_id: null,
      actor_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
      amount_ftu: null,
      tx_hash: "0x3a4b5c6d7e8f90123456789abcdef0123456789abcdef123456789a",
      block_number: 145,
      event_data: { enabled: true, donor: "Alice", policy: "AI Auto-Sanction Active" },
      recorded_at: new Date(Date.now() - 86400000 * 1.5).toISOString()
    },
    {
      event_name: "CampaignCreated",
      campaign_id: 3,
      quotation_id: null,
      actor_address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720".toLowerCase(),
      amount_ftu: 1.0,
      tx_hash: "0x4b5c6d7e8f90123456789abcdef0123456789abcdef123456789ab",
      block_number: 150,
      event_data: { goal: "1.0 ETH", title: "Rural Solar Microgrid & Health Clinic Power" },
      recorded_at: new Date(Date.now() - 86400000 * 1).toISOString()
    },
    {
      event_name: "CampaignVerified",
      campaign_id: 3,
      quotation_id: null,
      actor_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
      amount_ftu: null,
      tx_hash: "0x5c6d7e8f90123456789abcdef0123456789abcdef123456789abc",
      block_number: 152,
      event_data: { verifier: "Global Impact Auditor", status: "VERIFIED" },
      recorded_at: new Date(Date.now() - 86400000 * 0.8).toISOString()
    },
    {
      event_name: "Donated",
      campaign_id: 3,
      quotation_id: null,
      actor_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
      amount_ftu: 1.0,
      tx_hash: "0x6d7e8f90123456789abcdef0123456789abcdef123456789abcd",
      block_number: 155,
      event_data: { donor: "Alice", amount: "1.0 ETH", totalDonated: "1.0 ETH", votingWeight: "100%" },
      recorded_at: new Date(Date.now() - 86400000 * 0.5).toISOString()
    }
  ];

  for (const ev of auditEvents) {
    await client.query(`
      INSERT INTO public.audit_events (
        event_name, campaign_id, quotation_id, actor_address, amount_ftu, tx_hash, block_number, event_data, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      ev.event_name, ev.campaign_id, ev.quotation_id, ev.actor_address, ev.amount_ftu,
      ev.tx_hash, ev.block_number, JSON.stringify(ev.event_data), ev.recorded_at
    ]);
  }
  console.log(`✔ Seeded ${auditEvents.length} audit events!`);

  // Step 5: Seed Quotation for Campaign #2
  console.log("\n--- SEEDING QUOTATION FOR CAMPAIGN #2 ---");
  const quotationPayload = {
    campaign_id: 2,
    creator_address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f".toLowerCase(),
    purpose: "Solar Deep Aquifer Borewell Drilling & Submersible Pump Installation",
    vendor_name: "AquaTech Borewells Ltd",
    vendor_contact: "contact@aquatech-borewells.in",
    requested_amount_ftu: 0.5,
    items: [
      { description: "Deep borehole aquifer drilling (300 ft)", amount: 0.3 },
      { description: "Solar-powered submersible pump assembly", amount: 0.2 }
    ],
    quotation_document_url: "https://example.com/invoices/borewell-invoice-01.pdf",
    quotation_hash: "0x7777777777777777777777777777777777777777777777777777777777777777",
    on_chain_quotation_id: 1,
    state: "AIEvaluated",
    ai_recommendation: {
      recommendation: "APPROVE",
      confidence: 0.94,
      riskLevel: "Low",
      creatorReliabilityScore: "High (Score: 92/100)",
      campaignRelevance: "Essential infrastructure for clean water extraction",
      priceAssessment: "Standard market price for deep borehole drilling",
      budgetImpact: "Within planned budget (allocated 0.5 ETH of 2.0 ETH)",
      reasons: [
        "Vendor credentials verified with registration certificate",
        "Cost per foot is consistent with regional standards",
        "Matches milestone deliverable #1"
      ]
    },
    ai_recommendation_hash: "0x8888888888888888888888888888888888888888888888888888888888888888"
  };

  await client.query(`
    INSERT INTO public.quotations (
      campaign_id, creator_address, purpose, vendor_name, vendor_contact,
      requested_amount_ftu, items, quotation_document_url, quotation_hash,
      on_chain_quotation_id, state, ai_recommendation, ai_recommendation_hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [
    quotationPayload.campaign_id, quotationPayload.creator_address, quotationPayload.purpose,
    quotationPayload.vendor_name, quotationPayload.vendor_contact, quotationPayload.requested_amount_ftu,
    JSON.stringify(quotationPayload.items), quotationPayload.quotation_document_url,
    quotationPayload.quotation_hash, quotationPayload.on_chain_quotation_id, quotationPayload.state,
    JSON.stringify(quotationPayload.ai_recommendation), quotationPayload.ai_recommendation_hash
  ]);
  console.log("✔ Seeded quotation for Campaign #2!");

  // Step 6: Verify row counts
  console.log("\n--- VERIFYING FINAL SUPABASE ROW COUNTS ---");
  const tables = ['users', 'campaigns', 'audit_events', 'quotations'];
  for (const t of tables) {
    const res = await client.query(`SELECT COUNT(*) FROM public."${t}"`);
    console.log(`public.${t}: ${res.rows[0].count} rows`);
  }

  await client.end();
  console.log("\n✅ Supabase seeded successfully with users, campaigns, audit events, and quotations!");
}

main().catch(console.error);
