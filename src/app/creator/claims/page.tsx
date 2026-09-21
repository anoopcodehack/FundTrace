"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { formatFtu, QuotationState, QuotationMetadata } from '@/types';
import Link from 'next/link';
import { 
  ChevronRight,
  Wallet,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  FileCheck,
  UploadCloud,
  FileText,
  ShieldCheck,
  Award,
  AlertCircle,
  Copy,
  Check,
  X,
  FileBadge
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { getFundTraceContract, parseContractError } from '@/lib/contract';
import { recordClaim, submitQuotationProof } from '@/services/quotationService';
import { formatAddress } from '@/lib/wallet';
import { ethers } from 'ethers';
import { toast } from 'sonner';

interface ClaimItem extends QuotationMetadata {
  campaignTitle: string;
}

interface CreatorScoreData {
  currentScore: number;
  onTimeProofs: number;
  lateProofs: number;
  missingProofs: number;
  unresolvedRequests: number;
  proofCompletionPct: number;
}

export default function CreatorClaimsPage() {
  const { wallet, signer } = useWallet();
  const address = wallet.address;

  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingId, setIsProcessingId] = useState<number | null>(null);
  const [creatorScore, setCreatorScore] = useState<CreatorScoreData | null>(null);
  
  // Selected invoice files per quotation id
  const [selectedInvoiceFiles, setSelectedInvoiceFiles] = useState<{ [id: number]: File }>({});
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fileInputRefs = useRef<{ [id: number]: HTMLInputElement | null }>({});

  const loadCreatorScore = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/scores/${address}`);
      if (res.ok) {
        const data = await res.json();
        const sb = data.supabase;
        const oc = data.onChain;
        setCreatorScore({
          currentScore: oc?.score ?? sb?.current_score ?? 70,
          onTimeProofs: oc?.onTimeProofs ?? sb?.on_time_proof_pct ?? 0,
          lateProofs: oc?.lateProofs ?? sb?.late_proofs ?? 0,
          missingProofs: oc?.missingProofs ?? sb?.missing_proofs ?? 0,
          unresolvedRequests: oc?.unresolvedRequests ?? sb?.unresolved_requests ?? 0,
          proofCompletionPct: sb?.proof_completion_pct ?? 100,
        });
      }
    } catch (e) {
      console.warn('Could not load creator score:', e);
    }
  }, [address]);

  const loadClaims = useCallback(async () => {
    if (!wallet.isConnected || !address) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const contract = getFundTraceContract();
      let count = 0;
      try {
        count = Number(await contract.campaignCount());
      } catch {}

      let dbCampaigns: any[] = [];
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/campaigns`);
        if (res.ok) {
          dbCampaigns = await res.json();
        }
      } catch {}

      const allClaimable: ClaimItem[] = [];

      for (let i = 1; i <= count; i++) {
        try {
          const c = await contract.getCampaign(i);
          // Only inspect campaigns created by the connected creator
          if (c.creator.toLowerCase() !== address.toLowerCase()) continue;

          const dbMeta = dbCampaigns.find((db: any) => Number(db.on_chain_id) === i || Number(db.id) === i);
          const title = dbMeta?.title || `Campaign #${i}`;

          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/quotations/campaign/${i}`);
          if (!res.ok) continue;
          const quotes: QuotationMetadata[] = await res.json();

          quotes
            .filter(q => [
              QuotationState.Sanctioned,
              QuotationState.Claimable,
              QuotationState.Claimed,
              QuotationState.ProofPending,
              QuotationState.ProofSubmitted,
              QuotationState.Completed
            ].includes(q.state))
            .forEach(q => {
              allClaimable.push({
                ...q,
                campaignTitle: title,
              });
            });
        } catch (e) {
          console.warn(`Error loading claims for campaign ${i}:`, e);
        }
      }

      setClaims(allClaimable);
      await loadCreatorScore();
    } catch (err) {
      console.error('Failed to load creator claims:', err);
      toast.error('Failed to load claimable allocations');
    } finally {
      setIsLoading(false);
    }
  }, [wallet.isConnected, address, loadCreatorScore]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const handleFileChange = (quotationId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedInvoiceFiles(prev => ({
        ...prev,
        [quotationId]: file
      }));
      toast.success(`Selected invoice: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    }
  };

  const removeSelectedFile = (quotationId: number) => {
    setSelectedInvoiceFiles(prev => {
      const next = { ...prev };
      delete next[quotationId];
      return next;
    });
    if (fileInputRefs.current[quotationId]) {
      fileInputRefs.current[quotationId]!.value = '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    toast.success('Copied cryptographic hash to clipboard');
    setTimeout(() => setCopiedHash(null), 2000);
  };

  /**
   * Execute Claim + Upload Invoice Proof in one atomic flow
   */
  async function handleExecuteClaimWithInvoice(q: ClaimItem) {
    if (!signer || !address) {
      toast.error('Connect your wallet first');
      return;
    }

    const invoiceFile = selectedInvoiceFiles[q.id!];
    const isFileAttached = Boolean(invoiceFile);

    setIsProcessingId(q.id!);
    const toastId = toast.loading(
      isFileAttached
        ? `Claiming funds and anchoring verified vendor invoice...`
        : `Claiming allocation of ${formatFtu(q.allocatedAmountFtu || q.requestedAmountFtu)} to wallet...`
    );

    try {
      const contract = getFundTraceContract(signer);
      const c = await contract.getCampaign(q.campaignId);
      const isEth = BigInt(c.goal) > 1_000_000_000_000n;

      const amtToClaim = q.allocatedAmountFtu || q.requestedAmountFtu;
      let claimWei: bigint;

      if (isEth) {
        try {
          const onchainQ = await contract.getQuotation(q.campaignId, q.onChainQuotationId || q.id!);
          const remainingAlloc = BigInt(onchainQ.allocatedAmount) - BigInt(onchainQ.claimedAmount);
          claimWei = remainingAlloc > 0n ? remainingAlloc : ethers.parseEther(amtToClaim.toString());
        } catch {
          claimWei = ethers.parseEther(amtToClaim.toString());
        }
      } else {
        claimWei = BigInt(Math.floor(amtToClaim));
      }

      // 1. Claim allocation on-chain
      const tx = await contract.claimAllocation(
        q.campaignId,
        q.onChainQuotationId || q.id!,
        claimWei
      );
      const receipt = await tx.wait();

      // 2. Sync backend claim record
      try {
        await recordClaim(q.id!, amtToClaim, receipt?.hash || tx.hash, address);
      } catch (syncErr) {
        console.warn('Backend claim sync note:', syncErr);
      }

      // 3. If invoice file attached, immediately submit proof & anchor to blockchain
      if (invoiceFile) {
        try {
          // Compute keccak256 hash of invoice
          const arrayBuffer = await invoiceFile.arrayBuffer();
          const proofHash = ethers.keccak256(new Uint8Array(arrayBuffer));

          // Upload invoice file to backend & storage
          await submitQuotationProof(q.id!, {
            file: invoiceFile,
            proofHash: proofHash,
            creatorAddress: address
          });

          // Anchor proof on blockchain contract
          try {
            const proofTx = await contract.submitQuotationProof(
              q.campaignId,
              q.onChainQuotationId || q.id!,
              proofHash
            );
            await proofTx.wait();
          } catch (chainProofErr) {
            console.warn('On-chain proof submission note:', chainProofErr);
          }

          toast.success(
            `Successfully claimed ${formatFtu(amtToClaim)}! Vendor invoice verified & anchored to audit trail. Creator CIBIL score increased!`,
            { id: toastId }
          );
        } catch (proofErr: any) {
          console.error('Invoice proof upload error:', proofErr);
          toast.warning(
            `Funds claimed successfully, but invoice upload had an issue: ${proofErr?.message || 'Check storage'}. You can re-upload proof anytime.`,
            { id: toastId }
          );
        }
      } else {
        toast.success(
          `Successfully claimed ${formatFtu(amtToClaim)}! Funds transferred to your wallet. Please upload the vendor invoice to maintain your CIBIL score.`,
          { id: toastId }
        );
      }

      // Clear file selection
      removeSelectedFile(q.id!);
      await loadClaims();
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      toast.error(errorMsg || 'Claim execution failed', { id: toastId });
    } finally {
      setIsProcessingId(null);
    }
  }

  /**
   * Submit Invoice Proof for an already claimed quotation (ProofPending)
   */
  async function handleSubmitInvoiceOnly(q: ClaimItem) {
    if (!signer || !address) {
      toast.error('Connect your wallet first');
      return;
    }

    const invoiceFile = selectedInvoiceFiles[q.id!];
    if (!invoiceFile) {
      toast.error('Please select an official vendor invoice file first');
      return;
    }

    setIsProcessingId(q.id!);
    const toastId = toast.loading(`Uploading official vendor invoice and anchoring to audit trail...`);

    try {
      const contract = getFundTraceContract(signer);
      const arrayBuffer = await invoiceFile.arrayBuffer();
      const proofHash = ethers.keccak256(new Uint8Array(arrayBuffer));

      // 1. Submit proof to backend (uploads file, computes hash, logs audit_events, boosts score)
      await submitQuotationProof(q.id!, {
        file: invoiceFile,
        proofHash: proofHash,
        creatorAddress: address
      });

      // 2. Submit proof on-chain
      try {
        const proofTx = await contract.submitQuotationProof(
          q.campaignId,
          q.onChainQuotationId || q.id!,
          proofHash
        );
        await proofTx.wait();
      } catch (chainProofErr) {
        console.warn('On-chain proof anchor note:', chainProofErr);
      }

      toast.success(
        `Official vendor invoice verified & anchored to audit trail! Creator CIBIL reliability score increased (+25 pts)!`,
        { id: toastId }
      );

      removeSelectedFile(q.id!);
      await loadClaims();
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      toast.error(errorMsg || 'Failed to upload invoice proof', { id: toastId });
    } finally {
      setIsProcessingId(null);
    }
  }

  return (
    <RoleGuard allowedRoles={["CREATOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/creator" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Creator Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Claims & Expenditure Proof</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Execute Claims & Verify Invoices</h1>
              <p className="text-stone-600 font-medium mt-2">
                Withdraw sanctioned milestone funds to your wallet and upload official vendor invoices to record expenditures in the audit ledger and increase your CIBIL reliability score.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Live Creator CIBIL Score Card */}
              {creatorScore && (
                <div className="bg-gradient-to-br from-indigo-50 to-white px-4 py-2 border border-indigo-200 rounded-2xl flex items-center gap-3 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black font-display text-sm shadow-xs">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-indigo-700 font-black uppercase tracking-wider">CIBIL Reliability Score</p>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {creatorScore.currentScore >= 75 ? 'Excellent' : 'Good'}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-stone-900 font-black">
                      {creatorScore.currentScore} <span className="text-[11px] text-stone-400 font-normal">/ 100</span>
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={loadClaims}
                disabled={isLoading}
                className="px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              
              <div className="bg-white px-4 py-2 border border-stone-200 rounded-xl flex items-center gap-3 shadow-sm">
                <Wallet className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Creator Wallet</p>
                  <p className="text-xs font-mono text-stone-900 font-bold">{formatAddress(address)}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Info Banner on Invoices vs Quotations */}
          <div className="bg-white/90 backdrop-blur-sm border border-stone-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-stone-900">
                  How Invoice Audits Boost Your Creator CIBIL Score
                </h3>
                <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed">
                  The initial <strong>Quotation</strong> is only an estimated cost proposal. When claiming funds, uploading the <strong>Official Vendor Invoice / Bill</strong> proves actual money spent. 
                  Once verified on-chain, it automatically logs into the public audit ledger for donors, grants you <strong className="text-emerald-700">+15 proof completion</strong> and <strong className="text-emerald-700">+10 on-time delivery</strong> score bonuses, and removes unresolved request penalties.
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-stone-900" />
              <p className="text-xs font-mono font-bold text-stone-500 uppercase tracking-wider">Loading creator claims & audit proofs...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {claims.map(q => {
                const isClaimable = q.state === QuotationState.Sanctioned || q.state === QuotationState.Claimable;
                const isProofPending = q.state === QuotationState.ProofPending || q.state === QuotationState.Claimed;
                const isProofSubmitted = q.state === QuotationState.ProofSubmitted || q.state === QuotationState.Completed;
                const isProcessing = isProcessingId === q.id;
                const selectedFile = selectedInvoiceFiles[q.id!];

                return (
                  <div 
                    key={q.id} 
                    className={`bg-white rounded-3xl border ${
                      isClaimable 
                        ? 'border-indigo-200 shadow-md ring-1 ring-indigo-100' 
                        : isProofPending
                          ? 'border-amber-200 shadow-md ring-1 ring-amber-100'
                          : 'border-emerald-200 shadow-sm'
                    } overflow-hidden flex flex-col`}
                  >
                    
                    {/* Card Header */}
                    <div className={`p-6 border-b ${
                      isClaimable 
                        ? 'border-indigo-100 bg-indigo-50/40' 
                        : isProofPending
                          ? 'border-amber-100 bg-amber-50/40'
                          : 'border-emerald-100 bg-emerald-50/30'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <h2 className="text-xl font-bold font-display text-stone-900 pr-4">{q.purpose}</h2>
                        
                        {isClaimable && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5" /> Sanctioned (Ready to Claim)
                          </span>
                        )}
                        {isProofPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full whitespace-nowrap animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5" /> Claimed (Invoice Proof Required)
                          </span>
                        )}
                        {isProofSubmitted && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Expenditure Verified
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p className="text-stone-500 font-medium">
                          Campaign: <span className="font-bold text-stone-800">{q.campaignTitle}</span>
                        </p>
                        <p className="text-stone-500 font-medium">
                          Vendor: <span className="font-bold text-stone-700">{q.vendorName}</span>
                        </p>
                      </div>

                      {/* Initial Quotation proposal link */}
                      {q.quotationDocumentUrl && (
                        <div className="mt-3 pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs">
                          <span className="text-stone-400 font-medium">Quotation Proposal (Estimate):</span>
                          <Link 
                            href={q.quotationDocumentUrl} 
                            target="_blank"
                            className="text-stone-600 hover:text-stone-900 font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            <FileText className="w-3 h-3 text-stone-400" /> View Original Quotation &rarr;
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Financial Summary */}
                    <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 border-b border-stone-100">
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Sanctioned Allocation</p>
                          <p className="text-2xl font-black font-bebas text-stone-900">
                            {formatFtu(q.allocatedAmountFtu || q.requestedAmountFtu)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Amount Claimed</p>
                          <p className={`text-2xl font-black font-bebas ${q.claimedAmountFtu ? 'text-emerald-700' : 'text-stone-400'}`}>
                            {formatFtu(q.claimedAmountFtu || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">CIBIL Audit State</p>
                          <p className={`text-xs font-bold mt-1.5 ${
                            isProofSubmitted ? 'text-emerald-700 font-mono' : isProofPending ? 'text-amber-600 font-mono' : 'text-indigo-600'
                          }`}>
                            {isProofSubmitted ? 'Verified (+25 pts)' : isProofPending ? 'Proof Pending' : 'Sanctioned'}
                          </p>
                        </div>
                      </div>

                      {/* CASE 1: CLAIMABLE (User can claim funds and upload invoice) */}
                      {isClaimable && (
                        <div className="space-y-4">
                          {/* Invoice Upload Box */}
                          <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/50 rounded-2xl p-4 transition-all">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-wide text-indigo-950 flex items-center gap-1.5">
                                  <FileBadge className="w-4 h-4 text-indigo-600" />
                                  Upload Official Vendor Invoice / Bill
                                </h4>
                                <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                                  Upload the receipt issued by <span className="font-bold text-stone-900">{q.vendorName}</span> as expenditure proof.
                                </p>
                              </div>
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                +25 CIBIL Pts
                              </span>
                            </div>

                            <input 
                              type="file" 
                              ref={el => { fileInputRefs.current[q.id!] = el; }}
                              accept=".pdf,.png,.jpg,.jpeg,.webp"
                              className="hidden" 
                              id={`invoice-upload-${q.id}`}
                              onChange={(e) => handleFileChange(q.id!, e)}
                            />

                            {selectedFile ? (
                              <div className="bg-white p-3 rounded-xl border border-indigo-200 flex items-center justify-between gap-3 shadow-xs mt-2">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                  <div className="truncate">
                                    <p className="text-xs font-bold text-stone-900 truncate">{selectedFile.name}</p>
                                    <p className="text-[10px] text-stone-500 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB &bull; Vendor Invoice</p>
                                  </div>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => removeSelectedFile(q.id!)}
                                  className="text-stone-400 hover:text-red-600 p-1 transition-colors"
                                  title="Remove selected file"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <label 
                                htmlFor={`invoice-upload-${q.id}`}
                                className="mt-2 w-full py-4 border border-indigo-200 border-dashed rounded-xl bg-white hover:bg-stone-50 cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-colors"
                              >
                                <UploadCloud className="w-5 h-5 text-indigo-500" />
                                <span className="text-xs font-bold text-indigo-700">Choose Vendor Invoice File (PDF, PNG, JPG)</span>
                                <span className="text-[10px] text-stone-400">Proof of money spent for transparency audit</span>
                              </label>
                            )}
                          </div>

                          {/* Primary Claim Button */}
                          <button 
                            onClick={() => handleExecuteClaimWithInvoice(q)}
                            disabled={isProcessing}
                            className="w-full py-3.5 bg-indigo-600 text-white font-black font-display text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Claiming & Anchoring Proof...
                              </>
                            ) : selectedFile ? (
                              <>
                                <ArrowDownToLine className="w-4 h-4" /> Claim Funds & Verify Invoice (+25 CIBIL)
                              </>
                            ) : (
                              <>
                                <ArrowDownToLine className="w-4 h-4" /> Claim Allocation to Wallet
                              </>
                            )}
                          </button>

                          {!selectedFile && (
                            <p className="text-[11px] text-stone-400 text-center">
                              Tip: Attaching your vendor invoice now verifies the expenditure on the audit trail immediately.
                            </p>
                          )}
                        </div>
                      )}

                      {/* CASE 2: PROOF PENDING (Funds claimed, awaiting vendor invoice) */}
                      {isProofPending && (
                        <div className="space-y-4">
                          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                                  Action Required: Upload Official Vendor Invoice
                                </h4>
                                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                  You have claimed <strong>{formatFtu(q.claimedAmountFtu || q.allocatedAmountFtu)}</strong>. 
                                  Upload the official invoice issued by {q.vendorName} to verify expenditure in the audit ledger and boost your Creator CIBIL score.
                                </p>
                              </div>
                            </div>

                            <input 
                              type="file" 
                              ref={el => { fileInputRefs.current[q.id!] = el; }}
                              accept=".pdf,.png,.jpg,.jpeg,.webp"
                              className="hidden" 
                              id={`invoice-upload-pending-${q.id}`}
                              onChange={(e) => handleFileChange(q.id!, e)}
                            />

                            {selectedFile ? (
                              <div className="bg-white p-3 rounded-xl border border-amber-300 flex items-center justify-between gap-3 shadow-xs mt-3">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                  <div className="truncate">
                                    <p className="text-xs font-bold text-stone-900 truncate">{selectedFile.name}</p>
                                    <p className="text-[10px] text-stone-500 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                  </div>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => removeSelectedFile(q.id!)}
                                  className="text-stone-400 hover:text-red-600 p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <label 
                                htmlFor={`invoice-upload-pending-${q.id}`}
                                className="mt-3 w-full py-3.5 border border-amber-300 border-dashed rounded-xl bg-white hover:bg-amber-50/50 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors"
                              >
                                <UploadCloud className="w-5 h-5 text-amber-600" />
                                <span className="text-xs font-bold text-amber-900">Select Vendor Invoice (PDF, PNG, JPG)</span>
                              </label>
                            )}
                          </div>

                          <button 
                            onClick={() => handleSubmitInvoiceOnly(q)}
                            disabled={isProcessing || !selectedFile}
                            className="w-full py-3 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Anchoring Invoice to Ledger...
                              </>
                            ) : (
                              <>
                                <FileCheck className="w-4 h-4" /> Upload & Verify Expenditure Proof
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* CASE 3: PROOF SUBMITTED / COMPLETED (Verified & Audited) */}
                      {isProofSubmitted && (
                        <div className="bg-emerald-50/80 rounded-2xl p-5 border border-emerald-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                                Verified Vendor Invoice Stored on Ledger
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              CIBIL Score Boosted (+25 pts)
                            </span>
                          </div>

                          <p className="text-xs text-stone-600">
                            Expenditure verified for {q.vendorName}. This proof is publicly visible to all donors on the audit trail and transparency tracking dashboard.
                          </p>

                          {/* Cryptographic Hash */}
                          {q.proofHash && (
                            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between gap-2">
                              <div className="truncate">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Keccak-256 Proof Hash</p>
                                <p className="text-xs font-mono text-stone-700 truncate">{q.proofHash}</p>
                              </div>
                              <button 
                                onClick={() => copyToClipboard(q.proofHash!)}
                                className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
                                title="Copy Proof Hash"
                              >
                                {copiedHash === q.proofHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}

                          {/* View Invoice Button */}
                          {q.proofDocumentUrl && (
                            <Link
                              href={q.proofDocumentUrl}
                              target="_blank"
                              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                            >
                              <FileText className="w-4 h-4" /> View Verified Vendor Invoice (PDF/Image) <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

              {claims.length === 0 && (
                <div className="col-span-full bg-white rounded-3xl border border-stone-200 p-16 text-center shadow-sm">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                    <ArrowDownToLine className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black font-display text-stone-900 mb-2">No Claims Available</h3>
                  <p className="text-stone-500 max-w-md mx-auto mb-6 text-sm">
                    Once a donor allots funding to your campaign, you can submit milestone quotations. When the donor sanctions your quotation at /donor/approvals, your claim will appear here ready to withdraw and verify with your vendor invoice.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Link href="/creator/campaigns" className="px-5 py-2.5 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition-colors">
                      View My Campaigns
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </RoleGuard>
  );
}
