import { Controller, Get, Post, Delete, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockchainService } from './modules/blockchain/blockchain.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './modules/database/supabase.provider';

@ApiTags('Health & System')
@Controller()
export class AppController {
  constructor(
    private readonly blockchainService: BlockchainService,
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient
  ) {}

  @Get()
  @ApiOperation({ summary: 'Backend service status and connected smart contract overview' })
  getStatus() {
    const deployment = this.blockchainService.getDeploymentInfo();
    return {
      status: 'ok',
      service: 'FundTrace NestJS Backend API',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      network: {
        chainId: deployment?.chainId || 31337,
        contractAddress: deployment?.address || 'Not Deployed',
        blockNumber: deployment?.blockNumber || 0,
      },
      docsUrl: '/api/docs',
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all seeded users and roles from Supabase' })
  async getUsers() {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('wallet_address, name, role, avatar_url, bio, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      return [];
    }
  }

  @Post('admin/database/purge')
  @Delete('admin/database')
  @ApiOperation({ summary: 'Admin action: Purge all campaigns, quotations, and audit events from the database' })
  async purgeDatabase() {
    try {
      // 1. Delete dependent tables
      await this.supabase.from('quotations').delete().neq('id', 0);
      await this.supabase.from('audit_events').delete().neq('id', 0);
      await this.supabase.from('spending_requests').delete().neq('id', 0);
      await this.supabase.from('proof_documents').delete().neq('id', 0);
      await this.supabase.from('campaign_updates').delete().neq('id', 0);
      await this.supabase.from('automation_settings').delete().neq('id', 0);
      await this.supabase.from('score_history').delete().neq('id', 0);
      await this.supabase.from('creator_scores').delete().neq('id', 0);

      // 2. Delete campaigns
      await this.supabase.from('campaigns').delete().neq('id', 0);

      return {
        success: true,
        message: 'Database completely purged. All campaigns, quotations, and audit logs deleted.',
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to purge database'
      };
    }
  }

  @Post('admin/database/reset')
  @ApiOperation({ summary: 'Admin action: Reset database to clean verified seed state' })
  async resetDatabase() {
    try {
      // 1. Purge all child records
      await this.supabase.from('quotations').delete().neq('id', 0);
      await this.supabase.from('audit_events').delete().neq('id', 0);
      await this.supabase.from('spending_requests').delete().neq('id', 0);
      await this.supabase.from('proof_documents').delete().neq('id', 0);
      await this.supabase.from('campaign_updates').delete().neq('id', 0);
      await this.supabase.from('automation_settings').delete().neq('id', 0);
      await this.supabase.from('score_history').delete().neq('id', 0);
      await this.supabase.from('creator_scores').delete().neq('id', 0);

      // 2. Delete any non-seed campaigns
      await this.supabase.from('campaigns').delete().neq('id', 0);

      // 3. Re-seed the 3 standard verified campaigns
      const seedCampaigns = [
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
            { category: "Microcontrollers & Robotics Hardware", amount: 120000 },
            { category: "Sensors, Breadboards & Circuitry", amount: 80000 },
            { category: "Certified Curriculum & Trainer Workshops", amount: 40000 }
          ],
          funding_deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
          canonical_hash: "0x95f79d7043973bc35886f23876604d626ff7cdbe8021746f2f14fdca5d18037d"
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
            { category: "Solar Deep Well Drilling & Submersible Pump", amount: 100000 },
            { category: "Reverse Osmosis Commercial Filtration Unit", amount: 60000 },
            { category: "Community Distribution Pipelining", amount: 40000 }
          ],
          funding_deadline: new Date(Date.now() + 86400000 * 45).toISOString(),
          canonical_hash: "0xa89d2ada5d5119c1e26ab37883ddec93684c0cae31b8372685d57d4b07521de7"
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
            { category: "High-Efficiency Monocrystalline Solar Panels", amount: 60000 },
            { category: "LiFePO4 Cold-Chain Battery Bank", amount: 30000 },
            { category: "Surge Protection & Installation", amount: 10000 }
          ],
          funding_deadline: new Date(Date.now() + 86400000 * 60).toISOString(),
          canonical_hash: "0x97c29268434598a6659cfae1300f6a92c30620587d8a21d03182d4a67f80b058"
        }
      ];

      for (const c of seedCampaigns) {
        await this.supabase.from('campaigns').upsert(c, { onConflict: 'on_chain_id' });
      }

      // 4. Re-seed base audit events for demo continuity
      const baseAuditEvents = [
        {
          event_name: 'Donated',
          campaign_id: 1,
          actor_address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906'.toLowerCase(),
          amount_ftu: 150000,
          event_data: { donor: 'Alice', amount: '1.5 ETH', campaign: 'Build Rural STEM Lab' },
          recorded_at: new Date(Date.now() - 3600000 * 48).toISOString()
        },
        {
          event_name: 'Donated',
          campaign_id: 1,
          actor_address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'.toLowerCase(),
          amount_ftu: 100000,
          event_data: { donor: 'Bob', amount: '1.0 ETH', campaign: 'Build Rural STEM Lab' },
          recorded_at: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          event_name: 'Donated',
          campaign_id: 1,
          actor_address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc'.toLowerCase(),
          amount_ftu: 70000,
          event_data: { donor: 'Charlie', amount: '0.7 ETH', campaign: 'Build Rural STEM Lab' },
          recorded_at: new Date(Date.now() - 3600000 * 12).toISOString()
        }
      ];

      for (const ev of baseAuditEvents) {
        await this.supabase.from('audit_events').insert(ev);
      }

      // 5. Re-seed milestone quotations in new FTU format
      const seedQuotations = [
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
            proofHistory: "Consistent verified proof submission track record",
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

      for (const q of seedQuotations) {
        await this.supabase.from('quotations').insert(q);
      }

      return {
        success: true,
        message: 'Database reset successfully to clean verified baseline (Campaigns 1, 2, 3 and initial contributions and milestone quotations in new FTU format).',
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to reset database'
      };
    }
  }
}
