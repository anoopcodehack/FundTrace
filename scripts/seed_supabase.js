const { Client } = require('pg');
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

  // Step 2: Wipe all seeded campaign, sanction, and audit data
  console.log("\n--- PURGING EXISTING CAMPAIGN & SANCTION DATA ---");
  await client.query(`DELETE FROM public.quotations WHERE id != 0;`);
  await client.query(`DELETE FROM public.audit_events WHERE id != 0;`);
  await client.query(`DELETE FROM public.spending_requests WHERE id != 0;`);
  await client.query(`DELETE FROM public.proof_documents WHERE id != 0;`);
  await client.query(`DELETE FROM public.campaign_updates WHERE id != 0;`);
  await client.query(`DELETE FROM public.automation_settings WHERE id != 0;`);
  await client.query(`DELETE FROM public.score_history WHERE id != 0;`);
  await client.query(`DELETE FROM public.creator_scores WHERE id != 0;`);
  await client.query(`DELETE FROM public.campaigns WHERE id != 0;`);
  console.log("✔ Purged all old campaigns, quotations, and audit events.");

  // Step 3: Seed Users
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
    console.log(`✔ Seeded user: ${u.name} (${u.role})`);
  }

  // Step 4: Seed Campaigns in NEW FTU FORMAT
  console.log("\n--- SEEDING CAMPAIGNS IN NEW FTU FORMAT ---");
  const campaigns = [
    {
      id: 1,
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
        { category: "Microcontrollers & Robotics Starter Kits", amount: 120000, amountFtu: 120000 },
        { category: "Sensors, Breadboards & Circuitry", amount: 100000, amountFtu: 100000 },
        { category: "Curriculum Manuals & Teacher Workshops", amount: 80000, amountFtu: 80000 }
      ],
      funding_deadline: new Date(Date.now() + 86400000 * 30).toISOString()
    },
    {
      id: 2,
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
        { category: "Solar Deep Well Drilling & Submersible Pump", amount: 100000, amountFtu: 100000 },
        { category: "Reverse Osmosis Commercial Filtration Unit", amount: 60000, amountFtu: 60000 },
        { category: "Community Distribution Pipelining", amount: 40000, amountFtu: 40000 }
      ],
      funding_deadline: new Date(Date.now() + 86400000 * 45).toISOString()
    },
    {
      id: 3,
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
        { category: "High-Efficiency Monocrystalline Solar Panels", amount: 60000, amountFtu: 60000 },
        { category: "LiFePO4 Cold-Chain Battery Bank", amount: 30000, amountFtu: 30000 },
        { category: "Surge Protection & Installation Hardware", amount: 10000, amountFtu: 10000 }
      ],
      funding_deadline: new Date(Date.now() + 86400000 * 60).toISOString()
    }
  ];

  for (const c of campaigns) {
    const canonical_hash = computeHash(c);
    await client.query(`
      INSERT INTO public.campaigns (
        id, on_chain_id, title, tagline, category, location, creator_address, verifier_address, 
        cover_image_url, story, planned_budget, funding_deadline, canonical_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        on_chain_id = EXCLUDED.on_chain_id,
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
      c.id, c.on_chain_id, c.title, c.tagline, c.category, c.location, c.creator_address, c.verifier_address,
      c.cover_image_url, c.story, JSON.stringify(c.planned_budget), c.funding_deadline, canonical_hash
    ]);
    console.log(`✔ Seeded campaign #${c.id}: "${c.title}"`);
  }

  // Step 5: Seed Audit Events in NEW FTU FORMAT
  console.log("\n--- SEEDING AUDIT EVENTS IN NEW FTU FORMAT ---");
  const auditEvents = [
    // Campaign 1 Events
    {
      event_name: "CampaignCreated",
      campaign_id: 1,
      quotation_id: null,
      actor_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(),
      amount_ftu: 300000,
      tx_hash: "0xa1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1",
      block_number: 101,
      event_data: { goal: "₹3.0L (300,000 FTU)", deadline: "30 days", category: "Education" },
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
      amount_ftu: 150000,
      tx_hash: "0xc3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef123",
      block_number: 110,
      event_data: { donor: "Alice", amount: "₹1.5L (150,000 FTU)", totalDonated: "₹1.5L", votingWeight: "46.9%" },
      recorded_at: new Date(Date.now() - 86400000 * 4.5).toISOString()
    },
    {
      event_name: "Donated",
      campaign_id: 1,
      quotation_id: null,
      actor_address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65".toLowerCase(),
      amount_ftu: 100000,
      tx_hash: "0xd4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1234",
      block_number: 115,
      event_data: { donor: "Bob", amount: "₹1.0L (100,000 FTU)", totalDonated: "₹2.5L", votingWeight: "31.3%" },
      recorded_at: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    {
      event_name: "Donated",
      campaign_id: 1,
      quotation_id: null,
      actor_address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc".toLowerCase(),
      amount_ftu: 70000,
      tx_hash: "0xd4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1235",
      block_number: 118,
      event_data: { donor: "Charlie", amount: "₹70.0K (70,000 FTU)", totalDonated: "₹3.2L", votingWeight: "21.9%" },
      recorded_at: new Date(Date.now() - 86400000 * 3.8).toISOString()
    },
    {
      event_name: "FundingClosed",
      campaign_id: 1,
      quotation_id: null,
      actor_address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc".toLowerCase(),
      amount_ftu: 320000,
      tx_hash: "0xe5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef12345",
      block_number: 120,
      event_data: { totalRaised: "₹3.2L (320,000 FTU)", goal: "₹3.0L (300,000 FTU)", progressPct: "107%" },
      recorded_at: new Date(Date.now() - 86400000 * 3.5).toISOString()
    },
    // Campaign 2 Events
    {
      event_name: "CampaignCreated",
      campaign_id: 2,
      quotation_id: null,
      actor_address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f".toLowerCase(),
      amount_ftu: 200000,
      tx_hash: "0xf60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef123456",
      block_number: 125,
      event_data: { goal: "₹2.0L (200,000 FTU)", title: "Clean Drinking Water Well Initiative" },
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
      amount_ftu: 200000,
      tx_hash: "0x18293a4b5c6d7e8f90123456789abcdef0123456789abcdef12345678",
      block_number: 132,
      event_data: { donor: "Alice", amount: "₹2.0L (200,000 FTU)", totalDonated: "₹2.0L", votingWeight: "100%" },
      recorded_at: new Date(Date.now() - 86400000 * 2.5).toISOString()
    },
    {
      event_name: "FundingClosed",
      campaign_id: 2,
      quotation_id: null,
      actor_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
      amount_ftu: 200000,
      tx_hash: "0x28293a4b5c6d7e8f90123456789abcdef0123456789abcdef12345679",
      block_number: 135,
      event_data: { totalRaised: "₹2.0L (200,000 FTU)", goal: "₹2.0L (200,000 FTU)", progressPct: "100%" },
      recorded_at: new Date(Date.now() - 86400000 * 2.2).toISOString()
    },
    // Campaign 3 Events
    {
      event_name: "CampaignCreated",
      campaign_id: 3,
      quotation_id: null,
      actor_address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720".toLowerCase(),
      amount_ftu: 100000,
      tx_hash: "0x4b5c6d7e8f90123456789abcdef0123456789abcdef123456789ab",
      block_number: 150,
      event_data: { goal: "₹1.0L (100,000 FTU)", title: "Rural Solar Microgrid & Health Clinic Power" },
      recorded_at: new Date(Date.now() - 86400000 * 1.5).toISOString()
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
      recorded_at: new Date(Date.now() - 86400000 * 1.2).toISOString()
    },
    {
      event_name: "Donated",
      campaign_id: 3,
      quotation_id: null,
      actor_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
      amount_ftu: 100000,
      tx_hash: "0x6d7e8f90123456789abcdef0123456789abcdef123456789abcd",
      block_number: 155,
      event_data: { donor: "Alice", amount: "₹1.0L (100,000 FTU)", totalDonated: "₹1.0L", votingWeight: "100%" },
      recorded_at: new Date(Date.now() - 86400000 * 0.9).toISOString()
    },
    {
      event_name: "FundingClosed",
      campaign_id: 3,
      quotation_id: null,
      actor_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
      amount_ftu: 100000,
      tx_hash: "0x7d7e8f90123456789abcdef0123456789abcdef123456789abce",
      block_number: 158,
      event_data: { totalRaised: "₹1.0L (100,000 FTU)", goal: "₹1.0L (100,000 FTU)", progressPct: "100%" },
      recorded_at: new Date(Date.now() - 86400000 * 0.8).toISOString()
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
  console.log(`✔ Seeded ${auditEvents.length} audit events in new FTU format.`);

  // Step 6: Seed Quotations / Milestones in NEW FTU FORMAT
  console.log("\n--- SEEDING MILESTONE QUOTATIONS IN NEW FTU FORMAT ---");
  const quotations = [
    // Milestone Quotation for Campaign 1
    {
      campaign_id: 1,
      creator_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(),
      purpose: "Microcontrollers & Robotics Hardware Starter Kits (Batch #1)",
      vendor_name: "RoboLabs EdTech Solutions Ltd",
      vendor_contact: "sales@robolabs-edtech.in",
      requested_amount_ftu: 120000,
      items: [
        { description: "Arduino Mega & Uno Compatible Robotics Kits (x50 units)", quantity: 50, unitPriceFtu: 1800, totalFtu: 90000 },
        { description: "Ultrasonic & Infrared Obstacle Sensor Packs (x50 sets)", quantity: 50, unitPriceFtu: 600, totalFtu: 30000 }
      ],
      quotation_document_url: "https://example.com/invoices/robolabs-stem-quote-01.pdf",
      quotation_hash: "0x4444444444444444444444444444444444444444444444444444444444444444",
      on_chain_quotation_id: 1,
      state: "AIEvaluated",
      ai_recommendation: {
        recommendation: "APPROVE",
        confidence: 0.96,
        riskLevel: "LOW",
        requestedAmount: 120000,
        suggestedSanctionAmount: 120000,
        creatorReliabilityScore: "High (Score: 95/100)",
        campaignRelevance: "Critical foundational kits for establishing 10 rural school STEM labs",
        priceAssessment: "Bulk institutional pricing verified (12% lower than open market MSRP)",
        budgetImpact: "Fits within allocated hardware category (₹1.2L of ₹3.0L total budget)",
        proofHistory: "Consistent verified proof submission track record across previous initiatives",
        reasons: [
          "GST tax registration and authorized ed-tech vendor certificate validated",
          "Hardware specifications fully align with state STEM lab curricula",
          "Directly satisfies Milestone #1 deliverable roadmap"
        ],
        riskFlags: [],
        evaluatedAt: new Date().toISOString()
      },
      ai_recommendation_hash: "0x5555555555555555555555555555555555555555555555555555555555555555"
    },
    // Milestone Quotation for Campaign 2
    {
      campaign_id: 2,
      creator_address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f".toLowerCase(),
      purpose: "Solar Deep Aquifer Borewell Drilling & Submersible Pump Installation",
      vendor_name: "AquaTech Borewells Ltd",
      vendor_contact: "operations@aquatech-borewells.in",
      requested_amount_ftu: 100000,
      items: [
        { description: "Deep aquifer borehole drilling (300 feet depth)", quantity: 300, unitPriceFtu: 200, totalFtu: 60000 },
        { description: "Heavy-duty solar submersible pump assembly & inverter", quantity: 1, unitPriceFtu: 40000, totalFtu: 40000 }
      ],
      quotation_document_url: "https://example.com/invoices/aquatech-borewell-01.pdf",
      quotation_hash: "0x6666666666666666666666666666666666666666666666666666666666666666",
      on_chain_quotation_id: 1,
      state: "AIEvaluated",
      ai_recommendation: {
        recommendation: "APPROVE",
        confidence: 0.94,
        riskLevel: "LOW",
        requestedAmount: 100000,
        suggestedSanctionAmount: 100000,
        creatorReliabilityScore: "High (Score: 92/100)",
        campaignRelevance: "Primary capital equipment needed for clean groundwater extraction",
        priceAssessment: "Cost per foot consistent with regional groundwater authority standards",
        budgetImpact: "Within planned budget (allocated ₹1.0L of ₹2.0L)",
        proofHistory: "Verified civil contractor registration on file",
        reasons: [
          "AquaTech credentials verified with regional civil infrastructure board",
          "Geological survey report matches 300ft aquifer depth specification",
          "Submersible pump includes 3-year manufacturer warranty"
        ],
        riskFlags: [],
        evaluatedAt: new Date().toISOString()
      },
      ai_recommendation_hash: "0x7777777777777777777777777777777777777777777777777777777777777777"
    },
    // Milestone Quotation for Campaign 3
    {
      campaign_id: 3,
      creator_address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720".toLowerCase(),
      purpose: "15kW Monocrystalline Solar Panel Array & Mounting Racks",
      vendor_name: "SunPower Solutions Pvt Ltd",
      vendor_contact: "orders@sunpowersolutions.in",
      requested_amount_ftu: 60000,
      items: [
        { description: "Tier-1 550W Monocrystalline Solar Panels (x30 units)", quantity: 30, unitPriceFtu: 1600, totalFtu: 48000 },
        { description: "Galvanized rooftop mounting racks & IP67 junction connectors", quantity: 1, unitPriceFtu: 12000, totalFtu: 12000 }
      ],
      quotation_document_url: "https://example.com/invoices/sunpower-panels-01.pdf",
      quotation_hash: "0x8888888888888888888888888888888888888888888888888888888888888888",
      on_chain_quotation_id: 1,
      state: "AIEvaluated",
      ai_recommendation: {
        recommendation: "APPROVE",
        confidence: 0.95,
        riskLevel: "LOW",
        requestedAmount: 60000,
        suggestedSanctionAmount: 60000,
        creatorReliabilityScore: "High (Score: 90/100)",
        campaignRelevance: "Primary solar harvesting arrays for continuous health clinic operation",
        priceAssessment: "Direct distributor pricing verified against solar wholesale market",
        budgetImpact: "Exactly matches ₹60,000 panel budget allocation",
        proofHistory: "Experienced solar installer with verified community track record",
        reasons: [
          "Tier-1 manufacturer warranty of 25 years on photovoltaic output",
          "Direct factory distribution pricing confirmed",
          "All junction connectors meet IP67 weather resistance rating"
        ],
        riskFlags: [],
        evaluatedAt: new Date().toISOString()
      },
      ai_recommendation_hash: "0x9999999999999999999999999999999999999999999999999999999999999999"
    }
  ];

  for (const q of quotations) {
    await client.query(`
      INSERT INTO public.quotations (
        campaign_id, creator_address, purpose, vendor_name, vendor_contact,
        requested_amount_ftu, items, quotation_document_url, quotation_hash,
        on_chain_quotation_id, state, ai_recommendation, ai_recommendation_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      q.campaign_id, q.creator_address, q.purpose,
      q.vendor_name, q.vendor_contact, q.requested_amount_ftu,
      JSON.stringify(q.items), q.quotation_document_url,
      q.quotation_hash, q.on_chain_quotation_id, q.state,
      JSON.stringify(q.ai_recommendation), q.ai_recommendation_hash
    ]);
    console.log(`✔ Seeded quotation for Campaign #${q.campaign_id}: "${q.purpose}" (${q.requested_amount_ftu} FTU)`);
  }

  // Step 7: Verify final row counts
  console.log("\n--- VERIFYING FINAL SUPABASE ROW COUNTS ---");
  const tables = ['users', 'campaigns', 'audit_events', 'quotations'];
  for (const t of tables) {
    const res = await client.query(`SELECT COUNT(*) FROM public."${t}"`);
    console.log(`public.${t}: ${res.rows[0].count} rows`);
  }

  await client.end();
  console.log("\n✅ Supabase re-seeded successfully in clean NEW FTU format!");
}

main().catch(console.error);
