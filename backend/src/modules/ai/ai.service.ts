import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

export interface AIEvaluationInput {
  quotationAmount: number;         // FTU
  campaignObjective: string;
  campaignBalance: number;         // FTU remaining
  requestedAllocation: number;     // FTU
  previousRequestsCount: number;
  creatorReliabilityScore: number; // 0–100
  previousProofBehavior: {
    onTimeProofs: number;
    lateProofs: number;
    missingProofs: number;
    unresolvedRequests: number;
  };
  quotationPurpose: string;
  vendorName: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  historicalApprovedVsClaimed: { approved: number; claimed: number };
}

export interface AIRecommendation {
  recommendation: 'APPROVE' | 'REJECT' | 'REVIEW';
  confidence: number; // 0 to 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  requestedAmount: number;
  suggestedSanctionAmount: number;
  campaignRelevance: string;
  budgetImpact: string;
  priceAssessment: string;
  creatorReliabilityScore: string;
  proofHistory: string;
  reasons: string[];
  riskFlags: string[];
  evaluatedAt: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string | undefined;
  private readonly model = 'gemini-2.0-flash';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not set — AI evaluator will use deterministic fallback mode');
    }
  }

  /**
   * Evaluates a quotation and returns an AI recommendation.
   * Uses Gemini API if key is available; falls back to deterministic scoring.
   */
  async evaluateQuotation(input: AIEvaluationInput): Promise<AIRecommendation> {
    const evaluatedAt = new Date().toISOString();

    if (this.apiKey) {
      try {
        return await this.evaluateWithGemini(input, evaluatedAt);
      } catch (err: any) {
        this.logger.error(`Gemini API call failed, falling back to deterministic: ${err.message}`);
      }
    }

    return this.deterministicEvaluation(input, evaluatedAt);
  }

  private async evaluateWithGemini(input: AIEvaluationInput, evaluatedAt: string): Promise<AIRecommendation> {
    const prompt = this.buildPrompt(input);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(text);

    return {
      recommendation: parsed.recommendation || 'REVIEW',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
      riskLevel: parsed.riskLevel || 'MEDIUM',
      requestedAmount: input.requestedAllocation,
      suggestedSanctionAmount: parsed.suggestedSanctionAmount ?? input.requestedAllocation,
      campaignRelevance: parsed.campaignRelevance || 'Not specified',
      budgetImpact: parsed.budgetImpact || 'Not specified',
      priceAssessment: parsed.priceAssessment || 'Not specified',
      creatorReliabilityScore: parsed.creatorReliabilityScore || `${input.creatorReliabilityScore}/100`,
      proofHistory: parsed.proofHistory || 'Not specified',
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags : [],
      evaluatedAt,
    };
  }

  private buildPrompt(input: AIEvaluationInput): string {
    return `You are a financial auditor AI for FundTrace, a transparent crowdfunding platform.
Evaluate the following quotation and provide a structured JSON recommendation.

CAMPAIGN CONTEXT:
- Objective: ${input.campaignObjective}
- Remaining Balance: ${input.campaignBalance} FTU
- Creator Reliability Score: ${input.creatorReliabilityScore}/100

QUOTATION DETAILS:
- Purpose: ${input.quotationPurpose}
- Vendor: ${input.vendorName}
- Requested Amount: ${input.requestedAllocation} FTU
- Items: ${JSON.stringify(input.items)}

CREATOR HISTORY:
- Total Previous Requests: ${input.previousRequestsCount}
- On-time Proofs: ${input.previousProofBehavior.onTimeProofs}
- Late Proofs: ${input.previousProofBehavior.lateProofs}
- Missing Proofs: ${input.previousProofBehavior.missingProofs}
- Unresolved Requests: ${input.previousProofBehavior.unresolvedRequests}
- Historical Approved vs Claimed: ${input.historicalApprovedVsClaimed.approved} approved, ${input.historicalApprovedVsClaimed.claimed} claimed

Respond with ONLY valid JSON matching this exact schema:
{
  "recommendation": "APPROVE" | "REVIEW" | "REJECT",
  "confidence": number from 0 to 100,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "requestedAmount": number,
  "suggestedSanctionAmount": number,
  "campaignRelevance": "string describing if it matches objective",
  "budgetImpact": "string describing impact on remaining balance",
  "priceAssessment": "string assessing prices",
  "creatorReliabilityScore": "string summarizing score",
  "proofHistory": "string summarizing proof behavior",
  "reasons": ["list of key reasons"],
  "riskFlags": ["list of risk flags or concerns if any"]
}`;
  }

  /**
   * Deterministic scoring when no API key is available.
   * Transparent, explainable rules — no black box.
   */
  private deterministicEvaluation(input: AIEvaluationInput, evaluatedAt: string): AIRecommendation {
    let score = 100;
    const flags: string[] = [];

    // Rule 1: Amount vs balance check
    const allocationRatio = input.requestedAllocation / Math.max(1, input.campaignBalance);
    if (allocationRatio > 0.8) {
      score -= 25;
      flags.push('Requested amount exceeds 80% of remaining campaign balance');
    } else if (allocationRatio > 0.5) {
      score -= 10;
      flags.push('Requested amount is more than 50% of remaining balance');
    }

    // Rule 2: Creator reliability score
    if (input.creatorReliabilityScore < 50) {
      score -= 30;
      flags.push(`Low creator reliability score: ${input.creatorReliabilityScore}/100`);
    } else if (input.creatorReliabilityScore < 70) {
      score -= 10;
      flags.push(`Below-average reliability score: ${input.creatorReliabilityScore}/100`);
    }

    // Rule 3: Missing/late proofs
    if (input.previousProofBehavior.missingProofs > 0) {
      score -= 20;
      flags.push(`${input.previousProofBehavior.missingProofs} missing proof(s) in history`);
    }
    if (input.previousProofBehavior.lateProofs > 1) {
      score -= 10;
      flags.push(`${input.previousProofBehavior.lateProofs} late proof submissions`);
    }

    // Rule 4: Unresolved requests
    if (input.previousProofBehavior.unresolvedRequests > 0) {
      score -= 15;
      flags.push(`${input.previousProofBehavior.unresolvedRequests} unresolved request(s) still pending`);
    }

    // Rule 5: Budget consistency (approved vs claimed variance)
    const { approved, claimed } = input.historicalApprovedVsClaimed;
    if (approved > 0) {
      const variance = Math.abs(approved - claimed) / approved;
      if (variance > 0.2) {
        score -= 10;
        flags.push(`High budget variance: ${(variance * 100).toFixed(0)}% difference between approved and claimed`);
      }
    }

    // Determine recommendation
    let recommendation: 'APPROVE' | 'REJECT' | 'REVIEW';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    let confidence: number;

    if (score >= 75) {
      recommendation = 'APPROVE';
      riskLevel = 'LOW';
      confidence = score;
    } else if (score >= 50) {
      recommendation = 'REVIEW';
      riskLevel = 'MEDIUM';
      confidence = score;
    } else {
      recommendation = 'REJECT';
      riskLevel = 'HIGH';
      confidence = score;
    }

    const reasons = flags.length === 0
      ? [`Quotation appears legitimate.`, `Amount (${input.requestedAllocation} FTU) is within acceptable range.`]
      : [`Evaluation found ${flags.length} concern(s).`, `Review required before sanctioning.`];

    return {
      recommendation,
      confidence,
      riskLevel,
      requestedAmount: input.requestedAllocation,
      suggestedSanctionAmount: recommendation === 'APPROVE' ? input.requestedAllocation : 0,
      campaignRelevance: 'Automated deterministic evaluation does not analyze context.',
      budgetImpact: `Requested ${input.requestedAllocation} FTU out of ${input.campaignBalance} FTU remaining.`,
      priceAssessment: 'Automated deterministic evaluation does not analyze line item pricing.',
      creatorReliabilityScore: `Score: ${input.creatorReliabilityScore}/100.`,
      proofHistory: `On-time: ${input.previousProofBehavior.onTimeProofs}, Late: ${input.previousProofBehavior.lateProofs}, Missing: ${input.previousProofBehavior.missingProofs}.`,
      reasons,
      riskFlags: flags,
      evaluatedAt,
    };
  }

  /**
   * Compute a deterministic creator reliability score (0-100).
   * Called by ScoresService after each proof/claim event.
   */
  computeCreatorScore(profile: {
    totalQuotations: number;
    approvedQuotations: number;
    onTimeProofs: number;
    lateProofs: number;
    missingProofs: number;
    unresolvedRequests: number;
    completedCampaigns: number;
    historicalVariancePct: number;
  }): { score: number; breakdown: Record<string, number> } {
    const baseScore = 70;

    // Proof completion bonus (max 15 pts)
    const totalExpected = profile.onTimeProofs + profile.lateProofs + profile.missingProofs;
    const proofCompletionPct = totalExpected > 0
      ? (profile.onTimeProofs + profile.lateProofs) / totalExpected
      : 1;
    const proofCompletionBonus = Math.round(proofCompletionPct * 15);

    // On-time proof bonus (max 10 pts)
    const totalSubmitted = profile.onTimeProofs + profile.lateProofs;
    const onTimePct = totalSubmitted > 0 ? profile.onTimeProofs / totalSubmitted : 1;
    const onTimeBonus = Math.round(onTimePct * 10);

    // Penalties
    const missingPenalty = Math.min(25, profile.missingProofs * 8);
    const latePenalty = Math.min(10, profile.lateProofs * 2);
    const unresolvedPenalty = Math.min(20, profile.unresolvedRequests * 10);
    const variancePenalty = Math.min(10, Math.round(profile.historicalVariancePct * 10));

    const rawScore = baseScore + proofCompletionBonus + onTimeBonus
      - missingPenalty - latePenalty - unresolvedPenalty - variancePenalty;

    const score = Math.min(100, Math.max(0, rawScore));

    return {
      score,
      breakdown: {
        baseScore,
        proofCompletionBonus,
        onTimeBonus,
        missingPenalty: -missingPenalty,
        latePenalty: -latePenalty,
        unresolvedPenalty: -unresolvedPenalty,
        variancePenalty: -variancePenalty,
        finalScore: score,
      },
    };
  }

  /** Hash an AI recommendation JSON for on-chain commitment */
  hashRecommendation(recommendation: AIRecommendation): string {
    const canonical = JSON.stringify({
      recommendation: recommendation.recommendation,
      confidence: recommendation.confidence,
      riskLevel: recommendation.riskLevel,
      reasons: recommendation.reasons.sort(),
      riskFlags: recommendation.riskFlags.sort(),
      evaluatedAt: recommendation.evaluatedAt,
    });
    return '0x' + createHash('sha256').update(canonical).digest('hex');
  }
}
